# PhotoAutoCrop Pro — 實體老相簿翻拍與多照片批次自動拉平裁切工作台

> **Desktop Pro Edition • Commercial Release v1.0.0**  
> 專為智慧型手機翻拍實體老相簿、拍立得與珍貴歷史記憶數位化設計的**全自動多照片辨識、透視拉平與批次裁切桌面工作台**。  
> 支援一次翻拍整頁相簿（包含多張照片），系統在 1 秒內自動將每張照片分割開來、消除手機俯拍視角的梯形透視變形、自動擺正朝向並注入專業 300 DPI 印刷標籤！

[![Release](https://img.shields.io/badge/Release-v1.0.0-emerald.svg)](https://gumroad.com/l/photocrop-pro)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Zero--Cloud-blue.svg)](PRIVACY.md)
[![License](https://img.shields.io/badge/License-Commercial%20EULA-orange.svg)](LICENSE.md)
[![Docs](https://img.shields.io/badge/Docs-User%20Manual-purple.svg)](docs/USER_MANUAL.md)
[![BDD Tests](https://img.shields.io/badge/BDD%20Tests-41%2F41%20Passing-brightgreen.svg)](test/qa-bdd-test-suite.js)

---

## 🌟 6 大真實核心技術特色 (Groundbreaking Features)

1. **🛡️ 100% Zero-Cloud Leak 純本機離線隱私安全**
   * 採用純前端 WebAssembly 與本機高效能演算法，所有照片運算 100% 消耗您電腦的本地 CPU/RAM，**照片絕不會上傳到任何外部伺服器，即使拔掉網路線亦可完整運作**。無遙測追蹤（Zero Telemetry）。
2. **⚡ iPhone 原生 HEIC / HEIF 免轉檔直接拖入**
   * 內建 WebAssembly 離線 HEIC 轉碼通道，徹底解決 Windows 電腦打不開 iPhone 翻拍檔的痛點，整批拖入即刻於前端記憶體中解碼。
3. **🖨️ 沖印級 300 DPI 標籤無損注入與 EXIF 拍攝時間戳保留**
   * 匯出時自動在 JPEG 二進位標頭寫入 JFIF APP0 300 DPI 密度標記，重設 Orientation 為 1（Normal），並無損保留原始 EXIF 拍攝中繼資料，隨時可送專業相館沖印。
4. **🔍 Corner Patrol 1:1 像素巡檢 × 局部 3X 放大鏡 × 智慧磁吸**
   * 全螢幕 1:1 Actual Pixel 4 角同步檢驗面板，配備 Edge Highlight 高光去黑邊；拖曳錨點時自動浮現 3 倍光學顯微放大鏡，靠近邊緣自動產生磁吸效果。
5. **📖 相簿版型記憶引擎 (Layout Memory) 與反光碎框自動癒合**
   * 翻拍整本相簿時，系統自動學習相片幾何先驗，一鍵套用整本相簿版型；更能看穿透明保護套之刺眼反光，將碎框自動「癒合」為完整照片。
6. **💾 跨電腦隨身專案進度檔 (.pacproj) 與 50 步歷史復原**
   * 支援 IndexedDB 即時防斷電快取，並支援匯出 `.pacproj` 隨身專案檔。進度裝進隨身碟，換到筆電或桌機一秒還原所有裁切框與工作狀態。
7. **🌐 English-First 國際化與 7 國語言即時切換**
   * 預設採用國際專業英文工程語料，並支援繁體中文 (zh-TW)、簡體中文 (zh-CN)、日本語 (ja)、Deutsch (de)、Français (fr)、Español (es)，620+ 介面元素無死角對稱支援。

---

## 📦 商業授權與定價階梯 (Pricing Tiers)

官方購買網址：[https://gumroad.com/l/photocrop-pro](https://gumroad.com/l/photocrop-pro)

| 方案 | 價格 | 設備席位 | 商業權益與核心功能 | 適用對象 |
| :--- | :---: | :---: | :--- | :--- |
| **個人標準版**<br>(Personal Standard) | **$19 USD**<br>(一次買斷) | 1 台設備 | • 核心多照片自動偵測、透視拉平與批次裁切<br>• iPhone HEIC 免轉檔支援<br>• 300 DPI 印刷標籤注入<br>• Corner Patrol 與 3X 放大鏡微調<br>• 終身免費小版本修復（個人非商業用途） | 個人與家庭老相簿數位化整理 |
| **專業進階版**<br>(Pro Studio Powerpack) | **$39 USD**<br>(一次買斷，原價 $49) | **3 台設備** | • **包含標準版所有功能**<br>• **相簿版型記憶引擎 (Layout Memory)**<br>• **跨電腦隨身專案檔 (.pacproj)**<br>• **商業營運與委託代工授權 (Commercial Studio License)**<br>• 批次流水序號客製化編排<br>• VIP 優先 1 對 1 官方技術支援 | 攝影工作室、檔案典藏館、代工服務商、重度收藏家 |

> 🛡️ **售後承諾**：享有 **30 天無條件全額退款保證** 與 **30 天離線使用寬限憑證**。

---

## 🚀 快速安裝與使用

### 方式一：Windows 雙版本安裝 (最推薦)
- **日常使用推薦**：執行 **`PhotoAutoCrop-Pro-Setup-1.0.0.exe`**，自動安裝並建立桌面與開始功能表捷徑。
- **隨身行動推薦**：執行免安裝綠色便攜版 **`PhotoAutoCrop-Pro-Portable.exe`**，插上隨身碟即可直接使用。
- *若出現 Windows SmartScreen 藍色提示，請點擊「其他資訊 (More info)」➔「仍要執行 (Run anyway)」即可正常啟動（詳見 [START_HERE.html](START_HERE.html) 或 [INSTALLATION_GUIDE.md](docs/INSTALLATION_GUIDE.md)）。*

### 方式二：macOS 獨立應用程式 (.DMG)
- **Apple Silicon (M1/M2/M3/M4)**：下載 `PhotoAutoCrop-Pro-Mac-1.0.0-arm64.dmg`。
- **Intel Mac**：下載 `PhotoAutoCrop-Pro-Mac-1.0.0-x64.dmg`。
- 將圖示拖入 Applications 資料夾，首次啟動按住 `Control` 鍵點選「打開」即可。

---

## 📚 官方文檔索引

- 📖 [現代互動開箱導覽 (START_HERE.html)](START_HERE.html) — 英文首選、動態語系切換、SmartScreen 解除圖解。
- 📘 [旗艦使用手冊 (USER_MANUAL.md)](docs/USER_MANUAL.md) — 9 大章節深度功能指南與快捷鍵（[繁體中文版](docs/USER_MANUAL_zh-TW.md)）。
- 🛡️ [安裝與安全性指引 (INSTALLATION_GUIDE.md)](docs/INSTALLATION_GUIDE.md) — Windows / macOS 安全信任放行。
- 🛠️ [售後支援與常見問題 (TROUBLESHOOTING_FAQ.md)](docs/TROUBLESHOOTING_FAQ.md) — 5 大維度常見問題與退款保證。
- 📋 [Gumroad 上架文案與素材 (marketing/)](marketing/) — 銷售落地頁、核對手冊與行銷視覺圖。

---

## 📁 專案標準目錄架構

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
