import { getFromCache, saveToCache } from '../cache/CacheManager.js';
import { mergeImageOverlay, applyPiexif } from './ImageProcessor.js';
import { processVideoWithFFmpeg } from './VideoProcessor.js';
import { parseSnapchatDate } from '../utils/date.js';

import { addLog } from '../ui/UIController.js';
import { t } from '../i18n.js';
import { VIDEO_EXTENSIONS, IMAGE_EXTENSIONS } from '../constants.js';
import { resolveMetadata } from '../parser/TimezoneDetector.js';
import { getCurrentLanguage } from '../state.js';

export async function getMissingMetadata(file, meta) {
  if (!meta) return { needDate: false, needLoc: false, date: null };
  const date = parseSnapchatDate(meta.dateRaw);
  let hasDate = false;
  let hasLoc = false;

  try {
    const existing = await window.exifr.parse(file, { tiff: true, ifd0: true, exif: true, gps: true, quicktime: true });
    if (existing) {
      hasDate = !!(existing.DateTimeOriginal || existing.CreateDate || existing.MediaCreateDate || existing.TrackCreateDate);
      hasLoc = existing.latitude !== undefined && existing.longitude !== undefined;
    }
  } catch (e) {}

  return {
    needDate: !hasDate && !!date,
    needLoc: !hasLoc && (meta.latitude !== null && meta.longitude !== null),
    date
  };
}

/**
 * Check if an MP4 file has a valid moov atom.
 * Files without moov are corrupt/truncated and cannot be played.
 */
function isValidMp4(buffer) {
  const view = new DataView(buffer);
  const len = buffer.byteLength;
  let offset = 0;
  
  while (offset <= len - 8) {
    const size = view.getUint32(offset);
    const type = String.fromCharCode(
      view.getUint8(offset + 4), view.getUint8(offset + 5),
      view.getUint8(offset + 6), view.getUint8(offset + 7)
    );
    
    if (type === 'moov') return true;
    
    // size 0 = extends to end, size 1 = 64-bit extended size
    if (size === 0) break;
    if (size === 1) {
      if (offset + 16 > len) break;
      const hiSize = view.getUint32(offset + 8);
      const loSize = view.getUint32(offset + 12);
      if (hiSize > 0) break; // Too large to handle
      offset += loSize;
    } else {
      if (size < 8) break; // Invalid atom size
      offset += size;
    }
  }
  return false;
}

/**
 * Process media files (Overlay & EXIF data)
 */
export async function processMediaGroup(files, meta) {
  const mid = files.main.info.mid;
  try {
    const cached = await getFromCache(mid);
    if (cached) {
      return cached;
    }
  } catch (e) {
    console.error(`Cache-Fehler für ${mid}:`, e);
  }

  const mainFile = files.main.file;
  const overlayFile = files.overlay ? files.overlay.file : null;
  const ext = mainFile.name.split('.').pop().toLowerCase();
  const isVideo = VIDEO_EXTENSIONS.has(ext);

  let { needDate, needLoc, date } = await getMissingMetadata(mainFile, meta);
  const needsOverlay = !!overlayFile;

  let currentFile = mainFile;

  let isCorruptVideo = false;
  if (isVideo) {
    const buffer = await mainFile.arrayBuffer();
    isCorruptVideo = !isValidMp4(buffer);
    if (isCorruptVideo) {
      addLog(`⚠️ ${mainFile.name}: ${t('corruptVideoWarn')}`, 'warn');
    }
  }

  if (isVideo && !isCorruptVideo && (needsOverlay || needDate || needLoc)) {
    try {
      currentFile = await processVideoWithFFmpeg(mainFile, overlayFile, needDate, needLoc, date, meta);
    } catch (err) {
      addLog(`⚠️ ${mainFile.name}: ${err.message}. ${getCurrentLanguage() === 'de' ? 'Original wird beibehalten.' : 'Original will be preserved.'}`, 'error');
      console.error(`${getCurrentLanguage() === 'de' ? 'Fehler bei' : 'Error at'} ${mainFile.name}:`, err);
    }
    const finalBuffer = await currentFile.arrayBuffer();
    try { await saveToCache(mid, finalBuffer); } catch(e) {}
    return finalBuffer;
  }

  if (!isVideo && needsOverlay && IMAGE_EXTENSIONS.has(ext)) {
    currentFile = await mergeImageOverlay(mainFile, overlayFile);
    // Canvas merge strips ALL EXIF data, so force re-application of metadata
    if (meta) {
      if (date) needDate = true;
      if (meta.latitude !== null && meta.longitude !== null) needLoc = true;
    }
  }

  if (!isVideo && IMAGE_EXTENSIONS.has(ext)) {
    const finalBuffer = await applyPiexif(currentFile, meta, needDate, needLoc, date);
    try { await saveToCache(mid, finalBuffer); } catch(e) {}
    return finalBuffer;
  }

  const finalBuffer = await currentFile.arrayBuffer();
  try { await saveToCache(mid, finalBuffer); } catch(e) {}
  return finalBuffer;
}

export async function processAndZip(mid, files, zip, history, tzOffsetMs) {
  const meta = resolveMetadata(mid, files, history, tzOffsetMs);
  const mainFile = files.main;
  const fileDate = meta ? parseSnapchatDate(meta.dateRaw) : null;
  
  let processedFile = null;
  try {
    processedFile = await processMediaGroup(files, meta);
    const filename = `${mainFile.info.prefix}_${mid}.${mainFile.info.ext}`;
    zip.file(filename, processedFile, { compression: "STORE", date: fileDate || new Date() });
  } catch (e) {
    addLog(t('errorProcessing', { file: mainFile.file.name, msg: e.message }), 'error');
  } finally {
    processedFile = null;
    if (files.main.file) files.main.file = null;
    if (files.overlay && files.overlay.file) files.overlay.file = null; 
  }
}
