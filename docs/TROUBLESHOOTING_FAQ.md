# PhotoAutoCrop Pro — Troubleshooting & Frequently Asked Questions (FAQ)

> [繁體中文版本請參閱 (Traditional Chinese Version)](TROUBLESHOOTING_FAQ_zh-TW.md)

**Version**: v1.0.0 Commercial Release  
**Support Team**: PhotoAutoCrop Pro Technical Assistance  
**Service Commitment**: 30-Day Money-Back Guarantee • Fast 1-on-1 Support

---

## Table of Contents

1. [Dimension 1: Gumroad Purchase & License Activation](#dimension-1-gumroad-purchase--license-activation)
2. [Dimension 2: 30-Day Offline Grace Period & Offline Operations](#dimension-2-30-day-offline-grace-period--offline-operations)
3. [Dimension 3: Shooting Setup, Glare Suppression & Detection Tuning](#dimension-3-shooting-setup-glare-suppression--detection-tuning)
4. [Dimension 4: Dynamic Port Binding & Firewall Handling](#dimension-4-dynamic-port-binding--firewall-handling)
5. [Dimension 5: Formats, Performance Tuning & 30-Day Refund Policy](#dimension-5-formats-performance-tuning--30-day-refund-policy)

---

## Dimension 1: Gumroad Purchase & License Activation

### Q1: Where do I find my License Key after completing payment on Gumroad?
**Answer**:  
You can locate your 32-character license key in any of the following places:
1. **Receipt Webpage**: Upon completing checkout on Gumroad, your license key is displayed immediately in the **License Key** field (formatted as `XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`).
2. **Email Receipt**: Gumroad automatically sends a confirmation email titled *"You got PhotoAutoCrop Pro!"* containing your license key and download links.
3. **Gumroad Library**: Log in to [Gumroad Library](https://gumroad.com/library) at any time to access your purchases and retrieve your license key.

---

### Q2: Why does the app say "Invalid License Key" when I paste my code?
**Answer**:  
Please check the following four quick checkpoints:
1. **Leading/Trailing Whitespace**: Ensure no extra space was inadvertently copied before the first or after the last character.
2. **Complete Hyphens**: Ensure all hyphens (`-`) are included in the pasted string.
3. **Internet Access**: A single outgoing HTTPS request to `https://api.gumroad.com` is required during the initial one-second activation. Confirm your computer is connected to the internet and not blocked by a corporate VPN or proxy.
4. **Product Variant**: Verify that your key belongs to `photocrop-pro`. If issues persist, email your order receipt to `support@photoautocrop.pro` for immediate verification.

---

### Q3: How many computers can I use with a single license key?
**Answer**:  
Device seats depend on your license tier:
- **Standard Edition ($19)**: Valid for **1 personal computer**.
- **Pro Powerpack Edition ($39)**: Valid for up to **3 concurrent computers** (desktop, laptop, studio workstation) plus commercial client service permissions.
- **Switching Machines**: Simply activate the key on your new machine. If you exceed your seat limit, contact `support@photoautocrop.pro` for an instant seat reset.

---

## Dimension 2: 30-Day Offline Grace Period & Offline Operations

### Q4: Can I use this software without any internet connection (or unplugged)?
**Answer**:  
**Yes, absolutely. This is one of PhotoAutoCrop Pro's core design strengths.**  
Only the initial one-second activation requires internet connectivity. Once verified, the software stores an encrypted local license token with an **extended 30-day offline grace period**.  
During these 30 days, all computer vision cropping, perspective correction, and batch ZIP export functions operate 100% locally with zero internet access.

---

### Q5: What happens when the 30-day offline period expires? Are my photos safe?
**Answer**:  
**Your photos are 100% safe and untouched.**  
After 30 days offline, the software simply prompts you to connect briefly to refresh the license certificate. Connect to Wi-Fi for 2 seconds while launching the app—it verifies in the background and grants another full 30 days of offline access automatically.

---

### Q6: Where is my license file saved locally?
**Answer**:  
- **Windows**: `%APPDATA%\PhotoAutoCrop\license.json`
- **macOS**: `~/Library/Application Support/PhotoAutoCrop/license.json`  
Backing up this JSON file preserves your activated status.

---

## Dimension 3: Shooting Setup, Glare Suppression & Detection Tuning

### Q7: Why did the auto-detector miss one photo or include the album border?
**Answer**:  
Automatic contour detection relies on contrast gradients. Follow these three physical principles for 99%+ accuracy:
1. **High Contrast Background**: Place white or cream-bordered vintage photos on a dark desk or dark cloth mat.
2. **Disable Camera Flash**: Direct specular flash creates bright white glare hotspots that look like false photo borders. Use soft indirect window light instead.
3. **Corner Patrol & 3X Loupe**: For faint or faded 19th-century prints, open the **Corner Patrol** inspector and use the 3X optical loupe to snap the corners precisely in seconds.

---

### Q8: How does the software handle iPhone HEIC photos?
**Answer**:  
PhotoAutoCrop Pro has an integrated, offline WebAssembly HEIC decoder. Simply drag `.heic` or `.HEIC` files directly into the window—the engine decodes them in system RAM at native resolution without third-party converters or cloud uploads.

---

## Dimension 4: Dynamic Port Binding & Firewall Handling

### Q9: Does PhotoAutoCrop Pro conflict with other local web dev servers?
**Answer**:  
No. PhotoAutoCrop Pro implements an intelligent dynamic port fall-back mechanism. If default ports (e.g., 3000 or 8080) are occupied by Docker, Node, or IIS, the background engine automatically probes and binds to an open ephemeral port (`3000`–`65535`) within 20 milliseconds.

---

## Dimension 5: Formats, Performance Tuning & 30-Day Refund Policy

### Q10: What is your refund policy?
**Answer**:  
We stand behind PhotoAutoCrop Pro with a **100% Full Money-Back Guarantee within 30 days of purchase**.  
If the software does not meet your digitization needs or cannot run smoothly on your operating system, simply email `support@photoautocrop.pro` with your Gumroad order number. We will issue a complete refund immediately.
