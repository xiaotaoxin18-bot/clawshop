#!/usr/bin/env python3
"""Fix cli.py encoding corruption by merging correct Chinese from git HEAD with structural changes."""
import sys

# Read correct old version
with open('/tmp/cli_correct.py', 'r', encoding='utf-8') as f:
    old = f.read()

# --- Change 1: _get_channel ---
old = old.replace(
    "def _get_channel(flags):\n"
    "    if flags.get(\"chrome\"):\n"
    "        return \"chrome\"\n"
    "    if flags.get(\"edge\"):\n"
    "        return \"msedge\"\n"
    "    return os.environ.get(\"BROWSER_CHANNEL\") or \"msedge\"",
    "def _get_channel(flags):\n"
    "    if flags.get(\"chrome\"):\n"
    "        return \"chrome\"\n"
    "    if flags.get(\"edge\"):\n"
    "        return \"msedge\"\n"
    "    env_channel = (os.environ.get(\"BROWSER_CHANNEL\") or \"\").strip().lower()\n"
    "    if env_channel in {\"\", \"default\", \"playwright\", \"chromium\", \"none\"}:\n"
    "        return \"msedge\" if os.name == \"nt\" else None\n"
    "    if env_channel == \"edge\":\n"
    "        return \"msedge\"\n"
    "    return env_channel"
)

# --- Change 2 & 3: Add _browser_args + update _run_browser ---
old_get_channel_new = old  # after change 1

old_run_browser = (
    "def _run_browser(flags, callback):\n"
    '    """启动带 profile 的浏览器执行操作，完成后保持打开"""\n'
    "    from playwright.sync_api import sync_playwright\n"
    "\n"
    "    channel = _get_channel(flags)\n"
    "    pw = sync_playwright().start()\n"
    "    os.makedirs(PROFILE_DIR, exist_ok=True)\n"
    "\n"
    "    shop_id = flags.get(\"shop_id\")\n"
    "    context = pw.chromium.launch_persistent_context(\n"
    "        PROFILE_DIR,\n"
    "        channel=channel,\n"
    '        headless=flags.get("headless", False),\n'
    '        viewport={"width": 1280, "height": 800},\n'
    '        args=["--no-proxy-server"],\n'
    "    )\n"
    '    _load_cookies(context, shop_id=shop_id)\n'
    "    page = context.pages[0] if context.pages else context.new_page()\n"
    "    page.bring_to_front()\n"
    "    return callback(page, context, pw)"
)

new_run_browser = (
    "def _browser_args():\n"
    '    args = ["--no-proxy-server"]\n'
    "    if hasattr(os, \"geteuid\") and os.geteuid() == 0:\n"
    '        args.append("--no-sandbox")\n'
    "    return args\n"
    "\n"
    "\n"
    "def _run_browser(flags, callback):\n"
    '    """启动带 profile 的浏览器执行操作，完成后保持打开"""\n'
    "    from playwright.sync_api import sync_playwright\n"
    "\n"
    "    channel = _get_channel(flags)\n"
    "    pw = sync_playwright().start()\n"
    "    os.makedirs(PROFILE_DIR, exist_ok=True)\n"
    "\n"
    "    shop_id = flags.get(\"shop_id\")\n"
    "    launch_kwargs = {\n"
    '        "headless": flags.get("headless", False),\n'
    '        "viewport": {"width": 1280, "height": 800},\n'
    '        "args": _browser_args(),\n'
    "    }\n"
    "    if channel:\n"
    '        launch_kwargs["channel"] = channel\n'
    "    context = pw.chromium.launch_persistent_context(PROFILE_DIR, **launch_kwargs)\n"
    '    _load_cookies(context, shop_id=shop_id)\n'
    "    page = context.pages[0] if context.pages else context.new_page()\n"
    "    page.bring_to_front()\n"
    "    return callback(page, context, pw)"
)

old = old.replace(old_run_browser, new_run_browser)

# --- Change 4: cmd_login_qr launch section ---
old_login_start = (
    "        ctx = pw.chromium.launch_persistent_context(\n"
    "            tmp_dir,\n"
    '            channel="chrome",\n'
    '            headless=flags.get("headless", True),\n'
    '            viewport={"width": 1280, "height": 800},\n'
    '            args=["--no-sandbox", "--no-proxy-server"],\n'
    "        )\n"
    "        page = ctx.pages[0] if ctx.pages else ctx.new_page()"
)

new_login_start = (
    "        channel = _get_channel(flags)\n"
    "        launch_kwargs = {\n"
    '            "headless": flags.get("headless", True),\n'
    '            "viewport": {"width": 1280, "height": 800},\n'
    '            "args": _browser_args(),\n'
    "        }\n"
    "        if channel:\n"
    '            launch_kwargs["channel"] = channel\n'
    "        ctx = pw.chromium.launch_persistent_context(tmp_dir, **launch_kwargs)\n"
    "        page = ctx.pages[0] if ctx.pages else ctx.new_page()"
)

old = old.replace(old_login_start, new_login_start)

# Write result
with open('/tmp/cli_fixed.py', 'w', encoding='utf-8') as f:
    f.write(old)

print(f"Done: {len(old.splitlines())} lines")
print(f"Has _browser_args: {'_browser_args' in old}")
print(f"Has env_channel: {'env_channel' in old}")
print(f"Has launch_kwargs: {'launch_kwargs' in old}")
