# Fatima Store v4.0

![Version](https://img.shields.io/badge/version-4.0-indigo) ![Status](https://img.shields.io/badge/status-stable-success) ![PWA](https://img.shields.io/badge/PWA-Capable-blueviolet)

**Fatima Store** is a lightweight, mobile-first Progressive Web App (PWA) designed for inventory management and price checking. It features robust offline capabilities, real-time database synchronization, and barcode scanning integration.

## 🚀 Key Features (v4.0)

* **📱 Mobile-First Design:** Optimized for touch interaction with a responsive Tailwind CSS UI.
* **🔌 Offline Capable:** Full PWA support. The UI loads instantly without internet, and critical assets are cached via Service Worker.
* **📷 Built-in Scanner:** Integrated Barcode scanner (Supports UPC, EAN, QR) using `html5-qrcode`.
* **🔒 Manager Mode:** Secure Google Authentication for admins to Edit/Delete items.
    * *New in v4.0:* **Persistent Session** — Managers stay logged in across page refreshes.
* **☁️ Real-time Sync:** Uses Firebase Firestore to sync prices instantly across all devices.
* **🌍 Smart Lookup:** Automatically fetches product names from OpenFoodFacts databases if a scanned item is not in the local inventory.
* **🛡️ App Safety:** "Back Button Trap" prevents accidental exit on Android devices.

## 🛠️ Tech Stack

* **Frontend:** HTML5, Vanilla JavaScript (ES6 Modules).
* **Styling:** Tailwind CSS (via CDN).
* **Icons:** Lucide Icons.
* **Backend:** Firebase v11 (Authentication & Firestore).
* **Scanning:** HTML5-QRCode library.

## 📂 Project Structure

```text
/
├── index.html       # Main application entry point (UI + Logic)
├── sw.js            # Service Worker (Caching & Offline Logic)
├── manifest.json    # PWA Configuration (Icons, Colors)
└── logo.png         # App Icon (Required for PWA installation)
