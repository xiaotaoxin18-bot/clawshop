#!/usr/bin/env python3
"""Add loginChild tracking to runScraperCommand."""
PATH = "/home/ubuntu/clawshop/backend/server/modules/douyin/douyin.service.ts"

with open(PATH, "r", encoding="utf-8") as f:
    code = f.read()

old = "      child = spawn(python, args, {\n        cwd: scraperDir,\n        env: {\n          ...process.env,\n          PYTHONUNBUFFERED: '1',\n        },\n        windowsHide: process.platform === 'win32',\n        stdio: ['ignore', 'pipe', 'pipe'],\n      });\n    } catch (error) {\n      this.scrapeRunning = false;"

new = "      child = spawn(python, args, {\n        cwd: scraperDir,\n        env: {\n          ...process.env,\n          PYTHONUNBUFFERED: '1',\n        },\n        windowsHide: process.platform === 'win32',\n        stdio: ['ignore', 'pipe', 'pipe'],\n      });\n      if (label === 'login') this.loginChild = child;\n    } catch (error) {\n      this.scrapeRunning = false;"

if old in code:
    code = code.replace(old, new)
    with open(PATH, "w", encoding="utf-8") as f:
        f.write(code)
    print("OK - loginChild tracking added")
else:
    print("NOT FOUND")
    idx = code.find("child = spawn(python, args")
    if idx >= 0:
        end = code.find(";\n    } catch (error)", idx)
        if end > 0:
            print("Block found:\n" + code[idx:end+60])
