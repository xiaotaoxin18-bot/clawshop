#!/usr/bin/env python3
import re

with open('/home/ubuntu/clawshop/backend/dist/server/modules/douyin/douyin.service.js', 'r') as f:
    lines = f.readlines()

# Line 581 is currently "        let cmd = ;" (index 580 in 0-indexed)
for i, line in enumerate(lines):
    if line.strip() == 'let cmd = ;' and i == 580:
        indent = line[:len(line) - len(line.lstrip())]
        # The scraperDir var already ends with '/scraper'
        lines[i] = indent + 'let cmd = `cd "${scraperDir}" && bash run-collect.sh daily-push --api-url ${apiUrl}`;\n'
        print(f'Fixed line {i+1}')
        break

with open('/home/ubuntu/clawshop/backend/dist/server/modules/douyin/douyin.service.js', 'w') as f:
    f.writelines(lines)

# Verify
for i, line in enumerate(lines):
    if 'let cmd = `cd' in line:
        print(f'Line {i+1}: {line.rstrip()}')

print('OK')
