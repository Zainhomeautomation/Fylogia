#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
ios_root=$(CDPATH= cd -- "$script_dir/.." && pwd -P)
repository_root=$(CDPATH= cd -- "$ios_root/../.." && pwd -P)

if [ "${CI_XCODE_CLOUD:-}" = "TRUE" ]; then
  # Xcode Cloud's marker alone is insufficient: verify that its documented
  # checkout, workspace and selected project all resolve to this checkout.
  : "${CI:?Xcode Cloud CI marker is required}"
  [ "$CI" = "TRUE" ] || { echo "STOP: inconsistent Xcode Cloud CI marker." >&2; exit 1; }
  : "${CI_PRIMARY_REPOSITORY_PATH:?Xcode Cloud primary repository path is required}"
  : "${CI_WORKSPACE_PATH:?Xcode Cloud workspace path is required}"
  : "${CI_PROJECT_FILE_PATH:?Xcode Cloud project path is required}"
  [ "${CI_XCODE_PROJECT:-}" = "Fylogia.xcodeproj" ] || {
    echo "STOP: unexpected Xcode Cloud project name." >&2
    exit 1
  }
  case "${CI_XCODEBUILD_ACTION:-}" in
    build|build-for-testing|test-without-building|analyze) ;;
    *) echo "STOP: unexpected or missing Xcode Cloud build action." >&2; exit 1 ;;
  esac

  cloud_repository=$(CDPATH= cd -- "$CI_PRIMARY_REPOSITORY_PATH" 2>/dev/null && pwd -P) || {
    echo "STOP: Xcode Cloud primary repository path is unavailable." >&2
    exit 1
  }
  cloud_workspace=$(CDPATH= cd -- "$CI_WORKSPACE_PATH" 2>/dev/null && pwd -P) || {
    echo "STOP: Xcode Cloud workspace path is unavailable." >&2
    exit 1
  }
  cloud_project=$(CDPATH= cd -- "$CI_PROJECT_FILE_PATH" 2>/dev/null && pwd -P) || {
    echo "STOP: Xcode Cloud project path is unavailable." >&2
    exit 1
  }
  [ "$cloud_repository" = "$repository_root" ] || {
    echo "STOP: Xcode Cloud repository does not match the build script checkout." >&2
    exit 1
  }
  [ "$cloud_repository" != "$cloud_workspace" ] || {
    echo "STOP: Xcode Cloud repository must be inside its workspace." >&2
    exit 1
  }
  case "$cloud_repository/" in
    "$cloud_workspace"/*) ;;
    *) echo "STOP: Xcode Cloud repository is outside its workspace." >&2; exit 1 ;;
  esac
  [ "$cloud_project" = "$repository_root/native/ios/Fylogia.xcodeproj" ] || {
    echo "STOP: Xcode Cloud project path does not match Fylogia.xcodeproj in this checkout." >&2
    exit 1
  }

  echo "Verified Xcode Cloud checkout; WebAssets may be generated inside this workspace."
  exit 0
fi

# Local builds retain the existing Developments SSD UUID, mount, permissions,
# and internal-storage checks. Never synthesize a missing local volume.
exec sh "$script_dir/check-development-volume.sh"
