'use strict';

const TARGET_W = 128;
const TARGET_H = 138;

const dropZone     = document.getElementById('dropZone');
const fileInput    = document.getElementById('fileInput');
const optionsPanel = document.getElementById('optionsPanel');
const previewSec   = document.getElementById('previewSection');
const actionsRow   = document.getElementById('actionsRow');
const origCanvas   = document.getElementById('originalCanvas');
const outCanvas    = document.getElementById('outputCanvas');
const origDims     = document.getElementById('origDims');
const keepAspect   = document.getElementById('keepAspect');
const fillColor    = document.getElementById('fillColor');
const fillRow      = document.getElementById('fillColorRow');
const downloadBtn  = document.getElementById('downloadBtn');
const themeToggle  = document.getElementById('themeToggle');

let currentImage = null;

// ── Theme ────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.body.className = theme;
  themeToggle.textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
}

themeToggle.addEventListener('click', () => {
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

const savedTheme = localStorage.getItem('theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
applyTheme(savedTheme || preferredTheme);

// ── Drop zone ─────────────────────────────────────────────────────────────────

dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

// ── File loading ──────────────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/bmp']);
const ALLOWED_EXT   = /\.(jpe?g|png|bmp)$/i;

function loadFile(file) {
  if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXT.test(file.name)) {
    alert('Unsupported file type. Please use JPG, PNG, or BMP.');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      drawOriginal(img);
      convertImage(img);
      optionsPanel.hidden = false;
      previewSec.hidden   = false;
      actionsRow.hidden   = false;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Original preview ──────────────────────────────────────────────────────────

function drawOriginal(img) {
  const maxW = 380, maxH = 320;
  const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
  origCanvas.width  = Math.round(img.naturalWidth  * scale);
  origCanvas.height = Math.round(img.naturalHeight * scale);
  const ctx = origCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0, origCanvas.width, origCanvas.height);
  origDims.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
}

// ── Conversion ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function convertImage(img) {
  const ctx = outCanvas.getContext('2d');
  ctx.clearRect(0, 0, TARGET_W, TARGET_H);

  if (keepAspect.checked) {
    const [r, g, b] = hexToRgb(fillColor.value);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, TARGET_W, TARGET_H);

    const scale  = Math.min(TARGET_W / img.naturalWidth, TARGET_H / img.naturalHeight);
    const destW  = Math.round(img.naturalWidth  * scale);
    const destH  = Math.round(img.naturalHeight * scale);
    const offX   = Math.round((TARGET_W - destW) / 2);
    const offY   = Math.round((TARGET_H - destH) / 2);
    ctx.drawImage(img, offX, offY, destW, destH);
  } else {
    ctx.drawImage(img, 0, 0, TARGET_W, TARGET_H);
  }
}

// ── Option listeners ──────────────────────────────────────────────────────────

keepAspect.addEventListener('change', () => {
  fillRow.style.display = keepAspect.checked ? '' : 'none';
  if (currentImage) convertImage(currentImage);
});

fillColor.addEventListener('input', () => {
  if (currentImage) convertImage(currentImage);
});

// ── BMP encoder ───────────────────────────────────────────────────────────────

function encodeCanvasToBmp(canvas) {
  const ctx       = canvas.getContext('2d');
  const imgData   = ctx.getImageData(0, 0, TARGET_W, TARGET_H);
  const pixels    = imgData.data;              // RGBA, top-to-bottom

  const rowBytes  = TARGET_W * 3;             // 384 — already 4-byte aligned
  const pixelSize = rowBytes * TARGET_H;      // 52992
  const fileSize  = 54 + pixelSize;           // 53046

  const buf  = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  let pos = 0;

  function writeU8(v)  { view.setUint8(pos++, v); }
  function writeU16(v) { view.setUint16(pos, v, true); pos += 2; }
  function writeU32(v) { view.setUint32(pos, v, true); pos += 4; }
  function writeI32(v) { view.setInt32(pos, v, true);  pos += 4; }

  // BITMAPFILEHEADER
  writeU8(0x42); writeU8(0x4D);   // "BM"
  writeU32(fileSize);
  writeU32(0);                     // reserved
  writeU32(54);                    // pixel data offset

  // BITMAPINFOHEADER
  writeU32(40);                    // header size
  writeI32(TARGET_W);
  writeI32(TARGET_H);              // positive = bottom-up
  writeU16(1);                     // color planes
  writeU16(24);                    // bits per pixel
  writeU32(0);                     // BI_RGB (no compression)
  writeU32(pixelSize);
  writeI32(0);                     // X pixels/meter
  writeI32(0);                     // Y pixels/meter
  writeU32(0);                     // colors in table
  writeU32(0);                     // important colors

  // Pixel data — bottom-up rows, BGR order
  for (let row = TARGET_H - 1; row >= 0; row--) {
    for (let col = 0; col < TARGET_W; col++) {
      const i = (row * TARGET_W + col) * 4;
      writeU8(pixels[i + 2]); // B
      writeU8(pixels[i + 1]); // G
      writeU8(pixels[i + 0]); // R
    }
  }

  return new Blob([buf], { type: 'image/bmp' });
}

// ── Download ──────────────────────────────────────────────────────────────────

downloadBtn.addEventListener('click', () => {
  if (!currentImage) return;
  const blob = encodeCanvasToBmp(outCanvas);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'baofeng_boot.bmp';
  a.click();
  URL.revokeObjectURL(url);
});
