# PhotoAutoCrop Pro — Privacy Policy (隱私權政策)

**Effective Date**: October 2026  
**Product**: PhotoAutoCrop Pro Desktop Application (Windows & macOS)  
**Core Architecture**: 100% Zero-Cloud Leak, Offline-First Architecture

---

### 1. Our Privacy Philosophy (零雲端外洩原則)
At PhotoAutoCrop Pro, we believe your personal photos, family albums, and archival memories belong exclusively to you. The software is fundamentally engineered from day one to operate **100% locally and offline**. You can disconnect your device from the Internet, and all photo detection, cropping, and export features continue to operate without restriction.

---

### 2. What Data We Process (Local Only)
**We do NOT collect, transmit, or store your photos, cropped images, EXIF metadata, or personal files on any remote servers.**

- **Zero Image Uploads**: When you drag and drop photos or folders into PhotoAutoCrop Pro, the images are loaded directly into your local machine's memory via standard Electron/WebAssembly APIs. No photos are ever uploaded to any cloud server.
- **Local Computer Vision Execution**: All edge detection, contour analysis, orientation detection, and Lanczos-4 perspective transformations are executed locally on your computer's CPU/RAM via WebAssembly.
- **No Telemetry / No Tracking**: The application contains no Google Analytics, Mixpanel, Sentry, or third-party usage trackers. We do not track what you crop, how often you use the app, or what your photos contain.

---

### 3. Network Operations (Strictly Minimized)
PhotoAutoCrop Pro initiates network requests in only two optional/strictly defined scenarios:

1. **Gumroad License Key Activation**:
   - When you activate your license, a secure HTTPS POST request is made directly to Gumroad's official API (`https://api.gumroad.com/v2/licenses/verify`).
   - **Transmitted Data**: Strictly limited to your License Key, the product permalink (`photocrop-pro`), and a one-way hashed machine identifier to enforce device seat limits.
   - **Offline Grace Period**: Once activated, an encrypted token is cached locally with a **30-day offline grace period**. During this period, the software requires zero internet connectivity.
2. **Optional Google Gemini AI Vision (User-Opt-In Only)**:
   - If you choose to enable the optional Gemini AI helper for heavily damaged or overlapping photos, requests are sent directly from your computer to Google's official Generative AI API (`https://generativelanguage.googleapis.com`) using your own personal API Key. No intermediary servers or proxies intercept your requests.

---

### 4. Local Storage & File System Paths
The application stores configuration, project metadata, and license tokens exclusively on your local hard drive:

- **Windows**: `%APPDATA%\PhotoAutoCrop-Pro\`
- **macOS**: `~/Library/Application Support/PhotoAutoCrop-Pro/`

**Data Stored Locally**:
- UI language preference (Traditional Chinese, English, Simplified Chinese, Japanese, German, French, Spanish)
- Export preferences (JPEG/PNG/WebP, DPI setting, output template)
- Album Layout Memory cache (persisted locally in IndexedDB/LocalStorage, never transmitted)
- Portable Project files (`.pacproj`): Saved only to the local or removable disk directory you explicitly select.

You can delete all local application data at any time by clearing the application data directory above.

---

### 5. Contact & Privacy Inquiries
If you have any questions or security inquiries regarding this Privacy Policy, please contact our privacy compliance team:
- **Email**: `privacy@photoautocrop.pro` or `support@photoautocrop.pro`
- **Product Page**: `https://gumroad.com/l/photocrop-pro`

---
© 2026 PhotoAutoCrop Pro. All rights reserved.
