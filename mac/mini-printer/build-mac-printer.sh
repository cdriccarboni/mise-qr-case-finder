#!/bin/zsh
set -euo pipefail
HERE="${0:A:h}"
DEST="${MISES_MINI_PRINTER_DEST:-${HOME}/Applications/MISES Mini Printer.app}"
VERSION=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "${HERE}/Info.plist")
mkdir -p "${DEST}/Contents/MacOS" "${DEST}/Contents/Resources"
TMP=$(mktemp -d)
trap 'rm -rf "${TMP}"' EXIT
# macOS 13+; universal Mach-O works unchanged on M1, M4 and Intel.
# No dependency on a per-user printer address or Mac home directory.
for ARCH in arm64 x86_64; do
  xcrun swiftc -parse-as-library -O     -target "${ARCH}-apple-macos13.0"     -framework AppKit -framework Network     "${HERE}/MisesMiniPrinter.swift"     -o "${TMP}/MISES-${ARCH}"
done
lipo -create "${TMP}/MISES-arm64" "${TMP}/MISES-x86_64"   -output "${DEST}/Contents/MacOS/MISES-Mini-Printer"
chmod +x "${DEST}/Contents/MacOS/MISES-Mini-Printer"
cp "${HERE}/Info.plist" "${DEST}/Contents/Info.plist"
codesign --force --deep --sign - "${DEST}"
echo "Built universal MISES! Mini Printer ${VERSION}: ${DEST}"
lipo -archs "${DEST}/Contents/MacOS/MISES-Mini-Printer"
