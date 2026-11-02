#!/bin/sh
set -eu
python3 - "$0" <<'PY'
import os,sys,pathlib
script=pathlib.Path(sys.argv[1]).resolve()
parts=script.parts
if len(parts)>2 and parts[1]=='Volumes':
    volume=pathlib.Path('/Volumes')/parts[2]
    if not os.path.ismount(volume):
        sys.exit('STOP: development volume is not mounted; do not create a replacement directory internally.')
    if not os.access(volume,os.R_OK|os.W_OK):
        sys.exit('STOP: development volume is not readable and writable.')
internal=os.statvfs(pathlib.Path.home())
free=internal.f_bavail*internal.f_frsize
if free<10_000_000_000:
    sys.exit('STOP: less than 10 GB free internal storage.')
print(f'Development volume available; internal free space {free/1e9:.2f} GB')
PY
