# 👻 Snapchat Memories Restorer

A purely client-side web tool to fix, merge, and organize your Snapchat GDPR data exports. 

## 💡 The Problem
When you request your data export from Snapchat, the media files you receive are incomplete. The official export separates your photos/videos from their overlays (filters, text, stickers) and strips the EXIF creation dates. If you import these raw files into Apple Photos or Google Photos, your timeline will be an unorganized mess.

## ✨ Features
This tool acts as a bridge between the messy Snapchat export and your clean photo library. It automatically:
* **Bakes in Overlays:** Merges text, stickers, and filters directly back into your photos and videos.
* **Restores Metadata (EXIF):** Reads the `memories_history.json` and injects the original capture dates and GPS coordinates directly into the files.
* **100% Private & Local:** The entire processing happens locally inside your browser. No files are ever uploaded to a server.
* **Bulk Processing:** Handles your entire export folder at once and provides a single, ready-to-use ZIP archive.

## 🚀 How to Use

### 1. Get your Snapchat Data
1. Open the **Snapchat App** and go to your Profile &rarr; **Settings** &rarr; **My Data**.
2. Make sure to check **"Export your Memories"** and **"Export JSON files"**.
3. Select the *entire time range* on the calendar and submit your request.
4. Once you receive the email from Snapchat, download and extract the ZIP file.

### 2. Process your Memories
1. Open the **Snapchat Memories Restorer** web app.
2. Drag and drop your extracted Snapchat export folder (usually starting with `mydata~...`) into the upload zone.
3. The app will automatically scan for media files and the `memories_history.json`.
4. Click **Start Processing**. 
5. Once finished, a new ZIP file containing your fully restored memories will be downloaded automatically.

## 🛠️ Technical Details
This project runs entirely on the client side using Vanilla JavaScript and WebAssembly. 
* **Video Processing:** Powered by `ffmpeg.wasm` (using `coi-serviceworker` to bypass CORS/SharedArrayBuffer restrictions on static hosts like GitHub Pages).
* **Image & EXIF Manipulation:** Utilizes Canvas API, `piexif.js`, and `exifr`.
* **Archiving:** 
  * **Primary (Modern Browsers):** A custom, memory-efficient `StreamingZipWriter` that streams ZIP packages directly to your local storage via the **File System Access API** (`showSaveFilePicker`), minimizing RAM overhead.
  * **Fallback (Safari/Firefox):** Uses **`JSZip`** to bundle and download the processed files in memory (automatically split into ~1.5GB chunks to prevent browser crashes).

## 💻 Development & Testing

1. **Serve locally:** You can use any local web server. For example:
   ```bash
   npx serve .
   ```
   Then open `http://localhost:3000` in your browser.

2. **Testing:** This project uses [Vitest](https://vitest.dev/) for unit testing.
   ```bash
   npm install
   npm test               # Run unit tests
   npm run test:ui        # Run tests with a UI
   npm run test:coverage  # Generate coverage report
   ```

## 📄 License & Privacy
This is a client-side only tool. Your data never leaves your device.