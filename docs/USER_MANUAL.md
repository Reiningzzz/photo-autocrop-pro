# PhotoAutoCrop Pro — User Manual (Commercial Release)

> [繁體中文版本請參閱 (Traditional Chinese Version)](USER_MANUAL_zh-TW.md)

**Version**: v1.0.0 Commercial Release  
**Platforms**: Windows 10/11 (64-bit) & macOS 11+ (Apple Silicon & Intel)  
**Core Guarantee**: Zero-Cloud Leak — 100% on-device local computation. Your photos never leave your machine.

---

## Table of Contents

1. [Chapter 1: Product Architecture & Overview](#chapter-1-product-architecture--overview)
2. [Chapter 2: 3-Step Quick Start](#chapter-2-3-step-quick-start)
3. [Chapter 3: Image Import & Format Compatibility (iPhone HEIC Direct Support)](#chapter-3-image-import--format-compatibility-iphone-heic-direct-support)
4. [Chapter 4: Edge Detection, Perspective Dewarping & Auto-Orientation](#chapter-4-edge-detection-perspective-dewarping--auto-orientation)
5. [Chapter 5: Corner Patrol 1:1 Inspector, 3X Loupe & Magnetic Snap](#chapter-5-corner-patrol-11-inspector-3x-loupe--magnetic-snap)
6. [Chapter 6: 300 DPI Archival Tag Injection & Batch ZIP Export](#chapter-6-300-dpi-archival-tag-injection--batch-zip-export)
7. [Chapter 7: Layout Memory Engine & Portable Projects (.pacproj)](#chapter-7-layout-memory-engine--portable-projects-pacproj)
8. [Chapter 8: International Localization (7 Languages) & Custom Preferences](#chapter-8-international-localization-7-languages--custom-preferences)
9. [Chapter 9: License Management, Offline Grace Period & Support](#chapter-9-license-management-offline-grace-period--support)

---

## Chapter 1: Product Architecture & Overview

**PhotoAutoCrop Pro** is a high-performance desktop workstation engineered specifically for digitizing physical photo albums, vintage snapshot collections, Polaroid cards, and family photo archives.

### 1.1 Flatbed Scanners vs. PhotoAutoCrop Pro
- **Traditional Flatbed Scanners**: Glued photo albums cannot be laid flat; scanning one photo takes 30–60 seconds; digitizing a single 200-photo album requires weeks of tedious manual labor.
- **Smartphone Capture + PhotoAutoCrop Pro**: Place the physical album on your desk, snap an entire page (2–6 photos per page) with your smartphone or camera, and drag the batch into PhotoAutoCrop Pro. In seconds, each photograph is automatically segmented, dewarped from any perspective distortion, rotated upright, and injected with print-grade 300 DPI metadata.

### 1.2 100% Local Privacy Architecture (Zero-Cloud Leak)
- All computer vision (OpenCV WebAssembly) and perspective transforms execute exclusively inside your computer's local memory.
- The application runs 100% offline—even with your internet disconnected, in airplane mode, or in an offline lab environment.
- Zero telemetry, zero analytics tracking, zero cloud data transfer.

---

## Chapter 2: 3-Step Quick Start

```text
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  Step 1: Launch        │ ───> │  Step 2: Drag & Drop   │ ───> │  Step 3: Export ZIP    │
│  Run Portable or Setup │      │  Drop scanned pages    │      │  Click Batch Export    │
│  Paste License Key     │      │  Instant auto-detect   │      │  Download 300 DPI ZIP  │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

1. **Step 1: Launch & License Activation**
   - Double-click `PhotoAutoCrop-Pro-Setup-1.0.0.exe` or `PhotoAutoCrop-Pro-Portable.exe`.
   - If prompted with trial mode (3-photo trial), click **Activate License**, paste your 32-character key from your Gumroad receipt email, and hit Enter.
2. **Step 2: Drag & Drop Photos**
   - Drag photo files or entire folders into the central drop zone.
   - The engine automatically detects individual photos, overlays 4-corner bounding polygons, and displays cropped previews in real time.
3. **Step 3: Batch Export to ZIP**
   - Click the green **Export All Photos (ZIP)** button.
   - The software exports each photo with sequential numbering (e.g., `Scan_001_cut_01.jpg`), injects 300 DPI JFIF headers, and archives everything into a single organized ZIP package.

---

## Chapter 3: Image Import & Format Compatibility (iPhone HEIC Direct Support)

### 3.1 Supported Image Formats
- **Standard Bitmaps**: JPEG (`.jpg`, `.jpeg`), PNG (`.png`), WebP (`.webp`), BMP (`.bmp`).
- **iPhone / iPad Photos**: HEIC / HEIF (`.heic`, `.HEIC`).

### 3.2 Native Offline iPhone HEIC Decoding
Modern iPhones capture photographs in high-efficiency HEIC format by default, which often fails to open on Windows PCs.  
PhotoAutoCrop Pro includes an embedded, offline WebAssembly HEIC decoder:
- Drag `.heic` files directly into the workspace—they decode instantly into high-res canvas bitmaps.
- **Zero third-party converters, zero cloud APIs**: No need to convert on your phone or upload to sketchy web converters.

### 3.3 Best Practices for Capturing Physical Photos
For the highest automatic detection accuracy, observe the "Three Contrasts" principle:
1. **Background Contrast**: Place photos or light-bordered albums on a dark, non-reflective desk or cutting mat.
2. **Diffuse Lighting**: Disable smartphone flash to avoid specular glare. Use natural daytime window light or angle your camera slightly (10–15°) to avoid reflections—the perspective dewarper corrects angles automatically.
3. **Flat Photo Surface**: If vintage prints curl, lay a clean, transparent acrylic sheet over them to hold them flat.

---

## Chapter 4: Edge Detection, Perspective Dewarping & Auto-Orientation

### 4.1 Multi-Object Boundary Recognition
- Adaptive gradient edge detection and contour fitting distinguish vintage photo borders from album mounting paper.
- Simultaneously detects 1 to 6+ individual prints on a single captured page.

### 4.2 Lanczos-4 Perspective Dewarping
When photographing from hand, camera angles inevitably produce slight trapezoidal perspective skew.  
PhotoAutoCrop Pro computes the 4-corner homography matrix and applies high-fidelity Lanczos-4 resampling, producing flat, orthogonal rectangular prints identical to professional flatbed scans.

### 4.3 Intelligent Natural Orientation
- Analyzes bounding geometry and face landmarks offline.
- If a photo contains human subjects, the system detects face orientation and rotates the image upright automatically.

### 4.4 Optional Google Gemini Multimodal Vision Fallback
For heavily damaged, vintage 19th-century prints, torn edges, or overlapping snapshots:
- Click **AI Settings** and enter your optional, free Google Gemini API Key.
- Enables cloud-assisted semantic boundary reasoning for challenging archival edge cases.

---

## Chapter 5: Corner Patrol 1:1 Inspector, 3X Loupe & Magnetic Snap

While automatic detection achieves over 99% accuracy on contrasting backgrounds, PhotoAutoCrop Pro offers professional manual fine-tuning tools:

### 5.1 Corner Patrol 1:1 Inspector
- Inspect all four corners at 1:1 pixel resolution in a synchronized quad-panel view.
- Toggle **Edge Highlight** to expose bleed margins and eliminate black borders with absolute certainty.

### 5.2 3X Optical-Grade Magnifier (Interactive Loupe)
- Dragging any corner anchor reveals a real-time **3X optical loupe** floating directly above your cursor.
- Features a high-contrast crosshair for sub-pixel boundary positioning without eye strain.

### 5.3 Magnetic Border Snapping (Smart Snap)
- Analyzes chromatic differences between album page paper (cream, aged cellulose, ruled lines) and photo print gloss.
- Corner anchors snap automatically to the genuine photographic boundary when dragged within 25px.

### 5.4 Essential Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Shift` + Drag** | Draw a selection marquee across multiple photo bounding boxes |
| **`Delete` / `Backspace`** | Remove currently selected photo crop box |
| **`Ctrl` + `Z`** | Undo previous edit (up to 50 history steps) |
| **`Ctrl` + `Y` / `Ctrl+Shift+Z`**| Redo previous edit |
| **`R`** | Rotate selected photo 90 degrees clockwise |
| **`ESC`** | Close dialogs, exit inspection mode |
| **`[` and `]`** | Navigate to previous / next photo in batch |

---

## Chapter 6: 300 DPI Archival Tag Injection & Batch ZIP Export

### 6.1 The Importance of 300 DPI Metadata
Most desktop screenshot or cropping tools output files tagged with 72 DPI display headers. When sent to professional photo labs or book publishers, print software flags them as low-resolution warnings.

### 6.2 Binary JFIF APP0 300 DPI Header Injection
- During JPEG generation, PhotoAutoCrop Pro writes binary JFIF APP0 markers setting X and Y density to exactly **300 DPI**.
- Normalizes EXIF Orientation to 1 (Standard Top-Left), ensuring proper rendering across all operating systems and photo galleries.
- Preserves original camera EXIF and timestamp metadata for historical genealogy records.

### 6.3 Export Preferences
- **Format**: High-compatibility JPEG, Lossless PNG, or Modern WebP.
- **Compression Quality**: Defaults to 0.95 for maximum photographic grain retention.
- **Naming Pattern**: Configurable templates (`[Original]_cut_[Index]`, custom prefix, sequential counters).

---

## Chapter 7: Layout Memory Engine & Portable Projects (.pacproj)

### 7.1 Layout Memory Engine
Physical photo albums often maintain recurring grid structures (e.g., 2 horizontal prints per page, 4 vertical cards per page).
- **Geometric Prior Learning**: Once you confirm the crop boxes on page one, the engine learns relative spatial coordinates.
- **One-Click Album Apply**: Apply the learned layout to subsequent pages for instant alignment.
- **Glare Fracture Healing**: If heavy plastic sleeve glare cuts a single photo into two fragments, the Layout Memory engine heals them back into a single unified crop box.

### 7.2 Portable Archival Projects (`.pacproj`)
- **IndexedDB Auto-Save**: Work-in-progress is continuously saved in local browser storage; accidental reboots restore all states instantly.
- **Export `.pacproj`**: Save entire workspaces (all photos, corner anchors, approval tags) into a single compact `.pacproj` file.
- **Cross-Device Transfer**: Move the `.pacproj` file to a laptop via USB and resume fine-tuning without redoing any work.

---

## Chapter 8: International Localization (7 Languages) & Custom Preferences

PhotoAutoCrop Pro includes a native i18n engine with 100% translation coverage across 620+ interface keys.

### Supported Languages
1. **English (US)** — `en` *(Default)*
2. **Traditional Chinese (繁體中文)** — `zh-TW`
3. **Simplified Chinese (简体中文)** — `zh-CN`
4. **Japanese (日本語)** — `ja`
5. **German (Deutsch)** — `de`
6. **French (Français)** — `fr`
7. **Spanish (Español)** — `es`

Switch languages at any time from the top-right globe dropdown menu. Preferences are preserved across restarts.

---

## Chapter 9: License Management, Offline Grace Period & Support

- **One-Time Purchase**: Valid for lifetime use on up to 3 personal machines.
- **7-Day Offline Grace Period**: Once activated, the software continues to work with zero internet connectivity for up to 7 consecutive days before requiring an optional heartbeat refresh.
- **Customer Support**: `support@photoautocrop.pro`
- **30-Day Money-Back Guarantee**: 100% full refund within 30 days of purchase if you are unsatisfied for any reason.
