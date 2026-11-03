#!/bin/sh
set -eu
python3 - "$0" <<'PY'
import os,sys,pathlib,plistlib,subprocess
script=pathlib.Path(sys.argv[1]).resolve()
parts=script.parts
if len(parts)>2 and parts[1]=='Volumes':
    volume=pathlib.Path('/Volumes')/parts[2]
    if not os.path.ismount(volume):
        sys.exit('STOP: development volume is not mounted; do not create a replacement directory internally.')
    if not os.access(volume,os.R_OK|os.W_OK):
        sys.exit('STOP: development volume is not readable and writable.')
    if volume.name=='Developments':
        info=plistlib.loads(subprocess.check_output(['diskutil','info','-plist',str(volume)]))
        if info.get('VolumeUUID')!='FF304D23-E76A-4AE0-8F0C-2070EFF20E87':
            sys.exit('STOP: unexpected development volume UUID.')
        if info.get('FilesystemType')!='apfs' or not info.get('GlobalPermissionsEnabled'):
            sys.exit('STOP: development volume requires APFS and enabled ownership.')
internal=os.statvfs(pathlib.Path.home())
free=internal.f_bavail*internal.f_frsize
if free<10_000_000_000:
    sys.exit('STOP: less than 10 GB free internal storage.')
print(f'Development volume available; internal free space {free/1e9:.2f} GB')
PY
