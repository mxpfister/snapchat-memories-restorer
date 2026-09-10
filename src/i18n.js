import { getCurrentLanguage, setCurrentLanguage } from './state.js';
import { updateCompatibilityWarning } from './ui/UIController.js';

const i18n = {
  en: {
    // UI Labels
    readingFiles: 'Reading {count} files...',
    scanningDir: 'Scanning directory...',
    foundFiles: 'Found {count} files...',
    analyzingFiles: 'Analyzing {count} files...',
    
    // Page Headings and Descriptions
    pageTitle: 'Memories Restorer',
    pageDescription: 'Export your Snapchat photos & videos with perfect metadata.',
    localPrivate: 'Local & Private',
    
    // Why use this tool
    whyUseTitle: 'Why do you need this tool?',
    whyUseText: 'The official Snapchat export provides unfinished files: filters are separated from the image, and the recording date is missing. Without adjustment, your phone\'s file management is a mess. This tool automatically fixes everything:',
    whyUsePoint1: 'Embed filters: Texts and stickers are permanently inserted into photos/videos.',
    whyUsePoint2: 'Correct date: Original date & GPS are added. Your phone gallery sorts everything perfectly!',
    whyUsePoint3: '100% Private: Processing runs entirely locally in your browser. Nothing is uploaded!',
    
    // How to get Snapchat export
    howToGetTitle: 'How do I get my Snapchat export?',
    howToGetText: 'In the <strong>Snapchat app</strong> go to your profile &rarr; <strong>Settings</strong> &rarr; <strong>My Data</strong>. Be sure to select <strong>"Export your Memories"</strong> and <strong>"Export JSON files"</strong> at the bottom! Swipe through the <em>entire time period</em> on the calendar and submit the request.<br><br><strong>💡 Large exports:</strong> If Snapchat sends you multiple ZIP files (for exports >2GB), simply upload all folders - this tool automatically merges them!',
    
    // Step 1
    step1Title: '1. Select Snapchat folder',
    step1Description: 'Select your complete, unzipped Snapchat export folder (e.g. <code>mydata~...</code>) or the <code>memories</code> folder from a split export. The app automatically merges multiple uploads and finds all metadata!',
    selectFolder: 'Select export folder',
    dragFolder: 'Click here or drag the entire folder in',
    
    // Step 2
    step2Title: '2. Processing',
    step2Description: 'Files are matched and metadata (date & GPS) are written to photos. You get a complete ZIP archive.',
    reset: 'Reset',
    startProcessing: 'Start processing',
    
    // Status messages
    indexComplete: 'Index complete. Freeing index memory...',
    found: 'Found: {images} images, {videos} videos.',
    processing: 'Processing...',
    processingImages: 'Processing images...',
    processingVideos: 'Processing videos...',
    processingImagesPart: 'Processing images (Part {part}/{total})...',
    processingVideosPart: 'Processing videos (Part {part}/{total})...',
    
    // Download/Export
    filePickerSet: 'Save location selected. Starting processing...',
    fileSaved: 'Processing complete. Your saved ZIP file is ready.',
    downloadingPart: 'Downloading ZIP part {part}...',
    packingFiles: 'Now packing all finished files into a single ZIP archive. This may take a moment...',
    allComplete: 'Done! All files processed and downloaded.',
    streamingFiles: 'Saving finished files live & step-by-step to your file...',
    chunking: 'For memory protection, files are being split into {parts} smaller ZIP packages (max. ~1.5GB).',
    
    // Warnings & Info
    uploadHint: 'Note: Files are bundled at the end of processing.',
    offlineHint: 'Note: Since the tool runs locally/offline, the download happens at the end of processing.',
    browserHint: 'Note: Your browser downloads the entire ZIP file at once when everything is ready.',
    mobileWarning: 'Mobile devices will crash',
    mobileWarningText: 'Video processing with FFmpeg and caching many files will very likely cause a browser crash on smartphones. Please use this tool on a computer or laptop.',
    browserWarning: 'Browser compatibility',
    browserWarningText: 'Chrome and Edge are most stable here. Firefox and Safari support direct saving of large ZIP files only partially, so exports there require significantly more temporary RAM.',
    
    // Footer
    privacy100: '🔒 100% Private & Local',
    privacyDesc: 'Your files never leave your device. All processing happens in your browser. No data is uploaded to any server.',
    privacyNote: 'When loading the page, IP addresses are technically processed by the hosting provider.',
    disclaimer: 'Disclaimer',
    disclaimerText: 'This project is not affiliated with Snapchat Inc., Snap Inc., or their products. It is an independent community tool for processing export files.',
    imprint: 'Impressum',
    privacyPolicy: 'Datenschutz',
    
    // Errors
    criticalError: 'Critical error: {msg}',
    abortedByUser: 'Process aborted by user.',
    errorProcessing: 'Error processing {file}: {msg}',
    jsonParseError: 'JSON Parse error: {msg}',
    ffmpegBufferError: 'FFmpeg buffer error: {msg}',
    ffmpegError: 'FFmpeg error code {code}',
    corruptVideo: 'Video file is corrupted/unreadable',
    processingVideo: 'Processing video {name} ({percent}%)',
    ffmpegTimeout: 'Video processing timed out for {name}. Original will be preserved.',
    corruptVideoWarn: 'Original video from Snapchat is corrupted (missing moov atom). It will be saved unmodified but likely cannot be played.',
    fileEmptyHint: '💡 The ZIP file will be filled after processing completes. Please do not open it before.',
    
    // Success messages
    jsonParsed: '{count} entries parsed from JSON',
    ffmpegReady: 'Video processing files buffered.',
    ffmpegLoading: '⏳ Loading video processing engine (buffering files)... Please wait.',
    jsonFound: 'memories_history.json found',
    jsonMissing: 'memories_history.json missing',
    mediaFound: 'media files found',
    scanFolderZero: '⏳ Scanning folder... (0 files found)',
    readingFilesFound: '⏳ Reading files... ({count} found)',
    filesFoundText: '{count} files found...',
    noMediaFiles: '❌ No media files found',
    errorReadingFolder: '❌ Error reading folder: {msg}',
    multipleExportsMerged: '✨ Multiple exports merged ({sourceText})',
    jsonFoundHtml: '✅ memories_history.json found',
    jsonMissingHtml: '❌ memories_history.json missing',
    mediaFilesFoundHtml: '✅ {count} media files found',
    invalidFolder: '❌ Invalid folder: No Snapchat export files found',
    skippedOrphanedOverlay: '⚠️ Skipped orphaned overlay without main file: {name}',
  },
  de: {
    // UI Labels
    readingFiles: 'Lese {count} Dateien ein...',
    scanningDir: 'Scanne Verzeichnis...',
    foundFiles: 'Gefunden {count} Dateien...',
    analyzingFiles: 'Analysiere {count} Dateien...',
    
    // Page Headings and Descriptions
    pageTitle: 'Memories Restorer',
    pageDescription: 'Exportiere deine Snapchat Fotos & Videos originalgetreu.',
    localPrivate: 'Lokal & Privat',
    
    // Why use this tool
    whyUseTitle: 'Warum brauche ich dieses Tool?',
    whyUseText: 'Der offizielle Snapchat-Export liefert unfertige Dateien: Filter sind vom Bild getrennt, und das Aufnahmedatum fehlt. Ohne Anpassung herrscht auf deinem Handy das reinste Datei-Chaos. Dieses Tool repariert alles vollautomatisch:',
    whyUsePoint1: 'Filter einbacken: Texte und Sticker werden fest in Fotos/Videos eingefügt.',
    whyUsePoint2: 'Korrektes Datum: Original-Datum & GPS werden ergänzt. Deine Handy-Galerie sortiert alles perfekt ein!',
    whyUsePoint3: '100% Privat: Die Verarbeitung läuft rein lokal in deinem Browser. Nichts wird hochgeladen!',
    
    // How to get Snapchat export
    howToGetTitle: 'Wie erhalte ich meinen Snapchat-Export?',
    howToGetText: 'Gehe in der <strong>Snapchat App</strong> auf dein Profil &rarr; <strong>Einstellungen</strong> &rarr; <strong>Meine Daten</strong>. Wähle unten unbedingt <strong>"Deine Memorys exportieren"</strong> und <strong>"JSON-Dateien exportieren"</strong> aus! Wähle beim Kalender den <em>gesamten Zeitraum</em> aus und sende die Anfrage ab.<br><br><strong>💡 Große Exporte:</strong> Falls Snapchat dir mehrere ZIP-Dateien sendet (für Exporte >2GB), lade einfach alle Ordner hoch – dieses Tool führt sie automatisch zusammen!',
    
    // Step 1
    step1Title: '1. Snapchat Ordner auswählen',
    step1Description: 'Wähle deinen kompletten, entpackten Snapchat-Export-Ordner (z.B. <code>mydata~...</code>) oder den <code>memories</code> Ordner aus einem Split-Export. Die App vereinigt mehrere Uploads automatisch und findet alle Metadaten!',
    selectFolder: 'Export-Ordner auswählen',
    dragFolder: 'Klicke hier oder ziehe den gesamten Ordner hinein',
    
    // Step 2
    step2Title: '2. Verarbeitung',
    step2Description: 'Dateien werden abgeglichen und Metadaten (Datum & GPS) werden auf die Fotos geschrieben. Du erhältst ein vollständiges ZIP-Archiv.',
    reset: 'Zurücksetzen',
    startProcessing: 'Verarbeitung starten',
    
    // Status messages
    indexComplete: 'Index abgeschlossen. Befreie Index-Speicher...',
    found: 'Gefunden: {images} Bilder, {videos} Videos.',
    processing: 'Verarbeitung läuft...',
    processingImages: 'Verarbeite Bilder...',
    processingVideos: 'Verarbeite Videos...',
    processingImagesPart: 'Verarbeite Bilder (Paket {part}/{total})...',
    processingVideosPart: 'Verarbeite Videos (Paket {part}/{total})...',
    
    // Download/Export
    filePickerSet: 'Speicherort festgelegt. Starte Verarbeitung...',
    fileSaved: 'Verarbeitung fertig. Deine gespeicherte ZIP-Datei ist nun bereit.',
    downloadingPart: 'Lade ZIP-Teil {part} herunter...',
    packingFiles: 'Packe nun alle fertigen Dateien in ein einzelnes ZIP-Archiv. Das kann kurz dauern...',
    allComplete: 'Fertig! Alle Dateien verarbeitet und heruntergeladen.',
    streamingFiles: 'Speichere fertige Dateien live & Schritt-für-Schritt in deine Datei...',
    chunking: 'Zum Speicherschutz werden die Dateien in {parts} kleinere ZIP-Pakete (max. ~1.5GB) aufgeteilt.',
    
    // Warnings & Info
    uploadHint: 'Hinweis: Dateien werden erst am Ende der Verarbeitung gebündelt heruntergeladen.',
    offlineHint: 'Hinweis: Da das Tool lokal/offline läuft, erfolgt der Download erst am Ende der Verarbeitung.',
    browserHint: 'Hinweis: Dein Browser lädt die gesamte ZIP-Datei auf einmal herunter, sobald alles fertig ist.',
    mobileWarning: 'Mobilgeräte werden streiken',
    mobileWarningText: 'Die Videoverarbeitung mit FFmpeg und das Zwischenspeichern vieler Dateien wird auf Smartphones sehr wahrscheinlich zu einem Browser-Absturz führen. Bitte nutze dieses Tool am Computer oder Laptop.',
    browserWarning: 'Browser-Kompatibilität',
    browserWarningText: 'Chrome und Edge sind hier am stabilsten. Firefox und Safari unterstützen das direkte Speichern großer ZIP-Dateien nur eingeschränkt, daher braucht der Export dort deutlich mehr temporären Arbeitsspeicher.',
    
    // Footer
    privacy100: '🔒 100% Privat & Lokal',
    privacyDesc: 'Deine Dateien verlassen niemals dein Gerät. Die gesamte Verarbeitung findet in deinem Browser statt. Es werden keine Daten auf einen Server geladen.',
    privacyNote: 'Beim Aufruf der Seite werden technisch bedingt IP-Adressen vom Hosting-Provider verarbeitet.',
    disclaimer: 'Disclaimer',
    disclaimerText: 'Dieses Projekt steht in keiner Verbindung mit Snapchat Inc., Snap Inc. oder deren Produkten. Es ist ein unabhängiges Community-Tool zur Verarbeitung von Export-Dateien.',
    imprint: 'Impressum',
    privacyPolicy: 'Datenschutz',
    
    // Errors
    criticalError: 'Kritischer Fehler: {msg}',
    abortedByUser: 'Der Prozess wurde durch den Benutzer abgebrochen.',
    errorProcessing: 'Fehler bei {file}: {msg}',
    jsonParseError: 'JSON-Parse Fehler: {msg}',
    ffmpegBufferError: 'FFmpeg-Pufferfehler: {msg}',
    ffmpegError: 'FFmpeg Fehler Code {code}',
    corruptVideo: 'Video-Datei ist korrupt/unlesbar',
    processingVideo: 'Verarbeite Video {name} ({percent}%)',
    ffmpegTimeout: 'Zeitüberschreitung bei der Videoverarbeitung von {name}. Original wird beibehalten.',
    corruptVideoWarn: 'Original-Video von Snapchat ist beschädigt (moov-Atom fehlt). Es wird unmodifiziert gespeichert, lässt sich aber vermutlich nicht abspielen.',
    fileEmptyHint: '💡 Die ZIP-Datei wird erst nach Abschluss der Verarbeitung gefüllt. Bitte nicht vorher öffnen.',
    
    // Success messages
    jsonParsed: '{count} Einträge aus JSON geparst',
    ffmpegReady: 'Videoverarbeitungs-Dateien gepuffert.',
    ffmpegLoading: '⏳ Lade Videoverarbeitungs-Engine (Dateien puffern)... Bitte warten.',
    jsonFound: 'memories_history.json gefunden',
    jsonMissing: 'memories_history.json fehlt',
    mediaFound: 'Mediadateien gefunden',
    scanFolderZero: '⏳ Scanne Ordner... (0 Dateien gefunden)',
    readingFilesFound: '⏳ Lese Dateien... ({count} gefunden)',
    filesFoundText: '{count} Dateien gefunden...',
    noMediaFiles: '❌ Keine Mediadateien gefunden',
    errorReadingFolder: '❌ Fehler beim Lesen des Ordners: {msg}',
    multipleExportsMerged: '✨ Mehrere Exports zusammengefügt ({sourceText})',
    jsonFoundHtml: '✅ memories_history.json gefunden',
    jsonMissingHtml: '❌ memories_history.json fehlt',
    mediaFilesFoundHtml: '✅ {count} Mediadateien gefunden',
    invalidFolder: '❌ Ungültiger Ordner: Keine Snapchat-Exportdateien gefunden',
    skippedOrphanedOverlay: '⚠️ Overlay ohne zugehörige Hauptdatei übersprungen: {name}',
  },
};

export function t(key, params = {}) {
  const currentLanguage = getCurrentLanguage();
  const text = i18n[currentLanguage][key] || i18n.en[key] || key;
  let result = text;
  for (const [param, value] of Object.entries(params)) {
    result = result.replace(`{${param}}`, value);
  }
  return result;
}

export function setLanguage(lang) {
  setCurrentLanguage(lang);
  localStorage.setItem('lang', lang);
  
  // Update button states
  const langEnBtn = document.getElementById('langEnBtn');
  const langDeBtn = document.getElementById('langDeBtn');
  if (langEnBtn) {
    langEnBtn.classList.toggle('active', lang === 'en');
    langEnBtn.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  }
  if (langDeBtn) {
    langDeBtn.classList.toggle('active', lang === 'de');
    langDeBtn.setAttribute('aria-pressed', lang === 'de' ? 'true' : 'false');
  }
  
  updateCompatibilityWarning();
  updatePageLanguage();
}

export function updatePageLanguage() {
  const currentLanguage = getCurrentLanguage();

  // Update page heading and description
  const headerBadge = document.querySelector('.header-badge span');
  if (headerBadge) headerBadge.textContent = t('localPrivate');
  
  const h1 = document.querySelector('h1');
  if (h1) h1.textContent = t('pageTitle');
  
  const headerDesc = document.querySelector('.header p');
  if (headerDesc) headerDesc.textContent = t('pageDescription');
  
  // Update compatibility warning heading
  const compatWarningH3 = document.querySelector('#compatWarning h3');
  if (compatWarningH3) compatWarningH3.textContent = currentLanguage === 'de' ? '⚠️ Wichtige Systemanforderungen' : '⚠️ Important System Requirements';
  // Update section headings and descriptions - Why use this tool
  // Find the section with 💡 in the h2
  const allSections = document.querySelectorAll('section');
  for (const section of allSections) {
    const h2 = section.querySelector('h2');
    if (h2 && h2.textContent.includes('💡')) {
      h2.textContent = '💡 ' + t('whyUseTitle');
      const p = section.querySelector('p');
      if (p) p.textContent = t('whyUseText');
      
      // Update bullet points
      const ul = section.querySelector('ul');
      if (ul) {
        const lis = ul.querySelectorAll('li');
        if (lis[0]) lis[0].innerHTML = '<strong>✨ ' + t('whyUsePoint1').split(':')[0] + ':</strong> ' + t('whyUsePoint1').split(':')[1];
        if (lis[1]) lis[1].innerHTML = '<strong>🗓️ ' + t('whyUsePoint2').split(':')[0] + ':</strong> ' + t('whyUsePoint2').split(':')[1];
        if (lis[2]) lis[2].innerHTML = '<strong>🔐 ' + t('whyUsePoint3').split(':')[0] + ':</strong> ' + t('whyUsePoint3').split(':')[1];
      }
      break;
    }
  }
  
  // Update "How to get Snapchat export" section - find by h2 text content
  const sections = document.querySelectorAll('section');
  for (const section of sections) {
    const h2 = section.querySelector('h2');
    if (h2 && (h2.textContent.includes('How do I') || h2.textContent.includes('Wie erhalte'))) {
      h2.textContent = t('howToGetTitle');
      const p = section.querySelector('p');
      if (p) p.innerHTML = t('howToGetText');
      break;
    }
  }
  
  for (const section of sections) {
    const h2 = section.querySelector('h2');
    if (h2 && (h2.textContent.includes('Snapchat Ordner') || h2.textContent.includes('Select Snapchat') || h2.textContent.includes('1.'))) {
      h2.textContent = t('step1Title');
      const p = section.querySelector('p');
      if (p) p.innerHTML = t('step1Description');
      
      const uploadZone = section.querySelector('.upload-zone');
      if (uploadZone) {
        const strong = uploadZone.querySelector('strong');
        const span = uploadZone.querySelector('span');
        if (strong) strong.textContent = t('selectFolder');
        if (span) span.textContent = t('dragFolder');
        uploadZone.setAttribute('aria-label', currentLanguage === 'de' ? 'Ordner hochladen' : 'Upload folder');
      }
    }
  }
  
  // Update Step 2 (Processing)
  for (const section of sections) {
    const h2 = section.querySelector('h2');
    if (h2 && (h2.textContent.includes('Verarbeitung') || h2.textContent.includes('Processing') || h2.textContent.includes('2.'))) {
      h2.textContent = t('step2Title');
      const p = section.querySelector('p');
      if (p) p.innerHTML = t('step2Description');
      
      const progressSection = section.querySelector('.progress-section');
      if (progressSection) {
        progressSection.setAttribute('aria-label', currentLanguage === 'de' ? 'Fortschritt' : 'Progress');
      }
      
      const actions = section.querySelector('.actions');
      if (actions) {
        const btns = actions.querySelectorAll('.btn');
        for (const btn of btns) {
          if (btn.classList.contains('btn-secondary')) btn.textContent = t('reset');
          if (btn.classList.contains('btn-primary')) btn.textContent = t('startProcessing');
        }
      }
    }
  }
  
  // Update footer
  const footer = document.querySelector('footer');
  if (footer) {
    const footerParagraphs = footer.querySelectorAll('p');
    if (footerParagraphs[0]) footerParagraphs[0].innerHTML = `<strong>${t('privacy100')}:</strong> ${t('privacyDesc')}`;
    if (footerParagraphs[1]) footerParagraphs[1].textContent = t('privacyNote');
    if (footerParagraphs[2]) footerParagraphs[2].innerHTML = `<strong>⚖️ ${t('disclaimer')}:</strong> ${t('disclaimerText')}`;
    
    // Update footer links
    const footerLinks = footer.querySelectorAll('.footer-link');
    if (footerLinks.length >= 2) {
      footerLinks[0].textContent = t('imprint');
      footerLinks[1].textContent = t('privacyPolicy');
    }
  }
}

export function initLanguage() {
  const saved = localStorage.getItem('lang');
  if (saved && (saved === 'en' || saved === 'de')) {
    setCurrentLanguage(saved);
  } else {
    setCurrentLanguage('en'); // Default to English
  }
  
  const currentLanguage = getCurrentLanguage();
  const langEnBtn = document.getElementById('langEnBtn');
  const langDeBtn = document.getElementById('langDeBtn');
  if (langEnBtn) langEnBtn.classList.toggle('active', currentLanguage === 'en');
  if (langDeBtn) langDeBtn.classList.toggle('active', currentLanguage === 'de');
  
  updatePageLanguage();
}
