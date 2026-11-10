/**
 * scripts/generate_gumroad_marketing_assets.js
 * 
 * 依據使用者具體要求：以 001.png 與 002.png 為核心設計基準，
 * 利用 Electron 離線無頭渲染引擎產出符合 Gumroad 官方規格的專業級視覺行銷資產：
 * 1. gumroad_cover.png (1280x720, 16:9 官方主封面)
 * 2. gumroad_thumbnail.png (600x600, 1:1 正方形縮圖)
 * 3. 01_feature_dual_pane_studio.png (1280x720, 工作台特性展示，取材自 001.png)
 * 4. 02_feature_corner_patrol_inspector.png (1280x720, 角點檢驗特性展示，取材自 002.png)
 * 5. 03_feature_before_after_comparison.png (1280x720, 前後對比展示，取材自 001.png)
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const baseDir = path.join(__dirname, '..', '..', 'marketing');
  const assetsDir = path.join(baseDir, 'marketing_assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const img001B64 = fs.readFileSync(path.join(baseDir, '001.png')).toString('base64');
  const img002B64 = fs.readFileSync(path.join(baseDir, '002.png')).toString('base64');

  console.log('Generating Gumroad marketing assets from 001.png and 002.png...');
  const tempHtmlPath = path.join(__dirname, 'temp_render.html');
  async function renderHtml(html) {
    fs.writeFileSync(tempHtmlPath, html, 'utf8');
    await win.loadFile(tempHtmlPath);
    await new Promise(r => setTimeout(r, 1200));
  }


  // ═══════════════════════════════════════════════════════════════════
  // 1. 生成 1280x720 Gumroad 主封面 (gumroad_cover.png)
  // ═══════════════════════════════════════════════════════════════════
  const coverHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px; height: 720px;
        background: radial-gradient(circle at 75% 30%, #1e1b4b 0%, #0f172a 50%, #030712 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #f8fafc;
        overflow: hidden;
        position: relative;
        display: flex;
      }
      /* 左側品牌與價值主張 */
      .left-col {
        width: 480px;
        height: 100%;
        padding: 60px 0 60px 60px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        z-index: 10;
      }
      .badge-category {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid rgba(99, 102, 241, 0.4);
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        color: #818cf8;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        width: fit-content;
      }
      .title-block {
        margin-top: 20px;
      }
      .app-title {
        font-size: 42px;
        font-weight: 800;
        letter-spacing: -0.5px;
        line-height: 1.15;
        background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .app-title span {
        background: linear-gradient(135deg, #818cf8 0%, #38bdf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .app-tagline {
        font-size: 16px;
        line-height: 1.5;
        color: #94a3b8;
        margin-top: 14px;
        font-weight: 400;
      }
      .features-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 24px;
      }
      .feat-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: #e2e8f0;
        font-weight: 500;
      }
      .feat-icon {
        width: 20px; height: 20px;
        border-radius: 6px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #34d399;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        flex-shrink: 0;
      }
      .footer-trust {
        display: flex;
        align-items: center;
        gap: 16px;
        border-top: 1px solid rgba(148, 163, 184, 0.15);
        padding-top: 18px;
        font-size: 12px;
        color: #64748b;
      }
      .trust-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #cbd5e1;
        font-weight: 600;
      }

      /* 右側立體軟體 UI 視窗 (取材自 001.png 與 002.png) */
      .right-col {
        flex: 1;
        position: relative;
        perspective: 1200px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .window-container {
        position: absolute;
        width: 820px;
        height: 529px;
        right: -30px;
        top: 95px;
        transform: rotateY(-8deg) rotateX(4deg) scale(0.96);
        box-shadow: -20px 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.25);
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: #0f172a;
      }
      .window-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      /* 前景懸浮檢查鏡特寫 (取材自 002.png) */
      .floating-inspector {
        position: absolute;
        width: 380px;
        height: 246px;
        bottom: 50px;
        right: 380px;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(56, 189, 248, 0.5);
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.3);
        transform: translateZ(50px) scale(1.02);
        z-index: 20;
      }
      .floating-inspector img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .pill-badge {
        position: absolute;
        top: -12px;
        right: 16px;
        background: #0284c7;
        color: #ffffff;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5);
      }
    </style>
  </head>
  <body>
    <div class="left-col">
      <div>
        <div class="badge-category">
          <span>●</span> Commercial Desktop Studio
        </div>
        <div class="title-block">
          <h1 class="app-title">PhotoAutoCrop <span>PRO</span></h1>
          <p class="app-tagline">
            Automate family album digitization with local AI contour fitting, perspective deskewing & 300 DPI print-ready batch export.
          </p>
        </div>
        <div class="features-list">
          <div class="feat-item">
            <div class="feat-icon">✓</div>
            <span><strong>100% Zero-Cloud Leak</strong> — Fully offline local processing</span>
          </div>
          <div class="feat-item">
            <div class="feat-icon">✓</div>
            <span><strong>Multi-Photo Auto-Split</strong> — Scan whole album pages at once</span>
          </div>
          <div class="feat-item">
            <div class="feat-icon">✓</div>
            <span><strong>Pixel-Perfect Deskew</strong> — 4-Corner polygon boundary fitting</span>
          </div>
          <div class="feat-item">
            <div class="feat-icon">✓</div>
            <span><strong>Print-Ready Output</strong> — 300 DPI metadata + EXIF preservation</span>
          </div>
          <div class="feat-item">
            <div class="feat-icon">✓</div>
            <span><strong>iPhone HEIC Native</strong> — Zero-conversion drag & drop</span>
          </div>
        </div>
      </div>

      <div class="footer-trust">
        <div class="trust-badge">
          <span>🔒</span> Pay Once, Own Forever
        </div>
        <div>•</div>
        <div>30-Day Money-Back Guarantee</div>
        <div>•</div>
        <div>Windows & macOS</div>
      </div>
    </div>

    <div class="right-col">
      <!-- 主視窗 (001.png) -->
      <div class="window-container">
        <img class="window-img" src="data:image/png;base64,${img001B64}">
      </div>

      <!-- 特寫視窗 (002.png) -->
      <div class="floating-inspector">
        <div class="pill-badge">1:1 ACTUAL PIXELS INSPECT</div>
        <img src="data:image/png;base64,${img002B64}">
      </div>
    </div>
  </body>
  </html>
  `;

  await renderHtml(coverHtml);
  const coverImg = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 720 });
  fs.writeFileSync(path.join(assetsDir, 'gumroad_cover.png'), coverImg.toPNG());
  console.log('✓ gumroad_cover.png (1280x720) created successfully!');

  // ═══════════════════════════════════════════════════════════════════
  // 2. 生成 600x600 Gumroad 方形縮圖 (gumroad_thumbnail.png)
  // ═══════════════════════════════════════════════════════════════════
  const thumbHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 600px; height: 600px;
        background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #f8fafc;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 36px 30px;
      }
      .brand-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(99, 102, 241, 0.18);
        border: 1px solid rgba(99, 102, 241, 0.45);
        padding: 5px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        color: #a5b4fc;
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }
      .header {
        text-align: center;
      }
      .title {
        font-size: 32px;
        font-weight: 800;
        line-height: 1.15;
        background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .title span {
        background: linear-gradient(135deg, #818cf8 0%, #38bdf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .subtitle {
        font-size: 13px;
        color: #94a3b8;
        margin-top: 6px;
      }
      .preview-box {
        width: 530px;
        height: 330px;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(99, 102, 241, 0.3);
        position: relative;
      }
      .preview-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .mini-badge {
        position: absolute;
        bottom: 12px;
        left: 12px;
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid rgba(56, 189, 248, 0.5);
        backdrop-filter: blur(8px);
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        color: #38bdf8;
      }
      .footer {
        display: flex;
        gap: 16px;
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
      }
      .footer span { color: #34d399; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand-badge"><span>●</span> Commercial Desktop Studio</div>
      <h1 class="title">PhotoAutoCrop <span>PRO</span></h1>
      <p class="subtitle">Auto-Scan & Batch Crop Workstation</p>
    </div>

    <div class="preview-box">
      <img src="data:image/png;base64,${img001B64}">
      <div class="mini-badge">300 DPI Print-Ready • 100% Offline</div>
    </div>

    <div class="footer">
      <div><span>✓</span> Lifetime License</div>
      <div><span>✓</span> Zero-Cloud Privacy</div>
      <div><span>✓</span> 30-Day Refund</div>
    </div>
  </body>
  </html>
  `;

  await renderHtml(thumbHtml);
  const thumbImg = await win.webContents.capturePage({ x: 0, y: 0, width: 600, height: 600 });
  fs.writeFileSync(path.join(assetsDir, 'gumroad_thumbnail.png'), thumbImg.toPNG());
  console.log('✓ gumroad_thumbnail.png (600x600) created successfully!');

  // ═══════════════════════════════════════════════════════════════════
  // 3. 生成 Feature 1: Dual-Pane Studio Workspace (01_feature_dual_pane_studio.png)
  // ═══════════════════════════════════════════════════════════════════
  const feat1Html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px; height: 720px;
        background: #090d16;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #f8fafc;
        overflow: hidden;
        padding: 40px 60px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .top-banner {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 20px;
      }
      .headline {
        font-size: 28px;
        font-weight: 800;
        color: #ffffff;
      }
      .headline span { color: #818cf8; }
      .subhead {
        font-size: 14px;
        color: #94a3b8;
        margin-top: 6px;
      }
      .tag {
        font-size: 12px;
        font-weight: 700;
        background: rgba(99, 102, 241, 0.15);
        color: #a5b4fc;
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid rgba(99, 102, 241, 0.3);
      }
      .main-window-frame {
        width: 100%;
        height: 520px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9);
      }
      .main-window-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .footer-notes {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #94a3b8;
        padding-top: 14px;
      }
      .footer-notes strong { color: #f8fafc; }
    </style>
  </head>
  <body>
    <div class="top-banner">
      <div>
        <h2 class="headline">Dual-Pane Studio: <span>Scan Whole Album Pages at Once</span></h2>
        <p class="subhead">Left: Original album scan with smart polygon detection • Right: Real-time deskewed 300 DPI crop preview</p>
      </div>
      <div class="tag">FEATURE 01 / DUAL-PANE WORKSPACE</div>
    </div>

    <div class="main-window-frame">
      <img src="data:image/png;base64,${img001B64}">
    </div>

    <div class="footer-notes">
      <div><strong>Step 1:</strong> Drag & Drop whole album photo</div>
      <div><strong>Step 2:</strong> 1-Click Auto-Detect polygon corners</div>
      <div><strong>Step 3:</strong> Batch Export 300 DPI JPEGs</div>
    </div>
  </body>
  </html>
  `;

  await renderHtml(feat1Html);
  const feat1Img = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 720 });
  fs.writeFileSync(path.join(assetsDir, '01_feature_dual_pane_studio.png'), feat1Img.toPNG());
  console.log('✓ 01_feature_dual_pane_studio.png (1280x720) created successfully!');

  // ═══════════════════════════════════════════════════════════════════
  // 4. 生成 Feature 2: Corner Patrol High-Res Inspector (02_feature_corner_patrol_inspector.png)
  // ═══════════════════════════════════════════════════════════════════
  const feat2Html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px; height: 720px;
        background: #090d16;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #f8fafc;
        overflow: hidden;
        padding: 40px 60px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .top-banner {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 20px;
      }
      .headline {
        font-size: 28px;
        font-weight: 800;
        color: #ffffff;
      }
      .headline span { color: #38bdf8; }
      .subhead {
        font-size: 14px;
        color: #94a3b8;
        margin-top: 6px;
      }
      .tag {
        font-size: 12px;
        font-weight: 700;
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid rgba(56, 189, 248, 0.3);
      }
      .main-window-frame {
        width: 100%;
        height: 520px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9);
      }
      .main-window-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .footer-notes {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #94a3b8;
        padding-top: 14px;
      }
      .footer-notes strong { color: #38bdf8; }
    </style>
  </head>
  <body>
    <div class="top-banner">
      <div>
        <h2 class="headline">Corner Patrol: <span>1:1 Pixel-Perfect Edge Inspection</span></h2>
        <p class="subhead">Inspect physical photo boundaries with Edge Contrast Highlight to eliminate dark fringes & unwanted margins.</p>
      </div>
      <div class="tag">FEATURE 02 / CORNER PATROL</div>
    </div>

    <div class="main-window-frame">
      <img src="data:image/png;base64,${img002B64}">
    </div>

    <div class="footer-notes">
      <div><strong>Top-Left & Top-Right:</strong> Jump instantly to inspect corners</div>
      <div><strong>Bottom-Left & Bottom-Right:</strong> Zero manual zoom fatigue</div>
      <div><strong>Edge Highlight ON:</strong> Instant high-contrast fringe check</div>
    </div>
  </body>
  </html>
  `;

  await renderHtml(feat2Html);
  const feat2Img = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 720 });
  fs.writeFileSync(path.join(assetsDir, '02_feature_corner_patrol_inspector.png'), feat2Img.toPNG());
  console.log('✓ 02_feature_corner_patrol_inspector.png (1280x720) created successfully!');

  // ═══════════════════════════════════════════════════════════════════
  // 5. 生成 Feature 3: Before / After Comparison (03_feature_before_after_comparison.png)
  // ═══════════════════════════════════════════════════════════════════
  const feat3Html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px; height: 720px;
        background: #090d16;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #f8fafc;
        overflow: hidden;
        padding: 40px 60px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .top-banner {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 20px;
      }
      .headline {
        font-size: 28px;
        font-weight: 800;
        color: #ffffff;
      }
      .headline span { color: #10b981; }
      .subhead {
        font-size: 14px;
        color: #94a3b8;
        margin-top: 6px;
      }
      .tag {
        font-size: 12px;
        font-weight: 700;
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .comparison-grid {
        display: flex;
        gap: 30px;
        height: 520px;
        align-items: center;
      }
      .card-box {
        flex: 1;
        height: 100%;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        background: #0f172a;
      }
      .card-header {
        padding: 12px 18px;
        font-size: 13px;
        font-weight: 700;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .card-header.before { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }
      .card-header.after { background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3); }
      .card-img-wrap {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      .card-img-wrap img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        padding: 10px;
      }
      .footer-notes {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #94a3b8;
        padding-top: 14px;
      }
      .footer-notes strong { color: #f8fafc; }
    </style>
  </head>
  <body>
    <div class="top-banner">
      <div>
        <h2 class="headline">Before & After: <span>From Skewed Album Page to Restored 300 DPI</span></h2>
        <p class="subhead">True side-by-side comparison: Eliminate perspective distortion, glare edges & physical paper margins automatically.</p>
      </div>
      <div class="tag">FEATURE 03 / RESTORATION QUALITY</div>
    </div>

    <div class="comparison-grid">
      <div class="card-box">
        <div class="card-header before">
          <span>ORIGINAL SCAN: SKEWED MULTI-PHOTO ALBUM PAGE</span>
          <span>PERSPECTIVE DISTORTION</span>
        </div>
        <div class="card-img-wrap">
          <img src="data:image/png;base64,${img001B64}">
        </div>
      </div>

      <div class="card-box">
        <div class="card-header after">
          <span>PHOTOAUTOCROP PRO: CROPPED & RESTORED RESULT</span>
          <span>300 DPI PRINT-READY JPEG</span>
        </div>
        <div class="card-img-wrap">
          <img src="data:image/png;base64,${img002B64}">
        </div>
      </div>
    </div>

    <div class="footer-notes">
      <div><strong>Zero Cloud Transfer:</strong> All processing stays in local memory</div>
      <div><strong>Lossless Lanczos-4:</strong> Preserves original grain & sharpness</div>
      <div><strong>Full EXIF Retained:</strong> Ready for archival & photo books</div>
    </div>
  </body>
  </html>
  `;

  await renderHtml(feat3Html);
  if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
  const feat3Img = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 720 });
  fs.writeFileSync(path.join(assetsDir, '03_feature_before_after_comparison.png'), feat3Img.toPNG());
  console.log('✓ 03_feature_before_after_comparison.png (1280x720) created successfully!');

  console.log('🎉 All 5 Gumroad marketing assets successfully generated from 001.png & 002.png!');
  app.quit();
});
