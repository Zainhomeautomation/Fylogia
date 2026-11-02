#!/bin/sh
set -eu
python3 - <<'PY'
import os,sys
s=os.statvfs(os.path.expanduser('~'));free=s.f_bavail*s.f_frsize
print(f'Free internal storage: {free/1e9:.2f} GB')
if free<10_000_000_000:sys.exit('STOP: below the owner-approved 10 GB minimum; no build or simulator launch permitted.')
PY
