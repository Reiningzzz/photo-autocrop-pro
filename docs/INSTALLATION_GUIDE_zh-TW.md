# PhotoAutoCrop Pro — 安裝與安全性信任指引 (Installation & Security Guide)

感謝您在 Gumroad 支持 **PhotoAutoCrop Pro**！  
本指南為非技術使用者提供 Windows 與 macOS 的安裝步驟說明，以及首次執行時系統安全提示（Windows Defender SmartScreen / macOS Gatekeeper）的安心放行步驟。

---

## 🔒 我們的隱私與安全性承諾 (Zero-Cloud Leak Guarantee)

> **【100% 本機離線運算，零隱私洩漏】**  
> PhotoAutoCrop Pro 採用本機 WebAssembly (OpenCV) 與高效能本機演算法架構。  
> 您的所有相片、個人相簿與檔案 **100% 留在您自己的電腦中運算，絕不上傳至任何外部雲端伺服器**。即使拔掉網路線、身處飛機或地下室，軟體依然可以全功能高速運作。本軟體無任何木馬、後門或使用者行為追蹤（Zero Telemetry）。

---

## 🖥️ Windows 安裝與 SmartScreen 藍色視窗安心放行

### 1. 安裝版本選擇建議
- **日常使用推薦**：`PhotoAutoCrop-Pro-Setup-1.0.0.exe`  
  自動安裝至本機使用者目錄（`%LOCALAPPDATA%`），無需管理員提權，桌面自動建立高清圖示捷徑與開始功能表連結。
- **隨身行動推薦**：`PhotoAutoCrop-Pro-Portable.exe`  
  單一免安裝執行檔，直接放進隨身碟隨插即用，不更動任何系統登錄檔。

---

### 2. 為什麼會出現「Windows 保護了您的電腦 (SmartScreen)」？

微軟 Windows Defender SmartScreen 在遇到剛發行、尚未累積數萬次下載的獨立開發者軟體時，會主動跳出藍色防護視窗。  
**請安心，這絕非代表軟體含有病毒！**  
為了維持 $19 USD 終身買斷的親民售價，我們**未將微軟每年要價數百至上千美元的企業代碼簽名認證費 (EV Certificate) 轉嫁至使用者身上**。這是全球獨立軟體開發者（Indie Developers）的普遍現象。

---

### 3. 解除攔截只需兩步（中英按鈕對照圖解）

#### 【按鈕對照表】
- 繁體中文系統：【**其他資訊**】 ➔ 【**仍要執行**】
- 英文系統：【**More info**】 ➔ 【**Run anyway**】
- 簡體中文系統：【**更多信息**】 ➔ 【**仍要运行**】

#### 【ASCII 視窗操作示意圖】

```text
┌────────────────────────────────────────────────────────┐
│  Windows 保護了您的電腦 (Windows protected your PC)    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Microsoft Defender SmartScreen 已阻止未辨識的應用程式   │
│  啟動。執行此應用程式可能會讓您的電腦面臨風險。        │
│                                                        │
│  👉 第一步：點擊此處藍色文字 ───┐                     │
│  [ 其他資訊 / More info ] <──────┘                     │
│                                                        │
│  ────────────────────────────────────────────────────  │
│  應用程式: PhotoAutoCrop-Pro-Setup-1.0.0.exe           │
│  發行者:   未知的發行者 (獨立開發者)                   │
│                                                        │
│                  👉 第二步：點擊右下角按鈕 ──┐         │
│  [ 不要執行 ]                [ 仍要執行 / Run anyway ] │
│                                         ▲              │
│                                         └──────────────┘
└────────────────────────────────────────────────────────┘
```

1. **第一步**：點擊藍色警告文字底下的「**其他資訊**（More info）」。
2. **第二步**：視窗右下角會出現「**仍要執行**（Run anyway）」按鈕，點擊即可順暢啟動！此操作僅需在首次安裝或執行時點擊一次，系統往後會自動信任。

---

## 🍎 macOS 安裝與 Gatekeeper 權限放行指南

### 1. 晶片架構選擇與安裝步驟
1. 依據您的 Mac 晶片下載對應安裝檔案：
   - **Apple Silicon（M1 / M2 / M3 / M4 系列晶片）**：請下載 `PhotoAutoCrop-Pro-Mac-1.0.0-arm64.dmg`（原生架構、秒速啟動、效能最高）。
   - **Intel 晶片 Mac**：請下載 `PhotoAutoCrop-Pro-Mac-1.0.0-x64.dmg`。
2. 雙擊開啟 `.dmg` 檔案，將 **PhotoAutoCrop Pro** 圖示拖入 **Applications (應用程式)** 資料夾。

---

### 2. 首次開啟若提示「無法打開」或「已損壞」之 3 大排除方案

#### 方案 A（最直覺：Control + 右鍵打開法 — 90% 使用者適用）
1. 打開 Finder，進入「**應用程式**（Applications）」。
2. **按住鍵盤上的 `Control` 鍵不放**，同時用滑鼠點擊 **PhotoAutoCrop Pro** 圖示（或直接按滑鼠右鍵）。
3. 在彈出的右鍵選單中，點選「**打開**（Open）」。
4. 系統會跳出確認對話框，此時對話框中將會出現「**打開**」按鈕，點擊即可正常啟動！  
   *（提示：此動作僅需第一次啟動時執行一次，系統會記住信任，往後直接雙擊即可打開。）*

#### 方案 B（系統設定授權法 — 適用 macOS Sonoma / Sequoia）
1. 點擊螢幕左上角「蘋果選單 ()」➔ 進入「**系統設定**（System Settings）」。
2. 點選左側選單「**隱私權與安全性**（Privacy & Security）」。
3. 向下捲動至「**安全性**」區塊，會看到提示：「已阻擋打開 PhotoAutoCrop Pro，因為它不是來自受信任的開發者」。
4. 點擊旁邊的「**強制打開**（Open Anyway）」按鈕，輸入 Mac 解鎖密碼即可放行。

#### 方案 C（進階：清除 Quarantine 隔離屬性終端機指令）
若系統提示「應用程式已損壞，您應該將它丟到垃圾桶」，此為 macOS 對未簽名下載檔案自動加註之隔離標籤。打開「終端機 (Terminal)」，貼入以下指令並按 Enter 即可瞬間解除：
```bash
xattr -cr /Applications/PhotoAutoCrop\ Pro.app
```

---

## 🛡️ 官方檔案安全校驗 (SHA-256 Checksums)

為確保您下載的安裝包完整且未遭第三方篡改，您可在本機終端機比對官方 SHA-256 雜湊碼：

- **Windows PowerShell 校驗指令**：
  ```powershell
  Get-FileHash -Algorithm SHA256 PhotoAutoCrop-Pro-Setup-1.0.0.exe
  ```
- **macOS Terminal 校驗指令**：
  ```bash
  shasum -a 256 PhotoAutoCrop-Pro-Mac-1.0.0-arm64.dmg
  ```

---

## 💬 售後支援與 100% 退款保障

若您在安裝過程中遇到任何無法排除的疑難，請隨時聯繫我們：
- **官方支援信箱**：`support@photoautocrop.pro`
- **安心承諾**：若軟體在您的電腦上因相容性問題無法正常運作且客服無法排除，我們承諾提供 **30 天原路 100% 全額無條件退款**！
