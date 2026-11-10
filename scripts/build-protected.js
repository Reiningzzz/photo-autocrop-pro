/**
 * build-protected.js - 商業發行版本自動化代碼混淆與安全打包流水線
 * 
 * 核心機制：
 *   1. 備份核心業務與演算法代碼 (js/detector.js, js/smart_snap.js, js/orientation_scorer.js, server.js)
 *   2. 應用高強度 AST 混淆 (控制流平坦化、字串 Base64 加密、防篡改)
 *   3. 調用 electron-builder 完成打包 (產出發行版 asar/exe)
 *   4. 打包結束後自動還原開發源碼，確保本地代碼始終清潔可維護
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(PROJECT_ROOT, '.build_backup');

// 需要重點保護的核心資產 (覆蓋所有核心演算模組與伺服器邏輯)
const PROTECTED_FILES = [
  path.join(PROJECT_ROOT, 'js', 'detector.js'),
  path.join(PROJECT_ROOT, 'js', 'smart_snap.js'),
  path.join(PROJECT_ROOT, 'js', 'orientation_scorer.js'),
  path.join(PROJECT_ROOT, 'js', 'gemini_detector.js'),
  path.join(PROJECT_ROOT, 'js', 'layout_memory.js'),
  path.join(PROJECT_ROOT, 'js', 'canvas_annotator.js'),
  path.join(PROJECT_ROOT, 'js', 'duplicate_detector.js'),
  path.join(PROJECT_ROOT, 'js', 'face_orienter.js'),
  path.join(PROJECT_ROOT, 'js', 'storage_manager.js'),
  path.join(PROJECT_ROOT, 'server.js')
];

let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch (e) {
  console.error('❌ 未找到 javascript-obfuscator，請先執行 npm install --save-dev javascript-obfuscator');
  process.exit(1);
}

// 混淆配置：兼顧最高反逆向強度與執行速度
const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.8,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.8,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

function backupFiles() {
  console.log('[1/4] 備份源始代碼...');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  for (const file of PROTECTED_FILES) {
    if (fs.existsSync(file)) {
      const relPath = path.relative(PROJECT_ROOT, file);
      const backupPath = path.join(BACKUP_DIR, relPath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(file, backupPath);
    }
  }
}

function obfuscateFiles() {
  console.log('[2/4] 對核心演算法與服務模組進行高強度 AST 混淆保護...');
  for (const file of PROTECTED_FILES) {
    if (fs.existsSync(file)) {
      const relPath = path.relative(PROJECT_ROOT, file);
      const rawCode = fs.readFileSync(file, 'utf8');
      console.log(`  🔒 混淆中: ${relPath}`);
      const obfuscatedResult = JavaScriptObfuscator.obfuscate(rawCode, OBFUSCATION_OPTIONS);
      fs.writeFileSync(file, obfuscatedResult.getObfuscatedCode(), 'utf8');
    }
  }
}

function restoreFiles() {
  console.log('[還原] 正在將開發源碼還原至工作目錄...');
  if (!fs.existsSync(BACKUP_DIR)) return;

  for (const file of PROTECTED_FILES) {
    const relPath = path.relative(PROJECT_ROOT, file);
    const backupPath = path.join(BACKUP_DIR, relPath);
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, file);
    }
  }

  try {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  } catch (_) {}
  console.log('✅ 源碼還原完成！工作目錄已回復原始乾淨狀態。');
}

function main() {
  const args = process.argv.slice(2);
  const isOnlyObfuscate = args.includes('--only-obfuscate');
  const isOnlyRestore = args.includes('--only-restore');

  if (isOnlyRestore) {
    restoreFiles();
    return;
  }

  try {
    backupFiles();
    obfuscateFiles();

    if (isOnlyObfuscate) {
      console.log('✅ 已完成混淆 (僅測試模式，不執行打包)。若要還原請執行: node scripts/build-protected.js --only-restore');
      return;
    }

    console.log('[3/4] 調用 electron-builder 構建生產發行版 (NSIS 安裝包與 Portable 免安裝版)...');
    execSync('npx electron-builder --win nsis portable', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    console.log('[4/4] 打包完成！');
  } catch (err) {
    console.error('❌ 打包流程異常:', err.message);
  } finally {
    if (!isOnlyObfuscate) {
      restoreFiles();
    }
  }
}

main();
