# PhotoAutoCrop Pro — Installation & Security Trust Guide

> [繁體中文版本請參閱 (Traditional Chinese Version)](INSTALLATION_GUIDE_zh-TW.md)

Thank you for purchasing **PhotoAutoCrop Pro** on Gumroad!  
This guide provides non-technical, step-by-step installation instructions for both Windows and macOS, along with clear walkthroughs for first-launch system prompts (Windows Defender SmartScreen and macOS Gatekeeper).

---

## 🔒 Zero-Cloud Guarantee (100% Offline Processing)

> **【100% Local Processing • Zero Data Leakage】**  
> PhotoAutoCrop Pro is powered by local WebAssembly (OpenCV) and high-performance native image algorithms.  
> **All your photos, scanned albums, and digital archives remain 100% on your local machine.** No images are ever uploaded to any cloud server or third-party service. The software operates at full speed completely offline—even in airplane mode or with no network connection. Zero telemetry, zero bloatware, zero background tracking.

---

## 🖥️ Windows Installation & SmartScreen Walkthrough

### 1. Choosing Your Edition
- **Recommended for Daily Use**: `PhotoAutoCrop-Pro-Setup-1.0.0.exe`  
  Standard Windows installer. Installs cleanly to your user profile (`%LOCALAPPDATA%`), requires no Administrator privileges, and creates desktop shortcuts and Start Menu entries automatically.
- **Recommended for Portable / USB Use**: `PhotoAutoCrop-Pro-Portable.exe`  
  Single standalone executable. Runs immediately from any USB flash drive or external SSD without touching the Windows Registry or leaving traces.

---

### 2. Why Does "Windows protected your PC (SmartScreen)" Appear?

Microsoft Windows Defender SmartScreen displays a blue advisory screen whenever a newly released executable from an independent developer has not yet accumulated tens of thousands of download counts.  
**Rest assured: This does NOT indicate any virus, malware, or security defect.**  
To keep PhotoAutoCrop Pro accessible at an honest $19 USD one-time lifetime license, we **do not pass Microsoft's expensive annual Enterprise Extended Validation (EV) Code Signing fees ($500–$1,000/year) onto our customers**. This is standard practice among reputable independent software developers worldwide.

---

### 3. Bypassing SmartScreen in 2 Clicks

```text
┌────────────────────────────────────────────────────────┐
│  Windows protected your PC                             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Microsoft Defender SmartScreen prevented an           │
│  unrecognized app from starting. Running this app      │
│  might put your PC at risk.                            │
│                                                        │
│  👉 Step 1: Click the blue underline text ──┐          │
│  [ More info ] <────────────────────────────┘          │
│                                                        │
│  ────────────────────────────────────────────────────  │
│  App:        PhotoAutoCrop-Pro-Setup-1.0.0.exe         │
│  Publisher:  Unknown Publisher (Indie Developer)       │
│                                                        │
│                  👉 Step 2: Click the bottom button ──┐│
│  [ Don't run ]                          [ Run anyway ] │
│                                                ▲       │
│                                                └───────┘
└────────────────────────────────────────────────────────┘
```

1. **Step 1**: Click the blue underline link: **"More info"**.
2. **Step 2**: Click the **"Run anyway"** button that appears in the bottom right corner.  
   *(Note: This is only required once. Windows will remember your approval for future launches.)*

---

## 🍎 macOS Installation & Gatekeeper Permissions

### 1. Architecture Selection & Installation
1. Download the file corresponding to your Mac's processor:
   - **Apple Silicon (M1 / M2 / M3 / M4 chips)**: `PhotoAutoCrop-Pro-Mac-1.0.0-arm64.dmg` (native performance, instant launch).
   - **Intel-based Macs**: `PhotoAutoCrop-Pro-Mac-1.0.0-x64.dmg`.
2. Double-click the `.dmg` file, then drag the **PhotoAutoCrop Pro** icon into your **Applications** folder.

---

### 2. Resolving "App Can't Be Opened" or "Unidentified Developer" Prompts

#### Method A: Control + Click (Fastest • Recommended for 90% of Users)
1. Open Finder and navigate to your **Applications** folder.
2. Hold down the **`Control`** key on your keyboard and click the **PhotoAutoCrop Pro** icon (or right-click).
3. In the popup contextual menu, select **Open**.
4. A confirmation dialog will appear with an **"Open"** button. Click **Open** to launch.  
   *(macOS saves this preference permanently; subsequent launches will open directly with a normal double-click.)*

#### Method B: System Settings (macOS Sonoma / Sequoia / Ventura)
1. Open the Apple Menu () ➔ **System Settings** ➔ **Privacy & Security**.
2. Scroll down to the **Security** section.
3. You will see an advisory notice: *"PhotoAutoCrop Pro was blocked from opening because it is not from an identified developer."*
4. Click **Open Anyway**, then enter your Mac administrator password or Touch ID to authorize.

#### Method C: Clear Quarantine Flag (Advanced Terminal Command)
If macOS warns that *"The application is damaged and should be moved to the Trash"*, this is Apple's automated quarantine flag applied to unnotarized web downloads. Open Terminal and run:
```bash
xattr -cr /Applications/PhotoAutoCrop\ Pro.app
```

---

## 🛡️ File Integrity Verification (SHA-256 Hashes)

To guarantee that your downloaded installer has not been tampered with or corrupted in transit, you may verify the SHA-256 hash in your local terminal:

- **Windows PowerShell**:
  ```powershell
  Get-FileHash -Algorithm SHA256 PhotoAutoCrop-Pro-Setup-1.0.0.exe
  ```
- **macOS Terminal**:
  ```bash
  shasum -a 256 PhotoAutoCrop-Pro-Mac-1.0.0-arm64.dmg
  ```

---

## 💬 Dedicated Support & 30-Day Money-Back Guarantee

If you encounter any difficulty during installation or first launch, our technical support team is ready to help:
- **Support Email**: `support@photoautocrop.pro`
- **100% Risk-Free Guarantee**: If PhotoAutoCrop Pro does not run smoothly on your computer due to hardware or OS compatibility and our team cannot resolve it, we provide a **100% full refund within 30 days of purchase**, no questions asked.
