' clawshop 一键启动脚本（静默模式）
' 开机自启时由 Task Scheduler 调用

Set WshShell = CreateObject("WScript.Shell")

' 切换到项目目录
WshShell.CurrentDirectory = "D:\clawshop"

' 1. 启动 PostgreSQL
WshShell.Run "cmd /c D:\clawshop\scripts\start-db.bat", 0, False

' 稍等数据库启动
WScript.Sleep 5000

' 2. 启动后端（生产模式，serve 前端+API）
WshShell.Run "cmd /c D:\clawshop\scripts\start-backend.bat", 0, False

' 稍等后端启动
WScript.Sleep 8000

' 3. 启动 ngrok 隧道（指向后端 3000 端口）
WshShell.Run "cmd /c D:\clawshop\scripts\start-ngrok.bat", 0, False
