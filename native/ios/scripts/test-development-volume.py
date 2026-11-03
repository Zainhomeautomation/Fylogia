"""Exercise the real preflight guard without unplugging a drive or filling storage."""
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import sys
import plistlib
script = Path(__file__).with_name('check-development-volume.sh')
source = script.read_text().split("<<'PY'\n", 1)[1].rsplit('\nPY', 1)[0]
def rejected(mounted, free, message, uuid='FF304D23-E76A-4AE0-8F0C-2070EFF20E87', ownership=True):
    info=plistlib.dumps(dict(VolumeUUID=uuid, FilesystemType='apfs', GlobalPermissionsEnabled=ownership))
    with patch('sys.argv', [str(script), str(script)]), patch('os.path.ismount', return_value=mounted), patch('os.access', return_value=True), patch('subprocess.check_output', return_value=info), patch('os.statvfs', return_value=SimpleNamespace(f_bavail=free, f_frsize=1)):
        try:
            exec(compile(source, str(script), 'exec'), {})
        except SystemExit as error:
            assert message in str(error), error
        else:
            raise AssertionError('Guard did not reject unsafe conditions')
rejected(False, 20_000_000_000, 'not mounted')
rejected(True, 1_000_000_000, 'less than 10 GB')
rejected(True, 20_000_000_000, 'unexpected development volume UUID', uuid='WRONG')
rejected(True, 20_000_000_000, 'enabled ownership', ownership=False)
print('PASS simulated missing volume, wrong UUID, disabled ownership and insufficient storage; no files or mounts modified')
