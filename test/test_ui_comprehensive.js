/**
 * test/test_ui_comprehensive.js
 * PhotoAutoCrop Pro - 介面功能深度實測腳本 (Electron 無頭環境)
 * 驗收範圍：
 *   1. 頂部主選單（文件、編輯、查看、AI識別、系統設置、幫助）所有點擊與動作觸發
 *   2. 6 大全域彈窗：商業授權管理、Gemini AI 設定、快捷鍵指南、歷史工作階段、官方使用手冊、關於軟體（開關、ESC關閉、遮罩防殘留）
 *   3. 7 國語言切換（繁體中文、簡體中文、English、日本語、Deutsch、Français、Español）各 UI 元素即時更新無漏譯
 *   4. 全域快捷鍵響應（Del, Ctrl+Z, Ctrl+E, R, X, ?, [, ], Esc 等）
 */

const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  const ses = session.fromPartition('test_ui_' + Date.now());
  await ses.clearStorageData();

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      session: ses,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const url = 'http://127.0.0.1:3300';
  console.log('[UI Test] 正在加載測試頁面:', url);

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[BrowserConsole] ${message}`);
  });

  await win.loadURL(url);

  // 等待頁面初始化完畢
  await new Promise(r => setTimeout(r, 2000));

  console.log('[UI Test] 開始在瀏覽器執行端到端 UI 功能實測...\n');

  try {
    const testResults = await win.webContents.executeJavaScript(`
      (async () => {
        const results = {
          passed: 0,
          failed: 0,
          suites: []
        };

        function assert(condition, message) {
          if (!condition) {
            throw new Error(message || 'Assertion failed');
          }
        }

        async function runSuite(suiteName, tests) {
          const suite = { name: suiteName, items: [] };
          console.log('--- ' + suiteName + ' ---');
          for (const t of tests) {
            try {
              await t.fn();
              results.passed++;
              suite.items.push({ name: t.name, status: 'PASS' });
              console.log('  ✔ [PASS] ' + t.name);
            } catch (err) {
              results.failed++;
              suite.items.push({ name: t.name, status: 'FAIL', error: err.message });
              console.error('  ✖ [FAIL] ' + t.name + ' -> ' + err.message);
            }
          }
          results.suites.push(suite);
        }

        // Mock 系統原生對話框避免阻斷自動化
        window.confirm = () => true;
        window.alert = () => {};
        window.prompt = () => '';

        // ══════════════════════════════════════════════════════════
        // 模組 1: 頂部主選單（選單開闔與 24 個選單項目觸發）
        // ══════════════════════════════════════════════════════════
        await runSuite('模組 1: 頂部主選單開闔與動作觸發', [
          {
            name: '1.1 頂部 6 個主選單點擊開闔與單一展開互斥性',
            fn: async () => {
              const menuNames = ['file', 'edit', 'view', 'ai', 'settings', 'help'];
              for (const name of menuNames) {
                const btn = document.querySelector(\`button[data-menu="\${name}"]\`);
                assert(btn, \`主選單按鈕 \${name} 必須存在\`);
                btn.click();
                const parent = btn.closest('.menu-dropdown');
                assert(parent.classList.contains('open'), \`選單 \${name} 點擊後應帶有 .open 樣式\`);
                
                // 確認其他選單處於關閉狀態
                menuNames.forEach(other => {
                  if (other !== name) {
                    const otherBtn = document.querySelector(\`button[data-menu="\${other}"]\`);
                    const otherParent = otherBtn.closest('.menu-dropdown');
                    assert(!otherParent.classList.contains('open'), \`選單 \${other} 應保持關閉\`);
                  }
                });
              }

              // 點擊空白處關閉所有選單
              document.body.click();
              menuNames.forEach(name => {
                const btn = document.querySelector(\`button[data-menu="\${name}"]\`);
                const parent = btn.closest('.menu-dropdown');
                assert(!parent.classList.contains('open'), \`點擊空白處後選單 \${name} 應關閉\`);
              });
            }
          },
          {
            name: '1.2 File 選單項目動作觸發 (AddPhotos, AddFolder, Export, Sidecar, History, Clear)',
            fn: async () => {
              // spy on file inputs
              let fileInputClicked = false;
              const fileInput = document.getElementById('fileInput');
              const origFileClick = fileInput.click;
              fileInput.click = () => { fileInputClicked = true; };

              document.getElementById('menuItemAddPhotos').click();
              assert(fileInputClicked, 'menuItemAddPhotos 應觸發 fileInput.click');
              fileInput.click = origFileClick;

              let folderInputClicked = false;
              const folderInput = document.getElementById('folderInput');
              const origFolderClick = folderInput.click;
              folderInput.click = () => { folderInputClicked = true; };

              document.getElementById('menuItemAddFolder').click();
              assert(folderInputClicked, 'menuItemAddFolder 應觸發 folderInput.click');
              folderInput.click = origFolderClick;

              let exportFolderClicked = false;
              const expFolderBtn = document.getElementById('exportToFolderBtn');
              const origExpFolderClick = expFolderBtn.click;
              expFolderBtn.click = () => { exportFolderClicked = true; };

              document.getElementById('menuItemExportFolder').click();
              assert(exportFolderClicked, 'menuItemExportFolder 應觸發 exportToFolderBtn.click');
              expFolderBtn.click = origExpFolderClick;

              let exportZipClicked = false;
              const expZipBtn = document.getElementById('exportAllZipBtn');
              const origExpZipClick = expZipBtn.click;
              expZipBtn.click = () => { exportZipClicked = true; };

              document.getElementById('menuItemExportZip').click();
              assert(exportZipClicked, 'menuItemExportZip 應觸發 exportAllZipBtn.click');
              expZipBtn.click = origExpZipClick;

              // Export Sidecar with no photos -> should show safe toast
              document.getElementById('menuItemExportSidecar').click();
              const toastMsg = document.getElementById('safeToastMsg');
              assert(toastMsg && toastMsg.textContent.length > 0, 'menuItemExportSidecar 應有響應訊息');

              // History item -> opens historyModal
              document.getElementById('menuItemHistory').click();
              const historyModal = document.getElementById('historyModal');
              assert(historyModal.style.display === 'flex', 'menuItemHistory 應開啟 historyModal');
              // 關閉它
              document.getElementById('closeHistoryModalBtn').click();
              assert(historyModal.style.display === 'none', '關閉 historyModal');

              // Clear Session item
              document.getElementById('menuItemClearSession').click();
            }
          },
          {
            name: '1.3 Edit 選單項目動作觸發 (Deduplicate, DeletePhoto, ClearRegions)',
            fn: async () => {
              // Deduplicate -> opens duplicateModal
              document.getElementById('menuItemDeduplicate').click();
              const dupModal = document.getElementById('duplicateModal');
              assert(dupModal.style.display === 'flex' || dupModal.classList.contains('visible'), 'menuItemDeduplicate 應開啟 duplicateModal');
              document.getElementById('closeDuplicateModalBtn').click();
              assert(dupModal.style.display === 'none' && !dupModal.classList.contains('visible'), '關閉 duplicateModal');

              // ClearRegions -> 執行無異常
              document.getElementById('menuItemClearRegions').click();
              // DeletePhoto -> 執行無異常
              document.getElementById('menuItemDeletePhoto').click();
            }
          },
          {
            name: '1.4 View 選單項目動作觸發 (PrevPhoto, NextPhoto, ToggleSnap)',
            fn: async () => {
              // ToggleSnap -> 切換 smartSnapToggle
              const snapToggle = document.getElementById('smartSnapToggle');
              const initialSnap = snapToggle.checked;
              document.getElementById('menuItemToggleSnap').click();
              assert(snapToggle.checked !== initialSnap, 'menuItemToggleSnap 應翻轉 smartSnapToggle 狀態');
              document.getElementById('menuItemToggleSnap').click();
              assert(snapToggle.checked === initialSnap, '再次點擊恢復狀態');

              // Prev/Next photo
              document.getElementById('menuItemPrevPhoto').click();
              document.getElementById('menuItemNextPhoto').click();
            }
          },
          {
            name: '1.5 AI 識別選單項目動作觸發 (DetectSingle, DetectBatch, ToggleAutoImport, AiSettings)',
            fn: async () => {
              // DetectSingle / DetectBatch
              document.getElementById('menuItemDetectSingle').click();
              document.getElementById('menuItemDetectBatch').click();

              const autoToggle = document.getElementById('autoDetectOnImportToggle');
              const initAuto = autoToggle.checked;
              document.getElementById('menuItemToggleAutoImport').click();
              assert(autoToggle.checked !== initAuto, 'menuItemToggleAutoImport 應翻轉 autoDetectOnImportToggle 狀態');
              document.getElementById('menuItemToggleAutoImport').click();
              assert(autoToggle.checked === initAuto, '再次點擊恢復狀態');

              // AiSettings -> opens aiSettingsModal
              document.getElementById('menuItemAiSettings').click();
              const aiModal = document.getElementById('aiSettingsModal');
              assert(aiModal.style.display === 'flex', 'menuItemAiSettings 應開啟 aiSettingsModal');
              document.getElementById('closeAiSettingsModalBtn').click();
              assert(aiModal.style.display === 'none', '關閉 aiSettingsModal');
            }
          },
          {
            name: '1.6 Settings & Help 選單項目動作觸發 (License, Shortcuts, Guide, About, Gemini Modal)',
            fn: async () => {
              // License -> licenseModal
              document.getElementById('menuItemOpenLicense').click();
              const licModal = document.getElementById('licenseModal');
              assert(licModal.style.display === 'flex' && licModal.classList.contains('visible'), 'menuItemOpenLicense 應開啟 licenseModal');
              document.getElementById('closeLicenseModalBtn').click();
              assert(licModal.style.display === 'none' && !licModal.classList.contains('visible'), '關閉 licenseModal');

              // Shortcuts -> shortcutsModal
              document.getElementById('menuItemShortcuts').click();
              const scModal = document.getElementById('shortcutsModal');
              assert(scModal.style.display === 'flex' && scModal.classList.contains('visible'), 'menuItemShortcuts 應開啟 shortcutsModal');
              document.getElementById('closeShortcutsModalBtn').click();
              assert(scModal.style.display === 'none' && !scModal.classList.contains('visible'), '關閉 shortcutsModal');

              // Settings menu Shortcuts Setting
              document.getElementById('menuItemShortcutsSetting').click();
              document.getElementById('closeShortcutsModalBtn').click();

              // Settings menu Open AI Modal
              document.getElementById('menuItemOpenAiModal').click();
              document.getElementById('closeAiSettingsModalBtn').click();

              // Guide -> userGuideModal
              document.getElementById('menuItemGuide').click();
              const guideModal = document.getElementById('userGuideModal');
              assert(guideModal.style.display === 'flex' && guideModal.classList.contains('visible'), 'menuItemGuide 應開啟 userGuideModal');
              document.getElementById('closeUserGuideModalBtn').click();
              assert(guideModal.style.display === 'none' && !guideModal.classList.contains('visible'), '關閉 userGuideModal');

              // About -> aboutModal
              document.getElementById('menuItemAbout').click();
              const aboutModal = document.getElementById('aboutModal');
              assert(aboutModal.style.display === 'flex' && aboutModal.classList.contains('visible'), 'menuItemAbout 應開啟 aboutModal');
              document.getElementById('closeAboutModalBtn').click();
              assert(aboutModal.style.display === 'none' && !aboutModal.classList.contains('visible'), '關閉 aboutModal');
            }
          }
        ]);


        // ══════════════════════════════════════════════════════════
        // 模組 2: 6 大全域彈窗測試（開關、ESC關閉、遮罩防殘留）
        // ══════════════════════════════════════════════════════════
        const targetModals = [
          {
            name: '商業授權管理彈窗 (licenseModal)',
            modalId: 'licenseModal',
            openFn: () => document.getElementById('menuItemOpenLicense').click(),
            closeBtnId: 'closeLicenseModalBtn'
          },
          {
            name: 'Gemini AI 設定彈窗 (aiSettingsModal)',
            modalId: 'aiSettingsModal',
            openFn: () => document.getElementById('menuItemAiSettings').click(),
            closeBtnId: 'closeAiSettingsModalBtn'
          },
          {
            name: '快捷鍵指南彈窗 (shortcutsModal)',
            modalId: 'shortcutsModal',
            openFn: () => document.getElementById('menuItemShortcuts').click(),
            closeBtnId: 'closeShortcutsModalBtn'
          },
          {
            name: '歷史工作階段彈窗 (historyModal)',
            modalId: 'historyModal',
            openFn: () => document.getElementById('menuItemHistory').click(),
            closeBtnId: 'closeHistoryModalBtn'
          },
          {
            name: '官方使用手冊彈窗 (userGuideModal)',
            modalId: 'userGuideModal',
            openFn: () => document.getElementById('menuItemGuide').click(),
            closeBtnId: 'closeUserGuideModalBtn'
          },
          {
            name: '關於軟體彈窗 (aboutModal)',
            modalId: 'aboutModal',
            openFn: () => document.getElementById('menuItemAbout').click(),
            closeBtnId: 'closeAboutModalBtn'
          },
          {
            name: '法律條款與隱私聲明彈窗 (legalModal)',
            modalId: 'legalModal',
            openFn: () => {
              const el = document.getElementById('legalModal');
              el.style.display = 'flex';
              el.classList.add('visible');
            },
            closeBtnId: 'closeLegalModalBtn'
          }
        ];

        const modalTests = [];
        for (const m of targetModals) {
          modalTests.push({
            name: \`2. 彈窗實測: \${m.name} [開啟 / 關閉按鈕 / ESC關閉 / 遮罩校驗]\`,
            fn: async () => {
              const modalEl = document.getElementById(m.modalId);
              assert(modalEl, \`彈窗 \${m.modalId} 必須存在於 DOM 中\`);

              // 1. 開啟測試
              m.openFn();
              await new Promise(r => setTimeout(r, 50));
              const isDisplayFlex = window.getComputedStyle(modalEl).display !== 'none';
              assert(isDisplayFlex, \`彈窗 \${m.modalId} 開啟後 display 應非 none\`);

              // 2. 點擊自帶關閉按鈕
              const closeBtn = document.getElementById(m.closeBtnId);
              assert(closeBtn, \`關閉按鈕 \${m.closeBtnId} 必須存在\`);
              closeBtn.click();
              await new Promise(r => setTimeout(r, 50));
              const isClosedByBtn = window.getComputedStyle(modalEl).display === 'none';
              assert(isClosedByBtn, \`點擊關閉按鈕後 \${m.modalId} display 應為 none\`);

              // 3. 再次開啟，測試 ESC 鍵關閉
              m.openFn();
              await new Promise(r => setTimeout(r, 50));
              assert(window.getComputedStyle(modalEl).display !== 'none', \`再次開啟 \${m.modalId} 成功\`);

              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              const isClosedByEsc = window.getComputedStyle(modalEl).display === 'none';
              assert(isClosedByEsc, \`按下 ESC 鍵後 \${m.modalId} 應被關閉\`);
            }
          });
        }

        modalTests.push({
          name: '2.7 全域彈窗遮罩防殘留驗收 (無殘留 backdrop / 遮罩)',
          fn: async () => {
            // 遍歷所有已知彈窗容器
            const allModalIds = [
              'licenseModal', 'freemiumModal', 'aiSettingsModal',
              'shortcutsModal', 'duplicateModal', 'exportReviewModal',
              'historyModal', 'userGuideModal', 'aboutModal', 'cropInspectorModal'
            ];
            for (const id of allModalIds) {
              const el = document.getElementById(id);
              if (el) {
                const style = window.getComputedStyle(el);
                assert(style.display === 'none', \`彈窗 \${id} 當前狀態應為 display:none，不得有殘留遮罩阻擋頁面\`);
              }
            }
          }
        });

        await runSuite('模組 2: 6 大全域彈窗開關、ESC 與遮罩防殘留', modalTests);


        // ══════════════════════════════════════════════════════════
        // 模組 3: 7 國語言即時切換與零漏譯實測
        // ══════════════════════════════════════════════════════════
        const targetLangs = [
          { code: 'zh-TW', name: '繁體中文' },
          { code: 'zh-CN', name: '简体中文' },
          { code: 'en',    name: 'English' },
          { code: 'ja',    name: '日本語' },
          { code: 'de',    name: 'Deutsch' },
          { code: 'fr',    name: 'Français' },
          { code: 'es',    name: 'Español' }
        ];

        const langTests = [];
        for (const lang of targetLangs) {
          langTests.push({
            name: \`3. 語言切換實測: \${lang.name} (\${lang.code})\`,
            fn: async () => {
              const i18n = window.I18n || window.i18n;
              assert(i18n, 'I18n 引擎必須就緒');

              // 切換語言
              i18n.setLanguage(lang.code);
              await new Promise(r => setTimeout(r, 60));

              // 檢查 localStorage 持久化 (支援 photoautocrop_locale 或 photoautocrop_lang)
              const savedLang = localStorage.getItem('photoautocrop_locale') || localStorage.getItem('photoautocrop_lang');
              assert(savedLang === lang.code, 'localStorage 應記錄該語言');

              // 檢查頂部語言選單顯示標籤
              const currentLangLabel = document.getElementById('currentLangLabel');
              if (currentLangLabel) {
                assert(currentLangLabel.textContent.trim() === lang.name, \`currentLangLabel 應顯示 \${lang.name}\`);
              }

              // 檢查所有 data-i18n 元素
              const i18nEls = document.querySelectorAll('[data-i18n]');
              let missingKeys = [];
              i18nEls.forEach(el => {
                const key = el.getAttribute('data-i18n');
                const text = el.textContent.trim();
                // 如果文字為空，或者是 key 本身，或者是 undefined，則代表漏譯
                if (!text || text === key || text === 'undefined') {
                  missingKeys.push(key);
                }
              });

              assert(missingKeys.length === 0, \`語言 \${lang.code} 存在 \${missingKeys.length} 個漏譯 key: \${missingKeys.slice(0, 5).join(', ')}\`);
            }
          });
        }

        await runSuite('模組 3: 7 國語言切換與 DOM 元素無漏譯驗收', langTests);


        // ══════════════════════════════════════════════════════════
        // 模組 4: 全域快捷鍵響應實測 (Del, Ctrl+Z, Ctrl+E, R, X, ?, [, ], Esc)
        // ══════════════════════════════════════════════════════════
        await runSuite('模組 4: 全域快捷鍵響應實測', [
          {
            name: '4.1 快捷鍵指南呼叫與關閉 (? / Esc)',
            fn: async () => {
              const scModal = document.getElementById('shortcutsModal');
              // 發送 '?' 鍵
              window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', code: 'Slash', shiftKey: true, bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(window.getComputedStyle(scModal).display !== 'none', '按下 ? 鍵應開啟快捷鍵彈窗');

              // 按下 Esc 鍵關閉
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(window.getComputedStyle(scModal).display === 'none', '按下 Escape 鍵應關閉快捷鍵彈窗');
            }
          },
          {
            name: '4.2 批次匯出快捷鍵 (Ctrl+E)',
            fn: async () => {
              let exportClicked = false;
              const expBtn = document.getElementById('exportAllZipBtn');
              const origClick = expBtn.click;
              expBtn.click = () => { exportClicked = true; };

              // 發送 Ctrl+E 快捷鍵
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', ctrlKey: true, bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(exportClicked, '按下 Ctrl+E 應觸發 exportAllZipBtn.click');
              expBtn.click = origClick;
            }
          },
          {
            name: '4.3 裁切框操作快捷鍵: Delete(刪除) -> Ctrl+Z(復原) -> X(重做)',
            fn: async () => {
              // 建立真正的 HTMLImageElement 避免 drawImage 報錯
              const realImg = new Image();
              realImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
              await new Promise(res => { realImg.onload = res; realImg.onerror = res; });

              const mockPhotos = [
                {
                  id: 'p_test_1',
                  name: 'test_photo_1.jpg',
                  width: 1000,
                  height: 800,
                  imageObj: realImg,
                  fileBlob: new Blob([''], { type: 'image/jpeg' }),
                  regions: [
                    {
                      id: 'r_test_1',
                      subIndex: 1,
                      outputName: 'test_photo_1_1.jpg',
                      status: 'approved',
                      rotation: 0,
                      corners: [
                        { x: 100, y: 100 },
                        { x: 400, y: 100 },
                        { x: 400, y: 400 },
                        { x: 100, y: 400 }
                      ]
                    }
                  ]
                }
              ];
              if (window.setPhotos) window.setPhotos(mockPhotos);
              else window.photos = mockPhotos;
              window.activePhotoIdx = 0;

              // 將真實圖片載入 annotator
              if (window.annotator) {
                window.annotator.loadImage(realImg, mockPhotos[0].regions, 'r_test_1');
                window.annotator.activeRegionId = 'r_test_1';
              }

              assert(window.annotator.regions.length === 1, '前置條件：應有 1 個裁切框');

              // 1. 按 Delete 鍵刪除選中的裁切框
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', code: 'Delete', bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(window.annotator.regions.length === 0, '按下 Delete 鍵後裁切框應被移除');

              // 2. 按 Ctrl+Z 鍵復原
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(window.annotator.regions.length === 1, '按下 Ctrl+Z 鍵後裁切框應成功復原');

              // 3. 按 X 鍵重做 (Redo)
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(window.annotator.regions.length === 0, '按下 X 鍵後應重做刪除動作');

              // 再按一次 Ctrl+Z 恢復供後續測試
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(window.annotator.regions.length === 1, '恢復裁切框');
            }
          },
          {
            name: '4.4 順時針 90 度旋轉快捷鍵 (R)',
            fn: async () => {
              let rotateClicked = false;
              const rotateBtn = document.getElementById('actRotateBtn');
              const origClick = rotateBtn.click;
              rotateBtn.click = () => { rotateClicked = true; };

              // 發送 R 快捷鍵
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(rotateClicked, '按下 R 鍵應觸發 actRotateBtn.click (90°旋轉)');
              rotateBtn.click = origClick;
            }
          },
          {
            name: '4.5 上一張與下一張相片切換快捷鍵 ([ / ])',
            fn: async () => {
              // 注入包含 2 張相片的陣列
              const twoPhotos = [
                { id: 'p_test_1', name: 'test_photo_1.jpg', width: 1000, height: 800, regions: [] },
                { id: 'p_test_2', name: 'test_photo_2.jpg', width: 1000, height: 800, regions: [] }
              ];
              if (window.setPhotos) window.setPhotos(twoPhotos);
              else window.photos = twoPhotos;
              window.activePhotoIdx = 0;

              assert(window.activePhotoIdx === 0, '當前應在相片 0');

              // 按 ']' 切換到下一張
              window.dispatchEvent(new KeyboardEvent('keydown', { key: ']', code: 'BracketRight', bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(window.activePhotoIdx === 1, '按下 ] 鍵應切換至下一張相片 (Index 1)');

              // 按 '[' 切換到上一張
              window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', code: 'BracketLeft', bubbles: true }));
              await new Promise(r => setTimeout(r, 50));
              assert(window.activePhotoIdx === 0, '按下 [ 鍵應切換回上一張相片 (Index 0)');
            }
          }
        ]);


        // ══════════════════════════════════════════════════════════
        // 模組 5: 全域頂部按鈕、工具列按鈕與彈窗交互按鈕覆蓋實測
        // ══════════════════════════════════════════════════════════
        await runSuite('模組 5: 全域頂部按鈕、工具列按鈕與彈窗交互按鈕覆蓋實測', [
          {
            name: '5.1 頂部工具列按鈕 (Theme, Lang, AI, Pro, Upload, Zoom, Actions)',
            fn: async () => {
              // 1. themeToggleBtn
              const themeBtn = document.getElementById('themeToggleBtn');
              assert(themeBtn, 'themeToggleBtn 應存在');
              themeBtn.click();
              themeBtn.click(); // toggle back

              // 2. langToggleBtn
              const langBtn = document.getElementById('langToggleBtn');
              assert(langBtn, 'langToggleBtn 應存在');
              langBtn.click();
              document.body.click(); // close lang menu

              // 3. openAiSettingsBtn
              const openAiBtn = document.getElementById('openAiSettingsBtn');
              assert(openAiBtn, 'openAiSettingsBtn 應存在');
              openAiBtn.click();
              const cancelAiBtn = document.getElementById('cancelAiSettingsBtn');
              assert(cancelAiBtn, 'cancelAiSettingsBtn 應存在');
              cancelAiBtn.click();

              // 4. proStatusBtn
              const proBtn = document.getElementById('proStatusBtn');
              assert(proBtn, 'proStatusBtn 應存在');
              proBtn.click();
              const cancelLicBtn = document.getElementById('cancelLicenseBtn');
              assert(cancelLicBtn, 'cancelLicenseBtn 應存在');
              cancelLicBtn.click();

              // 5. uploadMoreBtn
              let uploadClicked = false;
              const fileInput = document.getElementById('fileInput');
              const origFileClick = fileInput.click;
              fileInput.click = () => { uploadClicked = true; };
              document.getElementById('uploadMoreBtn').click();
              assert(uploadClicked, 'uploadMoreBtn 應觸發 fileInput.click');
              fileInput.click = origFileClick;

              // 6. Resume & Discard session buttons
              const resumeBtn = document.getElementById('resumeBtn');
              const discardSessionBtn = document.getElementById('discardSessionBtn');
              assert(resumeBtn && discardSessionBtn, '斷點續做橫條按鈕應存在');

              // 7. Preview Zoom buttons
              const zoomIn = document.getElementById('previewZoomInBtn');
              const zoomOut = document.getElementById('previewZoomOutBtn');
              const zoomReset = document.getElementById('previewZoomResetBtn');
              assert(zoomIn && zoomOut && zoomReset, '預覽縮放控制按鈕應存在');
              zoomIn.click();
              zoomOut.click();
              zoomReset.click();

              // 8. 畫布導航與辨識按鈕
              const prevPhotoBtn = document.getElementById('prevPhotoBtn');
              const nextPhotoBtn = document.getElementById('nextPhotoBtn');
              const detectSingleBtn = document.getElementById('detectSingleBtn');
              const detectBatchBtn = document.getElementById('detectBatchBtn');
              const deleteCurrentPhotoBtn = document.getElementById('deleteCurrentPhotoBtn');
              assert(prevPhotoBtn && nextPhotoBtn && detectSingleBtn && detectBatchBtn && deleteCurrentPhotoBtn, '畫布導航與動作按鈕應存在');
              prevPhotoBtn.click();
              nextPhotoBtn.click();

              // 9. Batch control buttons
              const batchPauseBtn = document.getElementById('batchPauseBtn');
              const batchStopBtn = document.getElementById('batchStopBtn');
              const aiDetectCancelBtn = document.getElementById('aiDetectCancelBtn');
              assert(batchPauseBtn && batchStopBtn && aiDetectCancelBtn, '批次控制按鈕應存在');

              // 10. Action buttons
              const actApproveBtn = document.getElementById('actApproveBtn');
              const actRotateBtn = document.getElementById('actRotateBtn');
              const actDeleteBtn = document.getElementById('actDeleteBtn');
              assert(actApproveBtn && actRotateBtn && actDeleteBtn, '裁切框動作按鈕應存在');

              // 11. Dropzone & Hidden Compatibility buttons
              const pickFilesBtn = document.getElementById('pickFilesBtn');
              const pickFolderBtn = document.getElementById('pickFolderBtn');
              assert(pickFilesBtn && pickFolderBtn, '初始拖放區選擇按鈕應存在');

              const openShortcutsBtn = document.getElementById('openShortcutsBtn');
              const openDuplicateModalBtn = document.getElementById('openDuplicateModalBtn');
              const openHistoryModalBtn = document.getElementById('openHistoryModalBtn');
              assert(openShortcutsBtn && openDuplicateModalBtn && openHistoryModalBtn, '相容性隱藏觸發按鈕應存在');
            }
          },
          {
            name: '5.2 檢驗器 (Crop Inspector) 與各彈窗操作按鈕覆蓋',
            fn: async () => {
              // 1. Crop Inspector Controls
              const openInspBtn = document.getElementById('openInspectModalBtn');
              assert(openInspBtn, 'openInspectModalBtn 應存在');
              // 測試各角點與檢驗器縮放按鈕
              const cornerBtns = ['inspCorner0Btn', 'inspCorner1Btn', 'inspCorner2Btn', 'inspCorner3Btn', 'inspCornerFitBtn'];
              cornerBtns.forEach(id => {
                const btn = document.getElementById(id);
                assert(btn, id + ' 應存在於檢驗器');
                btn.click();
              });
              const zoomInspBtns = ['inspZoomInBtn', 'inspZoomOutBtn', 'inspZoom100Btn', 'inspEdgeContrastToggle', 'inspConfirmBtn', 'closeCropInspectorBtn'];
              zoomInspBtns.forEach(id => {
                const btn = document.getElementById(id);
                assert(btn, id + ' 應存在於檢驗器');
              });

              // 2. AI Settings Modal buttons
              const toggleKeyBtn = document.getElementById('toggleApiKeyVisibilityBtn');
              const testGemBtn = document.getElementById('testGeminiBtn');
              const saveAiBtn = document.getElementById('saveAiSettingsBtn');
              assert(toggleKeyBtn && testGemBtn && saveAiBtn, 'AI 設定彈窗按鈕應存在');
              toggleKeyBtn.click();

              // 3. License Modal submit button
              const submitLicBtn = document.getElementById('submitLicenseBtn');
              assert(submitLicBtn, 'submitLicenseBtn 應存在');

              // 4. Freemium Modal buttons
              const closeFreeBtn = document.getElementById('closeFreemiumModalBtn');
              const freeBuyBtn = document.getElementById('freemiumBuyBtn');
              const freeEnterKeyBtn = document.getElementById('freemiumEnterKeyBtn');
              const freeExportSampleBtn = document.getElementById('freemiumExportSampleBtn');
              assert(closeFreeBtn && freeBuyBtn && freeEnterKeyBtn && freeExportSampleBtn, 'Freemium 彈窗按鈕應存在');

              // 5. Shortcuts Modal buttons
              const resetScBtn = document.getElementById('resetShortcutsBtn');
              const confirmScBtn = document.getElementById('confirmShortcutsModalBtn');
              assert(resetScBtn && confirmScBtn, '快捷鍵彈窗動作按鈕應存在');

              // 6. Duplicate Modal buttons
              const rescanDupBtn = document.getElementById('rescanDuplicateBtn');
              const autoCleanDupBtn = document.getElementById('autoCleanDuplicatesBtn');
              const cancelDupBtn = document.getElementById('cancelDuplicateModalBtn');
              assert(rescanDupBtn && autoCleanDupBtn && cancelDupBtn, '查重彈窗按鈕應存在');

              // 7. Export Review Modal buttons
              const closeExpReviewBtn = document.getElementById('closeExportReviewModalBtn');
              const rotateAllGalleryBtn = document.getElementById('rotateAllGalleryBtn');
              const cancelExpReviewBtn = document.getElementById('cancelExportReviewBtn');
              const confirmFinalExpBtn = document.getElementById('confirmFinalExportBtn');
              assert(closeExpReviewBtn && rotateAllGalleryBtn && cancelExpReviewBtn && confirmFinalExpBtn, '匯出審查彈窗按鈕應存在');

              // 8. History Modal footer buttons
              const manualSnapBtn = document.getElementById('manualSnapshotBtn');
              const closeHistoryFooterBtn = document.getElementById('closeHistoryModalFooterBtn');
              assert(manualSnapBtn && closeHistoryFooterBtn, '歷史彈窗按鈕應存在');

              // 9. User Guide Modal buttons
              const guideScBtn = document.getElementById('guideOpenShortcutsBtn');
              const guideAddBtn = document.getElementById('guideAddPhotosBtn');
              const confirmGuideBtn = document.getElementById('confirmUserGuideModalBtn');
              assert(guideScBtn && guideAddBtn && confirmGuideBtn, '使用手冊彈窗按鈕應存在');

              // 10. About & Legal Modal buttons
              const aboutLicBtn = document.getElementById('aboutManageLicenseBtn');
              const closeAboutFooterBtn = document.getElementById('closeAboutModalFooterBtn');
              const closeLegalFooterBtn = document.getElementById('closeLegalModalFooterBtn');
              assert(aboutLicBtn && closeAboutFooterBtn && closeLegalFooterBtn, '關於與條款彈窗按鈕應存在');
            }
          }
        ]);

        return results;
      })();
    `);

    fs.writeFileSync(path.join(__dirname, 'ui-test-report.json'), JSON.stringify(testResults, null, 2));

    console.log('\n======================================================');
    console.log('              UI 功能自動化實測結果統計               ');
    console.log('======================================================');
    console.log(`總測試項目數: ${testResults.passed + testResults.failed}`);
    console.log(`通過 (PASS) : ${testResults.passed}`);
    console.log(`失敗 (FAIL) : ${testResults.failed}`);
    console.log('======================================================\n');

    if (testResults.failed > 0) {
      console.error('實測中存在失敗項目:');
      testResults.suites.forEach(s => {
        s.items.filter(it => it.status === 'FAIL').forEach(it => {
          console.error(`- [${s.name}] ${it.name}: ${it.error}`);
        });
      });
      process.exit(1);
    } else {
      console.log('🎉 所有 UI 介面功能（選單、彈窗、多語言、快捷鍵）實測 100% 全部通過！');
      process.exit(0);
    }

  } catch (err) {
    console.error('[UI Test] 測試執行發生重大錯誤:', err);
    process.exit(1);
  }
});
