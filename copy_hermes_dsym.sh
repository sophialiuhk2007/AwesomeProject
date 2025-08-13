#!/bin/bash

# Copy Hermes dSYM Script
# This script copies Hermes dSYM files during archive builds

echo "🔍 Copy Hermes dSYM Script Starting..."
echo "Configuration: ${CONFIGURATION}"
echo "Platform: ${PLATFORM_NAME}"
echo "SDK: ${SDK_NAME}"

# Only run for Release builds and device targets
if [[ "${CONFIGURATION}" != "Release" ]]; then
    echo "⚠️  Skipping: Not a Release build"
    exit 0
fi

if [[ "${PLATFORM_NAME}" != "iphoneos" ]]; then
    echo "⚠️  Skipping: Not building for device"
    exit 0
fi

# Paths to search for Hermes dSYM
HERMES_DSYM_PATHS=(
    "${SRCROOT}/../node_modules/react-native/sdks/hermes/dSYM/hermes.framework.dSYM"
    "${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework.dSYM"
    "${PODS_ROOT}/hermes-engine/destroot/dSYM/hermes.framework.dSYM"
)

# Target paths
FRAMEWORKS_DSYM_PATH="${BUILT_PRODUCTS_DIR}/${FRAMEWORKS_FOLDER_PATH}/hermes.framework.dSYM"
ARCHIVE_DSYM_PATH="${DWARF_DSYM_FOLDER_PATH}/hermes.framework.dSYM"
DWARF_DSYM_PATH="${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF"

echo "🎯 Target paths:"
echo "  Frameworks: ${FRAMEWORKS_DSYM_PATH}"
echo "  Archive dSYM: ${ARCHIVE_DSYM_PATH}"
echo "  dSYM Bundle: ${DWARF_DSYM_PATH}"

# Find and copy Hermes dSYM
FOUND_DSYM=""
for DSYM_PATH in "${HERMES_DSYM_PATHS[@]}"; do
    if [[ -d "${DSYM_PATH}" ]]; then
        echo "✅ Found Hermes dSYM at: ${DSYM_PATH}"
        FOUND_DSYM="${DSYM_PATH}"
        break
    else
        echo "❌ Not found: ${DSYM_PATH}"
    fi
done

if [[ -z "${FOUND_DSYM}" ]]; then
    echo "🚨 ERROR: Could not find Hermes dSYM file"
    echo "Searched paths:"
    for path in "${HERMES_DSYM_PATHS[@]}"; do
        echo "  - ${path}"
    done
    exit 1
fi

# Create target directories
mkdir -p "$(dirname "${FRAMEWORKS_DSYM_PATH}")"
mkdir -p "$(dirname "${ARCHIVE_DSYM_PATH}")"
mkdir -p "${DWARF_DSYM_PATH}"

# Copy to frameworks folder
echo "📋 Copying to frameworks folder..."
if cp -R "${FOUND_DSYM}" "${FRAMEWORKS_DSYM_PATH}"; then
    echo "✅ Successfully copied to frameworks"
else
    echo "🚨 ERROR: Failed to copy to frameworks folder"
    exit 1
fi

# Copy to archive dSYM folder (this is what Apple checks)
echo "📋 Copying to archive dSYM folder..."
if cp -R "${FOUND_DSYM}" "${ARCHIVE_DSYM_PATH}"; then
    echo "✅ Successfully copied to archive dSYM folder"
else
    echo "🚨 ERROR: Failed to copy to archive dSYM folder"
    exit 1
fi

# Copy DWARF file to dSYM bundle
DWARF_SOURCE="${FOUND_DSYM}/Contents/Resources/DWARF/hermes"
DWARF_TARGET="${DWARF_DSYM_PATH}/hermes"

echo "📋 Copying DWARF file..."
echo "  From: ${DWARF_SOURCE}"
echo "  To: ${DWARF_TARGET}"

if [[ -f "${DWARF_SOURCE}" ]]; then
    if cp "${DWARF_SOURCE}" "${DWARF_TARGET}"; then
        echo "✅ Successfully copied DWARF file"
    else
        echo "🚨 ERROR: Failed to copy DWARF file"
        exit 1
    fi
else
    echo "⚠️  DWARF file not found at: ${DWARF_SOURCE}"
fi

echo "🎉 Copy Hermes dSYM Script Completed Successfully!"
