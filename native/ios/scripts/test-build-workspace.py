"""Exercise local and Xcode Cloud build-workspace routing in isolated fixtures."""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile

scripts = Path(__file__).parent
helper = scripts / "check-build-workspace.sh"

with tempfile.TemporaryDirectory(prefix="fylogia-cloud-workspace-test-") as temporary:
    workspace = Path(temporary) / "workspace"
    repository = workspace / "repository"
    project = repository / "native/ios/Fylogia.xcodeproj"
    target_scripts = repository / "native/ios/scripts"
    project.mkdir(parents=True)
    target_scripts.mkdir(parents=True)
    shutil.copy2(helper, target_scripts / helper.name)
    shutil.copy2(scripts / "check-development-volume.sh", target_scripts)

    cloud_env = {
        **os.environ,
        "CI": "TRUE",
        "CI_XCODE_CLOUD": "TRUE",
        "CI_PRIMARY_REPOSITORY_PATH": str(repository),
        "CI_WORKSPACE_PATH": str(workspace),
        "CI_PROJECT_FILE_PATH": str(project),
        "CI_XCODE_PROJECT": "Fylogia.xcodeproj",
        "CI_XCODEBUILD_ACTION": "build",
    }
    command = ["sh", str(target_scripts / helper.name)]
    verified = subprocess.run(
        command, env=cloud_env, text=True, capture_output=True
    )
    assert verified.returncode == 0, verified.stderr
    assert "Verified Xcode Cloud checkout" in verified.stdout

    fake_env = {"PATH": os.environ["PATH"], "CI_XCODE_CLOUD": "TRUE"}
    fake = subprocess.run(
        command, env=fake_env, text=True, capture_output=True
    )
    assert fake.returncode != 0, "incomplete/fake Cloud environment unexpectedly passed"
    assert "CI" in fake.stderr or "primary repository path" in fake.stderr

    mismatch_env = {**cloud_env, "CI_PRIMARY_REPOSITORY_PATH": str(workspace)}
    mismatch = subprocess.run(
        command, env=mismatch_env, text=True, capture_output=True
    )
    assert mismatch.returncode != 0, "mismatched Cloud checkout unexpectedly passed"
    assert "does not match" in mismatch.stderr

    project_env = {
        **cloud_env,
        "CI_PROJECT_FILE_PATH": str(repository / "native/ios/Other.xcodeproj"),
    }
    invalid_project = subprocess.run(
        command, env=project_env, text=True, capture_output=True
    )
    assert invalid_project.returncode != 0, "mismatched Cloud project unexpectedly passed"
    assert "project path is unavailable" in invalid_project.stderr

print("PASS verified Xcode Cloud checkout ALLOWED; incomplete/fake and mismatched Cloud environments BLOCKED")
