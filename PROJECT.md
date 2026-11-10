# Project: PhotoAutoCrop Pro — Commercial ISV Global Release

## Architecture
- **Desktop Shell**: Electron (`main.js`, `preload.js`, dynamic loopback port)
- **Local Server**: Node.js microservice (`server.js`, 127.0.0.1, Gumroad license verification, 30-day offline cache)
- **Image Processing Engine**: 100% Offline OpenCV WebAssembly (`libs/opencv.js`, `js/detector.js`, Zero-Cloud Leak)
- **Frontend Workbench**: Single-page studio (`index.html`, `style.css`, `js/i18n.js`)
- **Packaging Pipeline**: electron-builder (NSIS Setup.exe, Portable.exe, macOS DMG/ZIP arm64 & x64, code obfuscation via `scripts/build-protected.js`)

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 1 | Gumroad Market & Competitor Analysis | In-depth analysis of anti-subscription & privacy sentiment, comparison matrix with Topaz/DxO/VueScan | M1 | DONE |
| 2 | 4 ICP Personas & Pain Point Mapping | Detailed profiles for Robert, Evelyn, Jessica, Marcus with feature-pain mapping | M1 | DONE |
| 3 | Tiered Pricing & Launch Strategy | Standard $19 / Pro $39 (regular $49) with EARLY100 discount & 30-day refund guarantee | M1 | DONE |
| 4 | English-First Default & i18n Symmetry | Set default locale to English, eliminate hardcoded Chinese strings, keep 100% symmetric 7 languages | M2 | DONE |
| 5 | Optical Dark Aesthetic & Pro Styling | Minimalist monochrome styling, refined controls matching Topaz/Capture One pro standard | M2 | DONE |
| 6 | Native Window & Dialog English-First | Update main.js window title and native dialog strings to English with locale awareness | M2 | DONE |
| 7 | Professional English User Documentation | English manuals (`USER_MANUAL.md`, `INSTALLATION_GUIDE.md`, `TROUBLESHOOTING_FAQ.md`, `START_HERE.html`) | M3 | DONE |
| 8 | Modern Dual Installer & Release Bundle | Dual Windows executables (`Setup.exe` + `Portable.exe`), single ZIP bundle with `SHA256_CHECKSUMS.txt` | M3 | DONE |
| 9 | High-Converting Gumroad Sales Copy | English sales page copy with value proposition, tier comparison, 001/002 graphics, and FAQ | M4 | DONE |
| 10 | Gumroad Visual Marketing Assets | Hero cover (1280x720), thumbnail (600x600), feature graphics rendered from `001.png` & `002.png` | M4 | DONE |
| 11 | BDD Automated Test Suite Verification | Ensure 100% pass across 41 BDD scenarios in `test/qa-bdd-test-suite.js` (41/41 Passing) | M5 | DONE |
| 12 | Zero-Cloud Leak & Privacy Audit | Verify 100% offline local processing without any network exfiltration of photos or data | M5 | DONE |
| 13 | Commercial Release Checklist & Notion Sync | Formal ISV compliance checklist and full Notion synchronization to target workspace page | M5 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Commercial & Market Strategy (Phase 1) | Market research report, competitor matrix, 4 ICP profiles, pricing strategy | none | DONE |
| M2 | English-First UI/UX & Optical Aesthetic (Phase 2) | English-first default, clean remaining hardcoded strings, 620+ i18n keys | M1 | DONE |
| M3 | Professional Packaging & Documentation (Phase 3) | English user manuals, bilingual interactive start guide, dual installers | M2 | DONE |
| M4 | Gumroad Sales Copy & Visual Marketing Assets (Phase 4) | English sales copy, 5 official assets based on `001.png` & `002.png` | M1, M2 | DONE |
| M5 | Full BDD Verification & Release Compliance (Phase 5) | Automated BDD suite 100% pass (41/41), Notion whitepaper update | M2, M3, M4 | DONE |

## Standard Directory Layout
```text
PhotoAutoCrop-Pro/
├── START_APP.bat                    # Windows 一鍵啟動捷徑 (自動開啟瀏覽器)
├── START_HERE.html                  # 現代交互式開箱導覽 (English-First + 多語言切換)
├── docs/                            # 雙語官方使用手冊與技術指南庫 (USER_MANUAL, INSTALLATION, FAQ)
├── features/                        # Gherkin BDD 行為功能規格特徵檔 (.feature)
├── marketing/                       # Gumroad 上架文案、白皮書、市場調研與 001/002 行銷資產
├── samples/                         # 實體相片測試庫 (含老照片、拍立得、相簿翻拍照)
├── output/                          # 批次成品匯出工作區
├── tools/                           # 內部工具集 (admin: 商業控制台, benchmark: 效能評測)
├── build/                           # 應用程式多尺寸圖示資產 (.ico, .icns, .png)
├── dist/                            # 打包發行產物存放區 (Setup.exe, Portable.exe, Bundle.zip)
├── js/                              # 前端核心演算法庫 (detector, smart_snap, layout_memory, i18n)
├── libs/                            # 離線高效能第三方庫 (OpenCV WASM, libheif, pico.js)
├── scripts/                         # 自動化工具腳本 (打包、混淆保護、行銷圖渲染)
├── test/                            # 41 項 BDD 自動化驗收與壓力測試套件
├── index.html                       # 主工作台應用程式介面
├── style.css                        # 現代暗黑玻璃擬態樣式系統
├── main.js                          # Electron 桌面主進程
├── server.js                        # 本地安全伺服器與 Gumroad 授權微服務
├── AGENTS.md                        # AI Agent 專案協作準則與 BDD 規範
├── LICENSE.md                       # 商業軟體終端用戶授權合約 (EULA)
├── PRIVACY.md                       # 隱私保護承諾書 (100% Zero-Cloud Leak)
├── CHANGELOG.md                     # 版本更新歷程紀錄
└── README.md                        # 專案首頁說明文檔
```
