/**
 * scripts/create-release-bundle.js
 * 
 * PhotoAutoCrop Pro — Gumroad 單一發行壓縮包 (Release Bundle) 自動化封裝與驗證腳本
 * 
 * 核心原則：
 * 1. Zero-Cloud Leak & 100% 本地化：全流程於本機端執行。
 * 2. KISS 極簡無外部相依：僅使用 Node.js 內建模組 (fs, path, crypto, child_process) 與 Windows 原生 PowerShell。
 * 3. 雙執行檔真實 SHA-256 雜湊計算與防篡改清單產出。
 * 4. 嚴格驗證封裝結果與 ZIP 內部目錄結構完整性。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const MANUAL_DIR = path.join(PROJECT_ROOT, 'docs');
const START_HTML_FILE = path.join(PROJECT_ROOT, 'START_HERE.html');

const BUNDLE_ZIP_NAME = 'PhotoAutoCrop-Pro-v1.0.0-Windows-Release-Bundle.zip';
const FINAL_ZIP_PATH = path.join(DIST_DIR, BUNDLE_ZIP_NAME);
const CHECKSUMS_FILE = path.join(DIST_DIR, 'SHA256_CHECKSUMS.txt');
const STAGING_DIR = path.join(DIST_DIR, '.bundle-staging');

// 顏色輔助
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    bold: '\x1b[1m'
};

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

// 1. 計算檔案 SHA256 雜湊
function calculateSHA256(filePath) {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex').toUpperCase();
}

// 2. 遞迴複製資料夾
function copyDirectorySync(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirectorySync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 主執行函式
async function main() {
    log(`\n======================================================`, colors.cyan);
    log(`   PhotoAutoCrop Pro — Release Bundle 自動化封裝程式`, colors.bold + colors.cyan);
    log(`======================================================\n`, colors.cyan);

    // [Step 1] 前置檔案檢查
    log(`[1/6] 檢查必要發行資源...`, colors.bold);
    
    const portableExe = path.join(DIST_DIR, 'PhotoAutoCrop-Pro-Portable.exe');
    const setupExe = path.join(DIST_DIR, 'PhotoAutoCrop-Pro-Setup-1.0.0.exe');

    const requiredFiles = [
        { path: portableExe, label: '可攜版執行檔 (Portable.exe)' },
        { path: setupExe, label: '安裝版執行檔 (Setup.exe)' },
        { path: START_HTML_FILE, label: '國際化上手導航頁 (START_HERE.html)' },
        { path: MANUAL_DIR, label: '完整使用手冊目錄 (docs)' }
    ];

    for (const item of requiredFiles) {
        if (!fs.existsSync(item.path)) {
            log(`❌ 缺失必要資源: ${item.label} (${item.path})`, colors.red);
            process.exit(1);
        }
        log(`  ✓ 已就緒: ${item.label}`);
    }

    // 檢查手冊子檔案
    const manualFiles = ['INSTALLATION_GUIDE.md', 'TROUBLESHOOTING_FAQ.md', 'USER_MANUAL.md'];
    for (const mf of manualFiles) {
        const p = path.join(MANUAL_DIR, mf);
        if (!fs.existsSync(p)) {
            log(`❌ 缺失手冊檔案: ${mf}`, colors.red);
            process.exit(1);
        }
    }
    log(`  ✓ docs 使用手冊全數齊備`);

    // [Step 2] 計算真實 SHA256 雜湊
    log(`\n[2/6] 計算執行檔真實 SHA-256 雜湊碼...`, colors.bold);
    
    const portableHash = calculateSHA256(portableExe);
    const portableSize = fs.statSync(portableExe).size;
    log(`  • Portable.exe : ${portableHash} (${(portableSize / (1024 * 1024)).toFixed(2)} MB)`, colors.yellow);

    const setupHash = calculateSHA256(setupExe);
    const setupSize = fs.statSync(setupExe).size;
    log(`  • Setup.exe    : ${setupHash} (${(setupSize / (1024 * 1024)).toFixed(2)} MB)`, colors.yellow);

    // [Step 3] 輸出 SHA256_CHECKSUMS.txt
    log(`\n[3/6] 生成 SHA256_CHECKSUMS.txt...`, colors.bold);
    const timestamp = new Date().toISOString();
    const checksumContent = [
        `# PhotoAutoCrop Pro v1.0.0 Official SHA256 Checksums`,
        `# Generated: ${timestamp}`,
        `# Product Permalink: photocrop-pro`,
        `# 100% Zero-Cloud Leak Offline Verification`,
        ``,
        `${portableHash} *PhotoAutoCrop-Pro-Portable.exe`,
        `${setupHash} *PhotoAutoCrop-Pro-Setup-1.0.0.exe`,
        ``
    ].join('\r\n');

    fs.writeFileSync(CHECKSUMS_FILE, checksumContent, 'utf8');
    log(`  ✓ 成功寫入校驗清單至: ${CHECKSUMS_FILE}`);

    // [Step 4] 組裝 Staging 暫存發行目錄
    log(`\n[4/6] 組織暫存發行目錄結構...`, colors.bold);
    if (fs.existsSync(STAGING_DIR)) {
        fs.rmSync(STAGING_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(STAGING_DIR, { recursive: true });

    // 複製執行檔
    log(`  • 複製 Portable 執行檔至暫存區...`);
    fs.copyFileSync(portableExe, path.join(STAGING_DIR, 'PhotoAutoCrop-Pro-Portable.exe'));

    log(`  • 複製 Setup 執行檔至暫存區...`);
    fs.copyFileSync(setupExe, path.join(STAGING_DIR, 'PhotoAutoCrop-Pro-Setup-1.0.0.exe'));

    // 複製 START_HERE 國際化上手導航頁
    log(`  • 複製 START_HERE.html 至暫存區...`);
    fs.copyFileSync(START_HTML_FILE, path.join(STAGING_DIR, 'START_HERE.html'));

    // 複製 SHA256 校驗檔
    log(`  • 複製 SHA256_CHECKSUMS.txt 至暫存區...`);
    fs.copyFileSync(CHECKSUMS_FILE, path.join(STAGING_DIR, 'SHA256_CHECKSUMS.txt'));

    // 複製 docs 文檔目錄至暫存區
    log(`  • 複製 docs 專業文檔目錄至暫存區...`);
    copyDirectorySync(MANUAL_DIR, path.join(STAGING_DIR, 'docs'));

    log(`  ✓ 暫存區發行結構組織完畢`);

    // [Step 5] 使用 PowerShell Compress-Archive 壓製成 ZIP
    log(`\n[5/6] 呼叫原生 PowerShell 封裝 ZIP 發行壓縮包...`, colors.bold);
    if (fs.existsSync(FINAL_ZIP_PATH)) {
        fs.unlinkSync(FINAL_ZIP_PATH);
    }

    const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${STAGING_DIR}\\*' -DestinationPath '${FINAL_ZIP_PATH}' -CompressionLevel Optimal -Force"`;
    log(`  • 正在執行壓縮作業 (約需 15~25 秒，請稍候)...`);
    
    const startTime = Date.now();
    execSync(psCommand, { stdio: 'inherit' });
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    
    log(`  ✓ 壓縮完成！耗時: ${elapsedSec} 秒`, colors.green);

    // [Step 6] 驗證 ZIP 產物與內部結構
    log(`\n[6/6] 驗證發行壓縮包完整度與目錄結構...`, colors.bold);
    
    if (!fs.existsSync(FINAL_ZIP_PATH)) {
        log(`❌ 錯誤：壓縮包未成功生成！`, colors.red);
        process.exit(1);
    }

    const zipStat = fs.statSync(FINAL_ZIP_PATH);
    const zipSizeMB = (zipStat.size / (1024 * 1024)).toFixed(2);
    log(`  • ZIP 檔案大小: ${zipSizeMB} MB (${zipStat.size.toLocaleString()} Bytes)`);

    // 使用 PowerShell 檢驗 ZIP 內項目清單
    const verifyScript = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${FINAL_ZIP_PATH}').Entries | Select-Object -Property FullName"`;
    const entriesOutput = execSync(verifyScript, { encoding: 'utf8' });
    
    const expectedEntries = [
        'PhotoAutoCrop-Pro-Portable.exe',
        'PhotoAutoCrop-Pro-Setup-1.0.0.exe',
        'START_HERE.html',
        'SHA256_CHECKSUMS.txt',
        'docs/INSTALLATION_GUIDE.md',
        'docs/TROUBLESHOOTING_FAQ.md',
        'docs/USER_MANUAL.md'
    ];

    let allFound = true;
    for (const expected of expectedEntries) {
        // Windows 斜線正規化比對
        const cleanOutput = entriesOutput.replace(/\\/g, '/');
        if (cleanOutput.includes(expected)) {
            log(`  ✓ 檢驗存在: ${expected}`);
        } else {
            log(`  ❌ 缺失項目: ${expected}`, colors.red);
            allFound = false;
        }
    }

    if (!allFound) {
        log(`❌ 發行包內部條目檢驗失敗！`, colors.red);
        process.exit(1);
    }

    // 清理暫存目錄
    log(`  • 清理 Staging 暫存資料夾...`);
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });

    // 成功報表
    log(`\n======================================================`, colors.green);
    log(`   🎉 Release Bundle 封裝與驗收作業 100% 成功！`, colors.bold + colors.green);
    log(`======================================================`, colors.green);
    log(`發行包路徑 : ${FINAL_ZIP_PATH}`);
    log(`發行包大小 : ${zipSizeMB} MB`);
    log(`包含項目   : 雙執行檔、單檔 HTML 上手指南、官方 SHA256 清單、3 份完整手冊`);
    log(`交付標準   : 完全滿足 Gumroad 上架交付規範 (Zero-Cloud Leak 100% 本機離線)\n`);
}

main().catch(err => {
    log(`❌ 發生未捕捉例外: ${err.message}`, colors.red);
    console.error(err);
    process.exit(1);
});
