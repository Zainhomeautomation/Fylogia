#!/bin/sh
set -eu

: "${SRCROOT:?SRCROOT is required}"
: "${TARGET_BUILD_DIR:?TARGET_BUILD_DIR is required}"
: "${UNLOCALIZED_RESOURCES_FOLDER_PATH:?UNLOCALIZED_RESOURCES_FOLDER_PATH is required}"
: "${DERIVED_FILE_DIR:?DERIVED_FILE_DIR is required}"

if [ -n "${CI_PRIMARY_REPOSITORY_PATH:-}" ]; then
  repository_root=$(CDPATH= cd -- "$CI_PRIMARY_REPOSITORY_PATH" && pwd)
else
  repository_root=$(CDPATH= cd -- "$SRCROOT/../.." && pwd)
fi

source="$repository_root/native/ios/Fylogia/WebAssets"
if [ ! -s "$source/index.html" ]; then
  # Xcode Cloud does not retain files created by ci_scripts hooks for xcodebuild.
  # Generate again inside this target phase so the following copy uses live outputs.
  generator="$repository_root/native/ios/scripts/generate-native-web-assets.sh"
  if [ ! -x "$generator" ]; then
    echo "Fylogia WebAssets are missing at $source and the executable generator is unavailable." >&2
    exit 1
  fi

  echo "Fylogia WebAssets are absent at build time; regenerating from the pinned source within this build phase."
  CI_PRIMARY_REPOSITORY_PATH="$repository_root" "$generator"
fi

if [ ! -s "$source/index.html" ]; then
  echo "Fylogia WebAssets generation completed without $source/index.html." >&2
  exit 1
fi

destination="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/WebAssets"
mkdir -p "$(dirname "$destination")"
/usr/bin/ditto "$source" "$destination"
/usr/bin/touch "$DERIVED_FILE_DIR/fylogia-web-assets-ready.stamp"
echo "Fylogia WebAssets copied from $source to $destination."
