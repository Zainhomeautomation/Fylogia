#!/bin/sh
set -eu

repository_path=${CI_PRIMARY_REPOSITORY_PATH:-}
if [ -z "$repository_path" ] || [ ! -f "$repository_path/native/ios/scripts/build-web.mjs" ]; then
  echo "Xcode Cloud repository path is missing the Fylogia native build script." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" != "24" ]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Node.js 24 is required to prepare Fylogia WebAssets; Homebrew is unavailable." >&2
    exit 1
  fi
  if ! brew list --versions node@24 >/dev/null 2>&1; then
    brew install node@24
  fi
  node_prefix=$(brew --prefix node@24)
  PATH="$node_prefix/bin:$PATH"
  export PATH
fi

golden_tag="fylogia-web-golden-v1"
golden_commit="26fd37f27bd70cd7495f33209b823796770d9c22"
if ! git -C "$repository_path" rev-parse --verify "refs/tags/$golden_tag^{commit}" >/dev/null 2>&1; then
  echo "Golden web tag is not present in this checkout; fetching only $golden_tag from origin."
  if ! git -C "$repository_path" fetch --no-tags origin "refs/tags/$golden_tag:refs/tags/$golden_tag"; then
    echo "Unable to fetch required golden web tag from origin: $golden_tag" >&2
    exit 1
  fi
fi

resolved_golden_commit=$(git -C "$repository_path" rev-parse --verify "refs/tags/$golden_tag^{commit}")
if [ "$resolved_golden_commit" != "$golden_commit" ]; then
  echo "Golden web tag resolved to unexpected commit $resolved_golden_commit; expected $golden_commit." >&2
  exit 1
fi

source_path="$repository_path/native/ios/.build/golden-source"
mkdir -p "$source_path"
git -C "$repository_path" archive "$golden_tag" | tar -x -C "$source_path"
npm --prefix "$source_path" ci --no-audit --no-fund

FYLOGIA_NODE_MODULES="$source_path/node_modules" \
  node "$repository_path/native/ios/scripts/build-web.mjs"

if [ ! -s "$repository_path/native/ios/Fylogia/WebAssets/index.html" ]; then
  echo "Native WebAssets generation completed without an index.html." >&2
  exit 1
fi
