#!/usr/bin/env python3
"""Fix douyin.service.ts encoding by merging correct Chinese with structural changes."""
import sys

SERVER_PATH = "/home/ubuntu/clawshop/backend/server/modules/douyin/douyin.service.ts"

# Read old correct file from server
with open(SERVER_PATH, "r", encoding="utf-8") as f:
    old = f.read()

print(f"Read old file: {old.count(chr(10)) + 1} lines")

# ===== Edit 1: Fix import =====
old = old.replace(
    "import { exec } from 'child_process';",
    "import { spawn } from 'child_process';"
)

# ===== Edit 2: Add scrapeRunning fields =====
old = old.replace(
    "  private readonly logger = new Logger(DouyinService.name);",
    "  private readonly logger = new Logger(DouyinService.name);\n"
    "  private scrapeRunning = false;\n"
    "  private scrapeRunningLabel: string | null = null;"
)

# ===== Edit 3: Replace triggerScrade through getLoginStatus with new methods =====
# New block containing all the new methods
new_block = '''  private resolveScraperDir(): string {
    const candidates = [
      process.env.SCRAPER_DIR,
      join(process.cwd(), 'scraper'),
      join(process.cwd(), '..', 'scraper'),
      join(__dirname, '..', '..', '..', '..', '..', 'scraper'),
      join(__dirname, '..', '..', '..', '..', 'scraper'),
    ].filter((v): v is string => Boolean(v));

    for (const candidate of candidates) {
      if (fs.existsSync(join(candidate, 'cli.py'))) {
        return candidate;
      }
    }

    throw new Error('未找到 scraper 目录');
  }

  private resolvePythonBinary(): string {
    return process.env.SCRAPER_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  }

  private resolveApiUrl(): string {
    return (
      process.env.DOUYIN_API_URL ||
      process.env.API_URL ||
      `http://127.0.0.1:${process.env.SERVER_PORT || '3000'}`
    );
  }

  private buildDailyPushArgs(shopId?: string): string[] {
    const args = ['cli.py', 'daily-push', '--api-url', this.resolveApiUrl(), '--headless'];
    if (shopId) {
      args.push('--shop-id', shopId);
    }
    return args;
  }

  private buildLoginArgs(shopId?: string): string[] {
    const args = ['cli.py', 'login', '--headless'];
    if (shopId) {
      args.push('--shop-id', shopId);
    }
    return args;
  }

  private async runScraperCommand(
    label: string,
    args: string[],
    waitForExit: boolean,
  ): Promise<{ pid?: number; code?: number | null }> {
    if (this.scrapeRunning) {
      throw new Error(`采集任务正在运行${this.scrapeRunningLabel ? ': ' + this.scrapeRunningLabel : ''}`);
    }

    const scraperDir = this.resolveScraperDir();
    let python = this.resolvePythonBinary();
    // 优先使用虚拟环境的 Python（服务器部署时通过 venv 安装依赖）
    const venvPythons = [
      join(scraperDir, 'venv', 'bin', 'python3'),
      join(scraperDir, 'venv', 'bin', 'python'),
    ];
    for (const vp of venvPythons) {
      if (fs.existsSync(vp)) { python = vp; break; }
    }
    const shopIndex = args.indexOf('--shop-id');
    const shopId = shopIndex >= 0 ? args[shopIndex + 1] : undefined;
    const jobLabel = shopId ? `${label}:${shopId}` : label;

    this.scrapeRunning = true;
    this.scrapeRunningLabel = jobLabel;
    this.logger.log(`启动采集任务[${jobLabel}]: ${python} ${args.join(' ')}`);

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(python, args, {
        cwd: scraperDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
        windowsHide: process.platform === 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      this.scrapeRunning = false;
      this.scrapeRunningLabel = null;
      throw error;
    }

    const SCRAPE_TIMEOUT = 10 * 60 * 1000;
    let timeoutHandle: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutHandle) { clearTimeout(timeoutHandle); timeoutHandle = null; }
      this.scrapeRunning = false;
      this.scrapeRunningLabel = null;
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) this.logger.log(`[${jobLabel}] ${text}`);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) this.logger.warn(`[${jobLabel}] ${text}`);
    });

    if (!waitForExit) {
      child.on('close', (code: number | null) => {
        this.logger.log(`采集器退出[${jobLabel}]: code=${code}`);
        cleanup();
      });
      child.on('error', (err: Error) => {
        this.logger.error(`采集器启动失败[${jobLabel}]: ${err.message}`);
        cleanup();
      });
      return { pid: child.pid ?? undefined };
    }

    return await new Promise((resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        this.logger.warn(`采集任务超时[${jobLabel}]，正在终止`);
        child.kill('SIGTERM');
        setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 2000);
      }, SCRAPE_TIMEOUT);

      child.on('close', (code: number | null) => {
        this.logger.log(`采集器退出[${jobLabel}]: code=${code}`);
        cleanup();
        resolve({ pid: child.pid ?? undefined, code });
      });
      child.on('error', (err: Error) => {
        this.logger.error(`采集器启动失败[${jobLabel}]: ${err.message}`);
        cleanup();
        reject(err);
      });
    });
  }

  async triggerScrape(data: TriggerScrapeRequest): Promise<TriggerScrapeResponse> {
    try {
      const shopId = data.shop_id?.trim() || undefined;
      const result = await this.runScraperCommand(
        'manual',
        this.buildDailyPushArgs(shopId),
        false,
      );

      return {
        success: true,
        message: shopId ? `店铺 ${shopId} 采集任务已启动` : '采集任务已启动',
        task_id: result.pid?.toString(),
      };
    } catch (error: any) {
      this.logger.error(`触发采集失败: ${error.message}`);
      return { success: false, message: `触发采集失败: ${error.message}` };
    }
  }

  async triggerDailyPush(shopId?: string): Promise<void> {
    await this.runScraperCommand('cron', this.buildDailyPushArgs(shopId), true);
  }

  async triggerLogin(shopId?: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.runScraperCommand('login', this.buildLoginArgs(shopId), false);
      return { success: true, message: '登录流程已启动，请稍后查看二维码' };
    } catch (error: any) {
      this.logger.error(`触发登录失败: ${error.message}`);
      return { success: false, message: `触发登录失败: ${error.message}` };
    }
  }

  async uploadCookie(cookies: any[], shopId?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!Array.isArray(cookies) || cookies.length === 0) {
        return { success: false, message: 'Cookie 不能为空' };
      }

      const scraperDir = this.resolveScraperDir();
      const cookiePath = join(scraperDir, shopId ? `cookies_${shopId}.json` : 'cookies.json');
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');

      return {
        success: true,
        message: shopId ? `Cookie 已保存到店铺 ${shopId}` : 'Cookie 已保存',
      };
    } catch (error: any) {
      this.logger.error(`保存 Cookie 失败: ${error.message}`);
      return { success: false, message: `保存 Cookie 失败: ${error.message}` };
    }
  }

  async getLoginQRCode(): Promise<string | null> {
    const qrPath = '/tmp/douyin_login_qr.png';
    try {
      if (!fs.existsSync(qrPath)) return null;
      const data = fs.readFileSync(qrPath);
      return `data:image/png;base64,${data.toString('base64')}`;
    } catch {
      return null;
    }
  }

  async getLoginStatus(): Promise<{ status: string; qr?: string }> {
    const readyFlag = '/tmp/douyin_login_ready';
    const doneFlag = '/tmp/douyin_login_done';

    if (fs.existsSync(doneFlag)) {
      try { fs.unlinkSync(doneFlag); } catch {}
      return { status: 'done' };
    }
    if (fs.existsSync(readyFlag)) {
      const qr = await this.getLoginQRCode();
      return { status: 'ready', qr: qr || undefined };
    }
    if (fs.existsSync('/tmp/douyin_login_qr.png')) {
      return { status: 'waiting_qr' };
    }
    return { status: 'idle' };
  }
'''

# Find old block to replace: from "手动触发采集" to end of getLoginStatus
start_marker = "  /**\n   * 手动触发采集"
if start_marker not in old:
    print("ERROR: Could not find start marker '手动触发采集'")
    print("Searching for partial match...")
    # Try with garbled text
    for haystack_start in range(len(old) - 200, len(old)):
        pass
    sys.exit(1)

end_marker = "  async getLoginStatus(): Promise<{ status: string; qr?: string }> {"
if end_marker not in old:
    print("ERROR: Could not find end marker 'getLoginStatus'")
    sys.exit(1)

start_idx = old.find(start_marker)

# Find the end of getLoginStatus method (the closing brace before the class close)
end_search_start = old.rfind(end_marker)
if end_search_start < 0:
    print("ERROR: Could not find end of getLoginStatus")
    sys.exit(1)

# The getLoginStatus method ends with "  }" (closing brace), then class closes with "}"
# Find the closing brace of getLoginStatus
remaining = old[end_search_start:]
# Find the closing brace of getLoginStatus (third "}" - one for if, one for method)
closing_brace = -1
brace_count = 0
for i, c in enumerate(remaining):
    if c == '{':
        brace_count += 1
    elif c == '}':
        brace_count -= 1
        if brace_count == 1:  # Back to class level means we found method's closing brace
            closing_brace = i + 1  # include the "}"
            break

if closing_brace < 0:
    print("ERROR: Could not find closing brace of getLoginStatus")
    sys.exit(1)

old_end = end_search_start + closing_brace
old_block = old[start_idx:old_end]
print(f"Old block: {start_idx}-{old_end} ({old_block.count(chr(10))} lines)")

# Replace old block with new block
new_content = old[:start_idx] + new_block + old[old_end:]

# Verify
print(f"New file lines: {new_content.count(chr(10)) + 1}")
print(f"Has spawn: {'spawn' in new_content and 'exec' not in new_content}")
print(f"Has scrapeRunning: {'scrapeRunning' in new_content}")
print(f"Has runScraperCommand: {'runScraperCommand' in new_content}")
print(f"Has triggerDailyPush: {'triggerDailyPush' in new_content}")
print(f"Has uploadCookie: {'uploadCookie' in new_content}")
print(f"Export preserved: {'export { DouyinConfigService }' in new_content}")

# Write result
with open(SERVER_PATH, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Written successfully!")
