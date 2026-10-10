#!/bin/zsh
# One downloadable .app for any macOS 13+ Apple Silicon M1/M4 or Intel Mac.
set -euo pipefail
HERE="${0:A:h}"
ROOT="${HERE:h:h}"
OUT="${MISES_MINI_PRINTER_OUT:-${ROOT}/out/mac}"
mkdir -p "${OUT}"
BUILDDIR=$(mktemp -d)
trap 'rm -rf "${BUILDDIR}"' EXIT
MISES_MINI_PRINTER_DEST="${BUILDDIR}/MISES Mini Printer.app" zsh "${HERE}/build-mac-printer.sh"
cp "${HERE}/INSTALLER-MAC.txt" "${BUILDDIR}/LIRE-AVANT-INSTALLATION.txt"
ASSET="${OUT}/MISES-Mini-Printer-Mac-Universal.zip"
rm -f "${ASSET}"
(
  cd "${BUILDDIR}"
  ditto -c -k --sequesterRsrc --keepParent "MISES Mini Printer.app" "${ASSET}"
  # Keep the drag-and-drop installation guide next to the .app in the ZIP.
  /usr/bin/zip -q "${ASSET}" "LIRE-AVANT-INSTALLATION.txt"
)
echo "Package: ${ASSET}"
lipo -archs "${BUILDDIR}/MISES Mini Printer.app/Contents/MacOS/MISES-Mini-Printer"
