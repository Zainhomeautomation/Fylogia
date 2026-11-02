"""Exercise the real preflight guard without unplugging a drive or filling storage."""
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import sys
script = Path(__file__).with_name('check-development-volume.sh')
source = script.read_text().split("<<'PY'\n", 1)[1].rsplit('\nPY', 1)[0]
def rejected(mounted, free, message):
    with patch('sys.argv', [str(script), str(script)]), patch('os.path.ismount', return_value=mounted), patch('os.statvfs', return_value=SimpleNamespace(f_bavail=free, f_frsize=1)):
        try:
            exec(compile(source, str(script), 'exec'), {})
        except SystemExit as error:
            assert message in str(error), error
        else:
            raise AssertionError('Guard did not reject unsafe conditions')
rejected(False, 20_000_000_000, 'not mounted')
rejected(True, 1_000_000_000, 'less than 10 GB')
print('PASS simulated missing volume and insufficient storage; no files or mounts modified')
