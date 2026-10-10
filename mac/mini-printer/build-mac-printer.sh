[Reading 9 lines from start (total: 9 lines, 0 remaining)]

#!/bin/zsh
set -euo pipefail
HERE="${0:A:h}"
DEST="${HOME}/Applications/MISES Mini Printer.app"
mkdir -p "${DEST}/Contents/MacOS" "${DEST}/Contents/Resources"
xcrun swiftc -parse-as-library -O -framework IOBluetooth -framework AppKit -framework Network "${HERE}/MisesMiniPrinter.swift" -o "${DEST}/Contents/MacOS/MISES-Mini-Printer"
cp "${HERE}/Info.plist" "${DEST}/Contents/Info.plist"
codesign --force --deep --sign - "${DEST}"
echo "Built: ${DEST}"

[executed on device: MacBook-Air-M4-de-Cdric.local (1efbc799-63fb-466d-a8da-56d587d10304)]