# PhotoAutoCrop Pro - AI Agent 專案協作準則與 BDD 開發規範

本規範專為「PhotoAutoCrop Pro（自動翻拍相片辨識與批次裁切工作台）」專案設計。所有參與本專案功能開發、重構、Bug 修復的 AI Agent 必須嚴格遵守以下準則。

---

## 🎯 專案核心商業與技術原則 (Core Tenets)

1. **隱私至上 (Zero-Cloud Leak)**：
   * 所有影像辨識（OpenCV WebAssembly）與透視校正運算必須 100% 在本機離線執行。已全面純本地化（零外部依賴），絕不將用戶照片上傳至任何雲端伺服器，拔掉網路線亦可 100% 正常運作。
2. **極簡實用 (KISS 原則)**：
   * 恪守 Keep It Simple, Stupid。禁止過度工程化、禁止無意義的抽象層與冗長防禦性包裝。
3. **商業變現完備 (Commercial Readiness)**：
   * 本軟體面向 Gumroad 全球市場發售，所有功能變更均需顧及：**授權防偽**、**非技術用戶體驗**、**iPhone HEIC 翻拍相容性** 與 **國際化雙語支援**。

---

## 🛠️ BDD 行為驅動開發工作流 (BDD Workflow)

在著手編寫或修改任何代碼之前，AI Agent 必須遵循以下標準循環：

```text
[ 1. 閱讀規格 ] ──> [ 2. 鎖定 Scenario ] ──> [ 3. 最小實作 ] ──> [ 4. 自我驗收 ]
```

### 1. 規格查詢（Spec First）
* 所有的業務邏輯與驗收標準統一存放在 `features/` 目錄中：
  * `features/01_gumroad_license.feature`：Gumroad 授權碼驗證、試用限制、離線寬限期。
  * `features/02_heic_image_pipeline.feature`：iPhone HEIC/HEIF 翻拍格式相容轉碼。
  * `features/03_i18n_localization.feature`：中英文多語言切換與在地化。
  * `features/04_port_and_security.feature`：動態 Port 容錯防衝突與核心代碼保護。
* **嚴格禁止**：在沒有對應 Feature/Scenario 的情況下憑空增設商業限制。

### 2. 實作準則（Implementation Contract）
* 必須精準滿足 Gherkin 語法定義的 `Given（前置狀態）`、`When（使用者動作）`、`Then（預期結果）`。
* 僅修改實現該 Scenario 所需的最少代碼（Minimal Diff），避免破壞現有功能。

### 3. 交付驗收（Definition of Done）
* 每次完成任務交付時，AI Agent 必須輸出簡短的 **BDD 驗收摘要**：
  * 明確說明滿足了哪些 Feature 中的哪幾個 Scenarios。
  * 說明有哪些修改的文件與測試結果。

---

## 👥 角色職責與檔案邊界 (Role Boundaries)

| 角色標籤 | 核心職責 | 主要修改與關注檔案 |
| :--- | :--- | :--- |
| **Monetization PM** | 授權驗證、試用版限制、退款防護 | `server.js` (`/api/verify-license`), `js/app.js` |
| **Media Engineer** | HEIC 轉碼、OpenCV 記憶體防護、EXIF/DPI 保留 | `js/detector.js`, `index.html` (依賴載入), `server.js` |
| **UI/UX Designer** | 多語言切換、彈窗體驗、現代暗黑美學 | `index.html`, `style.css`, `js/i18n.js` |
| **Architect & Security** | 動態 Port 機制、防逆向混淆、IPC 通訊穩定性 | `main.js`, `server.js`, `preload.js` |
| **Release QA** | 打包配置、App 圖示、安裝指南 | `package.json`, `dist/` |

---

## 📋 AI Agent 指令 Prompt 呼叫範本

當向 AI Agent 指派具體任務時，請直接使用以下模板：

```text
【任務角色】：[填入角色，如：Media Engineer]
【參考規格】：features/02_heic_image_pipeline.feature
【執行場景】：場景 1：使用者拖入 iPhone HEIC 翻拍照片
【交付要求】：
1. 依據 Given-When-Then 實現前端自動轉碼預覽與批次處理。
2. 保持 KISS 原則，不引入過重依賴。
3. 完成後提供 BDD 驗收確認。
```
