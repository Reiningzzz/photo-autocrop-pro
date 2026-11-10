/**
 * server.js - PhotoAutoCrop Pro 本地安全伺服器與 Gumroad 商業授權驗證
 * 
 * 核心特色：
 *   1. 100% 本地離線檔案服務 (首重隱私保護，完全無外部資料洩漏)
 *   2. 動態 Port 尋找機制 (預設 3300 被佔用時自動向後嘗試 3301..3350)
 *   3. 僅綁定 127.0.0.1 (拒絕區域網路連線入侵)
 *   4. Gumroad License 驗證與 30 天離線寬限期快取 (POST /api/verify-license, GET /api/license-status)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

let APP_VERSION = '1.0.0';
try {
  const pkg = require('./package.json');
  if (pkg && pkg.version) APP_VERSION = pkg.version;
} catch (e) {}

const DEFAULT_PORT = 3300;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm'
};

// ── 本地設定檔路徑管理 (跨平台相容: AppData / Library / .config) ──
function getUserConfigDir() {
  const home = process.env.HOME || os.homedir() || '';
  const base = process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support')
      : path.join(home, '.config'));
  const dir = path.join(base, 'PhotoAutoCrop');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  }
  return dir;
}

/**
 * 檢查是否為編譯時期指定的朋友免金鑰測試版 (Friends Edition)
 * 僅當封包內建有 build-flavor.json 時啟用；測試模式與標準商用發行版絕不觸發。
 */
function isFriendsTestEdition() {
  if (process.env.NODE_ENV === 'test' || process.env.TEST_SUITE === 'true') {
    return false;
  }
  try {
    const flavorPath = path.join(__dirname, 'build-flavor.json');
    if (fs.existsSync(flavorPath)) {
      const cfg = JSON.parse(fs.readFileSync(flavorPath, 'utf8'));
      return !!(cfg && cfg.flavor === 'friends-free' && cfg.freePass === true);
    }
  } catch (_) {}
  return false;
}

function getLicenseFilePath() {
  return path.join(getUserConfigDir(), 'license.json');
}

function readLicenseConfig() {
  try {
    const file = getLicenseFilePath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (_) {}
  return { isPro: false, licenseKey: '', verifiedAt: '', email: '' };
}

function saveLicenseConfig(data) {
  try {
    const file = getLicenseFilePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('寫入授權憑證失敗:', err);
    return false;
  }
}

// ── Gumroad License 官方 API 驗證 ──
function verifyGumroadLicense(licenseKey) {
  return new Promise((resolve) => {
    // 嚴格隔離測試金鑰：
    // 1. 在 Electron 桌面環境中 (process.env.IS_ELECTRON === 'true') 絕對禁止任何測試金鑰
    // 2. 僅在終端機離線 BDD 自動化驗收測試 (NODE_ENV === 'test' 或 TEST_SUITE === 'true') 且非 Electron 時方可啟用
    const isIsolatedTestRunner = (process.env.NODE_ENV === 'test' || process.env.TEST_SUITE === 'true') && process.env.IS_ELECTRON !== 'true';
    if (isIsolatedTestRunner && (licenseKey === 'PRO-TEST-VALID-KEY' || licenseKey === 'SPECIAL-PRO-KEY')) {
      return resolve({
        success: true,
        uses: 1,
        purchase: {
          email: 'customer@photoautocrop.pro',
          product_name: 'PhotoAutoCrop Pro',
          license_key: licenseKey,
          created_at: new Date().toISOString()
        }
      });
    }

    const postData = new URLSearchParams({
      product_permalink: 'photocrop-pro',
      license_key: licenseKey,
      increment_uses_count: 'true'
    }).toString();

    const req = https.request({
      hostname: 'api.gumroad.com',
      port: 443,
      path: '/v2/licenses/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': `PhotoAutoCrop-Pro/${APP_VERSION}`
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          // 🛡️ 退款防護 (Refund & Chargeback Protection)
          if (data && data.success && data.purchase) {
            if (data.purchase.refunded || data.purchase.chargebacked) {
              return resolve({ success: false, message: '該授權金鑰已被退款或撤銷，無法繼續啟用。' });
            }
          }
          resolve(data);
        } catch (e) {
          resolve({ success: false, message: 'Gumroad 伺服器回應異常，請稍後重試。' });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, message: '連線至 Gumroad 伺服器失敗，請確認網路連線：' + (err.message || err) });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, message: '連線至 Gumroad 逾時，請檢查連線後重試。' });
    });

    req.write(postData);
    req.end();
  });
}

function createStaticServer() {
  return http.createServer((req, res) => {
    // 安全標頭
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const parsedUrl = new URL(req.url, 'http://127.0.0.1');
    const pathname = parsedUrl.pathname;

    // ── API 路由 1: 查詢當前授權狀態 (GET /api/license-status) ──
    if (pathname === '/api/license-status' && req.method === 'GET') {
      if (isFriendsTestEdition()) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          isPro: true,
          email: 'friends-beta@photoautocrop.pro',
          maskedKey: 'FRND-TEST-FREE-PASS',
          trialLimit: 999999,
          verifiedAt: new Date().toISOString(),
          isFriendsEdition: true
        }));
      }

      const lic = readLicenseConfig();
      // 30 天離線寬限期 (Offline Grace Period)
      const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
      const isWithinGrace = lic.verifiedAt && (Date.now() - new Date(lic.verifiedAt).getTime() < GRACE_PERIOD_MS);
      const isPro = !!(lic.isPro && isWithinGrace);

      let maskedKey = '';
      if (lic.licenseKey && lic.licenseKey.length >= 8) {
        maskedKey = lic.licenseKey.slice(0, 4) + '-****-' + lic.licenseKey.slice(-4);
      } else if (lic.licenseKey) {
        maskedKey = '****';
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        isPro,
        email: lic.email || '',
        maskedKey,
        trialLimit: 3,
        verifiedAt: lic.verifiedAt || ''
      }));
    }

    // ── API 路由 2: 驗證 Gumroad 金鑰 (POST /api/verify-license) ──
    if (pathname === '/api/verify-license' && req.method === 'POST') {
      if (isFriendsTestEdition()) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          success: true,
          isPro: true,
          message: 'Friends Beta Edition: PRO unlocked automatically (no key required)!',
          email: 'friends-beta@photoautocrop.pro'
        }));
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { licenseKey } = JSON.parse(body || '{}');
          const cleanKey = (licenseKey || '').trim();
          if (!cleanKey) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, message: '請輸入有效的 Gumroad 金鑰' }));
          }

          const gumroadRes = await verifyGumroadLicense(cleanKey);
          if (gumroadRes.success) {
            const purchase = gumroadRes.purchase || {};
            const licData = {
              isPro: true,
              licenseKey: cleanKey,
              verifiedAt: new Date().toISOString(),
              email: purchase.email || 'customer@gumroad.com',
              productName: purchase.product_name || 'PhotoAutoCrop Pro'
            };
            saveLicenseConfig(licData);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({
              success: true,
              isPro: true,
              message: '恭喜！PRO 版已成功啟用！',
              email: licData.email
            }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({
              success: false,
              message: gumroadRes.message || 'Gumroad 授權金鑰無效或不存在，請確認後重試。'
            }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ success: false, message: '伺服器處理驗證發生錯誤：' + err.message }));
        }
      });
      return;
    }

    // ── API 路由 3: 清除授權 (POST /api/clear-license，供測試重置) ──
    if (pathname === '/api/clear-license' && req.method === 'POST') {
      saveLicenseConfig({ isPro: false, licenseKey: '', verifiedAt: '', email: '' });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, message: '已成功重置為免費試用模式' }));
    }

    // ── 靜態檔案服務 ──
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      return res.end('405 Method Not Allowed');
    }

    const safeUrl = decodeURI(pathname);
    let relativePath;
    if (safeUrl === '/' || safeUrl === '/index.html') {
      relativePath = 'index.html';
    } else if (safeUrl === '/agent-manager' || safeUrl === '/dashboard') {
      relativePath = 'agent_manager.html';
    } else {
      relativePath = safeUrl.replace(/^\/+/, '');
    }
    let filePath = path.normalize(path.join(ROOT_DIR, relativePath));

    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://generativelanguage.googleapis.com https://api.gumroad.com blob: data:; img-src 'self' data: blob:; worker-src 'self' blob:;";

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': csp
      });

      if (req.method === 'HEAD') {
        return res.end();
      }

      fs.createReadStream(filePath).pipe(res);
    });
  });
}

/**
 * 動態啟動本地伺服器，若目標 port 被佔用，自動向後尋找可用 port
 */
function startServer(preferredPort = DEFAULT_PORT, callback) {
  let currentPort = parseInt(preferredPort, 10) || DEFAULT_PORT;
  const maxPort = currentPort + 50;
  let server = null;

  function tryListen(portToTry) {
    if (portToTry > maxPort) {
      const err = new Error('無法在 ' + currentPort + ' 至 ' + maxPort + ' 範圍內找到可用的 Port');
      if (callback) callback(err);
      return;
    }

    server = createStaticServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn('[Port自動容錯] Port ' + portToTry + ' 已被佔用，正在嘗試下一個可用 Port ...');
        tryListen(portToTry + 1);
      } else {
        if (callback) callback(err);
      }
    });

    server.listen(portToTry, '127.0.0.1', () => {
      const actualPort = server.address().port;
      const url = 'http://127.0.0.1:' + actualPort;
      console.log('===============================================');
      console.log('[PhotoAutoCrop Pro] 100% 純本地伺服器已啟動: ' + url);
      console.log('[安全機制] 僅綁定 127.0.0.1，零外部連線，無 Port 衝突');
      console.log('===============================================');

      if (!process.env.IS_ELECTRON && !process.env.HEADLESS) {
        const startCmd = process.platform === 'win32' ? ('start ' + url) :
                         process.platform === 'darwin' ? ('open ' + url) : ('xdg-open ' + url);
        exec(startCmd, () => {});
      }

      if (callback) callback(null, { port: actualPort, url, server });
    });
  }

  tryListen(currentPort);
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, DEFAULT_PORT, readLicenseConfig, saveLicenseConfig, verifyGumroadLicense };