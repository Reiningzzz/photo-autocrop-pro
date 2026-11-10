# language: zh-TW
功能: 多平台交付安裝體驗與防毒過濾安全防護 (Release & QA)
  身為一位 PhotoAutoCrop Pro 的發行與品質保證工程師 (Release QA)
  我想要建立標準化安裝交付包、配置跨平台 (Windows & macOS) 構建流程、以及提供防毒過濾白名單指引
  以降低 Gumroad 用戶安裝阻力、防範無簽名誤報攔截、並大幅降低退款與投訴率。

  情境: Windows 用戶透過標準 NSIS 安裝程式安裝軟體
    假設 使用者在 Windows 平台下載了最新發行包
    當 使用者下載 PhotoAutoCrop-Pro-Setup.exe 並執行
    那麼 安裝程式應透過 NSIS 引導使用者安裝至 LocalAppData 目錄
    而且 無需強制管理員 UAC 提權即可順暢安裝
    而且 自動在桌面與開始功能表建立應用程式捷徑
    而且 附帶標準的反安裝解除安裝程式 (Uninstall.exe)

  情境: Windows SmartScreen 未簽名藍色警告攔截引導
    假設 使用者首次在 Windows 執行未經昂貴 EV 認證的安裝包
    當 系統觸發 Windows Defender SmartScreen 藍色保護提示
    那麼 Gumroad 下載確認頁與隨附手冊提供清晰的「兩步放行」圖文指引
    而且 第一步引導點擊「其他資訊 (More info)」
    而且 第二步引導點擊「仍要執行 (Run anyway)」
    而且 附帶品牌誠懇信任聲明，說明為 100% 本機離線運算工具，化解退款恐慌

  情境: macOS (Apple Silicon & Intel) 用戶下載與快捷鍵適配
    假設 使用者在 Mac 平台下載了 PhotoAutoCrop-Pro.dmg 安裝包
    當 使用者打開 DMG 並拖曳應用程式至 Applications 資料夾
    那麼 應用程式可在 Apple Silicon (M1/M2/M3/M4) 及 Intel Mac 上原生啟動
    而且 在 macOS 環境下具備原生 Edit 選單，確保 Cmd+C / Cmd+V 複製貼上 API Key 正常運作
    而且 針對 Gatekeeper 阻擋提供「系統設定 > 隱私權與安全性 > 仍要打開」及 xattr 解除隔離圖文指引

  情境: GitHub Actions 雲端自動化跨平台構建與冒煙測試
    假設 開發者推送到 Git main 分支或發布版本 Tag
    當 CI/CD 工作流觸發
    那麼 雲端 Windows Runner 自動編譯產出 NSIS Setup.exe 與 Portable.exe
    而且 雲端 macOS Runner 自動編譯產出 arm64 與 x64 的 .dmg 與 .zip
    而且 自動計算 SHA-256 Checksum 並執行 macOS 無頭啟動驗證，確保無 Mac 實機也能保證發行品質
