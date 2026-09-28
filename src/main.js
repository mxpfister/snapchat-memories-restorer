import { t, initLanguage, setLanguage } from './i18n.js';
import { getJsonFile, setJsonFile, getMediaFiles, setMediaFiles, getStatusLog, setStatusLog, getIsScanning, setIsScanning, getIsAborted, setIsAborted, setUploadSources, getFfmpegInstance, setFfmpegInstance, setFfmpegLoadError, getProcessingStartTime, setProcessingStartTime, getWakeLockSentinel, getCurrentLanguage } from './state.js';
import { handleDragOver, handleDragLeave, handleFolderDrop, scanFiles } from './scanner/FolderScanner.js';
import { updateUI, addLog, updateCompatibilityWarning, updateStatus } from './ui/UIController.js';
import { updateProgress } from './ui/ProgressManager.js';
import { requestWakeLock, releaseWakeLock } from './ui/WakeLockManager.js';
import { parseJsonHistory, extractMediaInfo } from './parser/JsonHistoryParser.js';
import { detectTimezoneOffset, resolveMetadata } from './parser/TimezoneDetector.js';
import { StreamingZipWriter } from './zip/StreamingZipWriter.js';
import { processMediaGroup, processAndZip } from './processing/MediaProcessor.js';
import { clearCache, requestPersistentStorage } from './cache/CacheManager.js';
import { asyncPool } from './utils/async-pool.js';
import { parseSnapchatDate } from './utils/date.js';
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from './constants.js';
/**
 * Prevent accidental tab closure during processing
 */
function preventClose(e) {
  e.preventDefault();
  e.returnValue = '';
}

/**
 * Clear all data
 */
function handleClear() {
  setIsAborted(true); // Signal active runs to stop
  releaseWakeLock().catch(e => console.warn('Error releasing wake lock:', e));
  if (getFfmpegInstance()) {
    try {
      getFfmpegInstance().terminate(); // Force kill running FFmpeg
    } catch (e) {}
    setFfmpegInstance(null);
  }

  setJsonFile(null);
  setMediaFiles([]);
  setStatusLog([]);
  setUploadSources([]);
  setFfmpegLoadError(null); // Reset FFmpeg error state text
  document.getElementById('folderList').classList.add('file-list--empty');
  document.getElementById('statusBox').classList.remove('status-box--visible');
  document.getElementById('progressSection').classList.remove('progress-section--visible');
  document.getElementById('processBtn').disabled = false;
  document.getElementById('folderInput').value = '';
  updateProgress(0, 1);
  updateUI();
}

/**
 * Process memories
 */
async function handleProcess() {
  setIsAborted(false);
  setStatusLog([]);
  document.getElementById('progressSection').classList.add('progress-section--visible');
  document.getElementById('processBtn').disabled = true;
  
  // UX: Prevent accidental tab close
  window.addEventListener('beforeunload', preventClose);
  
  // UX: Show processing banner with elapsed timer
  const processingBanner = document.getElementById('processingBanner');
  const elapsedTimeEl = document.getElementById('elapsedTime');
  const processingBannerText = document.getElementById('processingBannerText');
  if (processingBanner) processingBanner.hidden = false;
  if (processingBannerText) {
    processingBannerText.textContent = getCurrentLanguage() === 'de'
      ? 'Verarbeitung aktiv \u2014 bitte diesen Tab geöffnet lassen'
      : 'Processing active \u2014 please keep this tab open';
  }
  setProcessingStartTime(Date.now());
  const timerInterval = setInterval(() => { const processingStartTime = getProcessingStartTime();
    const elapsed = Date.now() - processingStartTime;
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    if (elapsedTimeEl) elapsedTimeEl.textContent = `\u23f1\ufe0f ${mins}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
  document.getElementById('progressFill').classList.add('progress-bar__fill--processing');
  
  // Request persistent storage for larger quota limits
  await requestPersistentStorage();
  
  await requestWakeLock();
  
  let writableStream = null;
  let fileHandle = null;

  if ('showSaveFilePicker' in window) {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: `snapchat-export-${new Date().toISOString().split('T')[0]}.zip`,
        types: [{
          description: 'ZIP Archiv',
          accept: { 'application/zip': ['.zip'] },
        }],
      });
      writableStream = await fileHandle.createWritable();
      addLog(t('filePickerSet'), 'ok');
      addLog(t('fileEmptyHint'), 'warn');
    } catch (e) {
      if (e.name === 'AbortError') {
        document.getElementById('progressSection').classList.remove('progress-section--visible');
        document.getElementById('processBtn').disabled = false;
        window.removeEventListener('beforeunload', preventClose);
        if (processingBanner) processingBanner.hidden = true;
        clearInterval(timerInterval);
        document.getElementById('progressFill').classList.remove('progress-bar__fill--processing');
        setProcessingStartTime(null);
        document.title = 'Snapchat Memories Restorer';
        return;
      }
      addLog(t('uploadHint'), 'warn');
    }
  } else {
    if (!window.isSecureContext) {
      addLog(t('offlineHint'), 'warn');
    } else {
      addLog(t('browserHint'), 'warn');
    }
  }

  try {
    const history = await parseJsonHistory();

    // Auto-detect timezone offset BEFORE indexing
    const tzOffsetMs = detectTimezoneOffset(getMediaFiles(), history);

    const mediaMap = new Map();

    for (const file of getMediaFiles()) {
      const info = extractMediaInfo(file.name);
      if (!info) continue;

      if (!mediaMap.has(info.mid)) {
        mediaMap.set(info.mid, {});
      }
      mediaMap.get(info.mid)[info.type] = { file, info };
    }
    addLog(`\ud83d\udcc1 ${t('indexComplete')}`);
    setMediaFiles([]);

    const allGroups = Array.from(mediaMap.entries());

    // Filter out groups without a main file (e.g. orphaned overlays from split exports)
    const validGroups = allGroups.filter(([mid, files]) => {
      if (!files.main) {
        const overlayName = files.overlay?.file?.name || mid;
        addLog(t('skippedOrphanedOverlay', { name: overlayName }), 'warn');
        return false;
      }
      return true;
    });
    
    const imageGroups = validGroups.filter(([_, files]) => {
      const ext = files.main.info.ext.toLowerCase();
      return IMAGE_EXTENSIONS.has(ext);
    });
    
    const videoGroups = validGroups.filter(([_, files]) => {
      const ext = files.main.info.ext.toLowerCase();
      return VIDEO_EXTENSIONS.has(ext);
    });

    addLog(t('found', { images: imageGroups.length, videos: videoGroups.length }), 'ok');
    
    let globalProcessed = 0;
    const totalToProcess = validGroups.length;

    if (writableStream) {
      // ─── Streaming path: write each file directly to disk ───
      const zipWriter = new StreamingZipWriter(writableStream);

      if (imageGroups.length > 0) {
        addLog(t('processingImages'));
        for (const [mid, files] of imageGroups) {
          if (getIsAborted()) break;
          const meta = resolveMetadata(mid, files, history, tzOffsetMs);
          const mainFile = files.main;
          try {
            const processedBuffer = await processMediaGroup(files, meta);
            const filename = `${mainFile.info.prefix}_${mid}.${mainFile.info.ext}`;
            const fileDate = meta ? parseSnapchatDate(meta.dateRaw) : null;
            await zipWriter.addFile(filename, processedBuffer, fileDate);
          } catch (e) {
            addLog(t('errorProcessing', { file: mainFile.file ? mainFile.file.name : mid, msg: e.message }), 'error');
          } finally {
            if (files.main.file) files.main.file = null;
            if (files.overlay && files.overlay.file) files.overlay.file = null;
          }
          globalProcessed++;
          updateProgress(globalProcessed, totalToProcess);
        }
      }

      if (videoGroups.length > 0) {
        addLog(t('processingVideos'));
        
        let videoCounter = 0;
        const RESET_THRESHOLD = 10;

        for (const group of videoGroups) {
            if (getIsAborted()) break;

            if (videoCounter > 0 && videoCounter % RESET_THRESHOLD === 0) {
                if (getFfmpegInstance()) {
                    console.log('Resetting FFmpeg to prevent memory issues...');
                    await getFfmpegInstance().terminate();
                    setFfmpegInstance(null);
                }
            }

            const [mid, files] = group;
            const meta = resolveMetadata(mid, files, history, tzOffsetMs);
            const mainFile = files.main;
            try {
              const processedBuffer = await processMediaGroup(files, meta);
              const filename = `${mainFile.info.prefix}_${mid}.${mainFile.info.ext}`;
              const fileDate = meta ? parseSnapchatDate(meta.dateRaw) : null;
              await zipWriter.addFile(filename, processedBuffer, fileDate);
            } catch (e) {
              addLog(t('errorProcessing', { file: mainFile.file ? mainFile.file.name : mid, msg: e.message }), 'error');
            } finally {
              if (files.main.file) files.main.file = null;
              if (files.overlay && files.overlay.file) files.overlay.file = null;
            }
            
            globalProcessed++;
            updateProgress(globalProcessed, totalToProcess);
            videoCounter++;
        }
      }

      setStatusLog(getStatusLog().filter(item => item.id !== 'current_video'));
      updateStatus();

      addLog(t('streamingFiles'), 'ok');
      await zipWriter.finalize();
      addLog(t('fileSaved'), 'ok');
    } else {
      // ─── Fallback path: chunked in-memory download (unchanged) ───
      const TARGET_CHUNK_BYTES = 1500 * 1000 * 1000; // ~1,5 GB
      const memoryChunks = [];
      let currentChunk = [];
      let currentChunkSize = 0;

      for (const group of validGroups) {
        const [mid, ObjectFiles] = group;
        let size = ObjectFiles.main.file.size;
        if (ObjectFiles.overlay) {
          size += ObjectFiles.overlay.file.size;
        }

        if (currentChunkSize + size > TARGET_CHUNK_BYTES && currentChunk.length > 0) {
          memoryChunks.push(currentChunk);
          currentChunk = [];
          currentChunkSize = 0;
        }
        
        currentChunk.push(group);
        currentChunkSize += size;
      }
      
      if (currentChunk.length > 0) {
        memoryChunks.push(currentChunk);
      }

      const totalParts = memoryChunks.length;
      let partNumber = 1;
      
      if (totalParts > 1) {
        addLog(t('chunking', { parts: totalParts }), 'info');
      }

      for (const chunk of memoryChunks) {
        const chunkZip = new window.JSZip();
        
        const cImages = chunk.filter(([_, f]) => IMAGE_EXTENSIONS.has(f.main.info.ext.toLowerCase()));
        const cVideos = chunk.filter(([_, f]) => VIDEO_EXTENSIONS.has(f.main.info.ext.toLowerCase()));
        
        if (cImages.length > 0) {
          addLog(t('processingImagesPart', { part: partNumber, total: totalParts }));
          await asyncPool(cImages, async ([mid, files]) => {
            await processAndZip(mid, files, chunkZip, history, tzOffsetMs);
            globalProcessed++;
            updateProgress(globalProcessed, totalToProcess);
          }, 2);
        }
        
        if (cVideos.length > 0) {
            addLog(t('processingVideosPart', { part: partNumber, total: totalParts }));
            
            let chunkVideoCounter = 0;
            const CHUNK_RESET_LIMIT = 5;

            for (const group of cVideos) {
                if (getIsAborted()) break;

                if (chunkVideoCounter > 0 && chunkVideoCounter % CHUNK_RESET_LIMIT === 0) {
                    if (getFfmpegInstance()) {
                        console.log('Resetting FFmpeg for memory protection between video chunks...');
                        await getFfmpegInstance().terminate();
                        setFfmpegInstance(null);
                    }
                }

                const [mid, files] = group;
                await processAndZip(mid, files, chunkZip, history, tzOffsetMs);
                
                globalProcessed++;
                updateProgress(globalProcessed, totalToProcess);
                chunkVideoCounter++;
            }
        }
        
        setStatusLog(getStatusLog().filter(item => item.id !== 'current_video'));
        updateStatus();
        
        addLog(t('downloadingPart', { part: partNumber }), 'info');
        const zipBlob = await chunkZip.generateAsync({ 
          type: 'blob',
          compression: 'STORE',
        });
        
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = totalParts > 1 ? `snapchat-export-part${partNumber}.zip` : `snapchat-export-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        partNumber++;
      }
      addLog(t('allComplete'), 'ok');
    }

  } catch (e) {
    if (getIsAborted()) {
      addLog(t('abortedByUser'), 'warn');
    } else {
      addLog(t('criticalError', { msg: e.message }), 'error');
      console.error(e);
    }
  } finally {
    await releaseWakeLock();
    window.removeEventListener('beforeunload', preventClose);
    
    // UX: Hide processing banner, stop timer, reset title
    if (processingBanner) processingBanner.hidden = true;
    clearInterval(timerInterval);
    document.getElementById('progressFill').classList.remove('progress-bar__fill--processing');
    setProcessingStartTime(null);
    document.title = 'Snapchat Memories Restorer';
    
    if (getFfmpegInstance()) {
      try {
        await getFfmpegInstance().terminate();
      } catch (err) {}
      setFfmpegInstance(null);
    }
    
    if (!getIsAborted()) {
      try { await clearCache(); } catch(e) {}
    }
    
    document.getElementById('processBtn').disabled = false;
  }
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Language Switcher
  const langEnBtn = document.getElementById('langEnBtn');
  const langDeBtn = document.getElementById('langDeBtn');
  
  if (langEnBtn) langEnBtn.addEventListener('click', () => setLanguage('en'));
  if (langDeBtn) langDeBtn.addEventListener('click', () => setLanguage('de'));

  // Folder Zone
  document.getElementById('folderZone').addEventListener('dragover', handleDragOver);
  document.getElementById('folderZone').addEventListener('dragleave', handleDragLeave);
  document.getElementById('folderZone').addEventListener('drop', handleFolderDrop);
  document.getElementById('folderZone').addEventListener('click', () => {
    if (!getIsScanning()) document.getElementById('folderInput').click();
  });
  document.getElementById('folderZone').addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !getIsScanning()) {
      document.getElementById('folderInput').click();
    }
  });

  // Re-request wake lock if page becomes visible during processing
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && (!getIsAborted() || getWakeLockSentinel())) {
      await requestWakeLock();
    }
  });

  // File Input (Directory Picker)
  document.getElementById('folderInput').addEventListener('change', async (e) => {
    if (e.target.files.length && !getIsScanning()) {
      setIsScanning(true);
      document.getElementById('folderList').classList.remove('file-list--empty');
      document.getElementById('folderList').innerHTML = `<div class="file-item"><span class="file-item__name">⏳ ${t('readingFiles', { count: e.target.files.length })}</span></div>`;
      
      document.getElementById('progressSection').classList.add('progress-section--visible');
      document.getElementById('progressFill').style.width = '100%';
      document.getElementById('progressFill').style.transition = 'none';
      document.getElementById('progressText').textContent = t('readingFiles', { count: e.target.files.length });
      
      await new Promise(r => setTimeout(r, 50));
      await scanFiles(Array.from(e.target.files));
      
      setIsScanning(false);
      document.getElementById('progressSection').classList.remove('progress-section--visible');
      document.getElementById('progressFill').style.transition = '';
    }
  });

  // Buttons
  document.getElementById('clearBtn').addEventListener('click', handleClear);
  document.getElementById('processBtn').addEventListener('click', handleProcess);

  updateCompatibilityWarning();
}

document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  initEventListeners();
});
