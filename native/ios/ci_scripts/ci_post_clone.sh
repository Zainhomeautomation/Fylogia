#!/bin/sh
set -eu

repository_path=${CI_PRIMARY_REPOSITORY_PATH:-}
generator="${repository_path}/native/ios/scripts/generate-native-web-assets.sh"
if [ -z "$repository_path" ] || [ ! -x "$generator" ]; then
  echo "Fylogia's native WebAssets generator is missing from the Cloud checkout." >&2
  exit 1
fi

echo "Fylogia post-clone hook discovered. WebAssets will be generated inside xcodebuild so resource packaging uses the generated files."
