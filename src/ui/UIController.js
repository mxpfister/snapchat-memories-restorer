import { getJsonFile, getMediaFiles, getUploadSources, getStatusLog, setStatusLog, getIsScanning, getIsAborted, getCurrentLanguage, getProcessingStartTime } from '../state.js';
import { formatBytes, escapeHtml } from '../utils/formatting.js';
import { t } from '../i18n.js';

/**
 * Update UI based on current state
 */
export function updateUI() {
  document.getElementById('folderList').innerHTML = '';
  
  if (!getJsonFile() && getMediaFiles().length === 0) {
    document.getElementById('folderList').classList.remove('file-list--empty');
    document.getElementById('folderList').innerHTML = `<div class="file-item"><span class="file-item__name text-error">${t('invalidFolder')}</span></div>`;
    console.warn('Invalid folder selected: No JSON and no media files found.');
  } else {
    document.getElementById('folderList').classList.remove('file-list--empty');
    
    // Show multi-ZIP merge info
    if (getUploadSources().length > 1) {
      const sourceText = getUploadSources().map(s => s.name).join(', ');
      document.getElementById('folderList').innerHTML += `<div class="file-item"><span class="file-item__name text-success">${t('multipleExportsMerged', { sourceText })}</span></div>`;
    }
    
    if (getJsonFile()) {
        document.getElementById('folderList').innerHTML += `<div class="file-item"><span class="file-item__name">${t('jsonFoundHtml')}</span><span class="file-item__size">${formatBytes(getJsonFile().size)}</span></div>`;
    } else {
        document.getElementById('folderList').innerHTML += `<div class="file-item"><span class="file-item__name text-error">${t('jsonMissingHtml')}</span></div>`;
    }
    
    if (getMediaFiles().length > 0) {
        const totalSize = getMediaFiles().reduce((sum, file) => sum + file.size, 0);
        document.getElementById('folderList').innerHTML += `<div class="file-item"><span class="file-item__name">${t('mediaFilesFoundHtml', { count: getMediaFiles().length })}</span><span class="file-item__size">${formatBytes(totalSize)}</span></div>`;
    } else {
        document.getElementById('folderList').innerHTML += `<div class="file-item"><span class="file-item__name text-error">${t('noMediaFiles')}</span></div>`;
    }
  }

  document.getElementById('processBtn').disabled = !getJsonFile() || getMediaFiles().length === 0;
}

/**
 * Update status display
 */
export function updateStatus() {
  const html = getStatusLog()
    .map((entry) => {
      let className = '';
      if (entry.type === 'ok') className = 'status-item--ok';
      else if (entry.type === 'error') className = 'status-item--error';
      return `<div class="status-item ${className}">${escapeHtml(entry.msg)}</div>`;
    })
    .join('');
  document.getElementById('statusBox').innerHTML = html;
  document.getElementById('statusBox').classList.add('status-box--visible');
  document.getElementById('statusBox').scrollTop = document.getElementById('statusBox').scrollHeight;
}

/**
 * @param {string|null} id - If provided, this will overwrite an existing log entry with the same ID
 */
export function addLog(msg, type = 'info', id = null) {
  if (id) {
    const existingIndex = getStatusLog().findIndex(item => item.id === id);
    if (existingIndex !== -1) {
      getStatusLog()[existingIndex] = { msg, type, id };
      updateStatus();
      return;
    }
  }
  
  getStatusLog().push({ msg, type, id });
  updateStatus();
}

export function updateCompatibilityWarning() {
  if (!document.getElementById('compatWarning') || !document.getElementById('compatWarningList')) return;

  const ua = navigator.userAgent || '';
  const uaData = navigator.userAgentData;
  const isMobile = (uaData && uaData.mobile) || /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && matchMedia('(pointer: coarse)').matches);
  const isFirefox = /Firefox/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua);
  const supportsSavePicker = 'showSaveFilePicker' in window && window.isSecureContext;

  const messages = [];

  if (isMobile) {
    messages.push({
      title: t('mobileWarning'),
      text: t('mobileWarningText'),
    });
  }

  if (!supportsSavePicker || isFirefox || isSafari) {
    messages.push({
      title: t('browserWarning'),
      text: t('browserWarningText'),
    });
  }

  if (messages.length === 0) {
    document.getElementById('compatWarning').hidden = true;
    document.getElementById('compatWarningList').innerHTML = '';
    return;
  }

  document.getElementById('compatWarning').hidden = false;
  document.getElementById('compatWarningList').innerHTML = messages.map((message) => `
    <p class="compat-warning-item">
      <strong>${message.title}:</strong> ${message.text}
    </p>
  `).join('');
}
