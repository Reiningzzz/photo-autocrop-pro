const path = require('path');
const { execSync } = require('child_process');

/**
 * macOS Universal 封裝完成後自動補上 Ad-hoc 簽章 (codesign -s -)
 * 可有效避免 Apple Silicon (M1~M4) 因無付費證書合併二進位檔導致誤判「檔案已損毀」
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  // 僅針對合併完成後的最終產物執行（略過 -temp 暫存架構目錄）
  if (context.appOutDir && context.appOutDir.endsWith('-temp')) return;

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  console.log('[afterPack] Applying ad-hoc codesign for macOS app:', appPath);

  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
    console.log('[afterPack] Ad-hoc codesign completed successfully.');
  } catch (err) {
    console.warn('[afterPack] Ad-hoc codesign warning:', err.message);
  }
};
