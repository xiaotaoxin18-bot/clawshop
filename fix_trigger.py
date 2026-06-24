#!/usr/bin/env python3
"""Fix the triggerScrape command in douyin.service.js"""

with open('/home/ubuntu/clawshop/backend/dist/server/modules/douyin/douyin.service.js', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'python cli.py' in line and 'daily-push' in line:
        print(f'Found bad line {i+1}: {line.rstrip()}')
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + 'let cmd = `cd "${scraperDir}" && bash run-collect.sh daily-push --api-url ${apiUrl}`;\n'
        break

with open('/home/ubuntu/clawshop/backend/dist/server/modules/douyin/douyin.service.js', 'w') as f:
    f.writelines(lines)

# Verify
for i, line in enumerate(lines):
    if 'cmd =' in line and ('daily-push' in line or 'run-collect' in line):
        print(f'Line {i+1}: {line.rstrip()}')

print('Done')
