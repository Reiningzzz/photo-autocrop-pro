# Changelog - PhotoAutoCrop Pro

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-25 (Commercial Launch Release)

### Added
- **Core Vision Pipeline**:
  - Offline OpenCV WebAssembly automated multi-photo edge detection and segmentation.
  - Perspective transformation (Homography Dewarp) using Lanczos-4 interpolation to eliminate phone camera tilt.
  - Geometric aspect-ratio auto-orientation and local face detection orientation correction.
- **Gumroad Commercial Licensing**:
  - Secure Gumroad License verification endpoint (`/api/verify-license`) with 30-day offline grace period.
  - Masked license key display and tier management (Free Trial / Pro Lifetime).
- **Format Compatibility**:
  - Native client-side asynchronous transcoding for Apple iPhone HEIC/HEIF photos (`heic2any`).
- **Interactive Crop Studio**:
  - Precision canvas annotator with 3X magnification Loupe for corner adjustments.
  - Rule-of-thirds composition grid, crosshair guidelines, and magnetic edge snap.
  - Interactive preview zoom toolbar (zoom in, zoom out, fit to screen, 1:1 view) and pan navigation.
  - Full-resolution crop inspector.
- **Performance & Security**:
  - Strict Content-Security-Policy (CSP) headers and origin binding.
  - Code protection pipeline with AST obfuscation (`scripts/build-protected.js`).
  - Electron ASAR archive packaging with exhaustive source exclusions (`.env`, `test/`, internal specs).
  - High-resolution multi-size application branding (`icon.ico`, `icon.icns`, `favicon.png`).
  - Global error boundaries (`window.onerror`, `window.onunhandledrejection`) with user-friendly toast feedback.
  - Memory safeguard: 200MB per-file upload limit to prevent browser memory exhaustion.
- **Internationalization & UX**:
  - Seamless dual-language switching between Traditional Chinese and English (`js/i18n.js`).
  - Smooth loading HUD animation during batch folder and HEIC import.
  - Daily free quota indicator badge and visual countdown.
- **Legal & Compliance**:
  - Official commercial End User License Agreement (`LICENSE.md`).
  - Strict 100% offline Zero-Cloud Leakage Privacy Policy (`PRIVACY.md`).

---
© 2026 PhotoAutoCrop Pro. All rights reserved.
