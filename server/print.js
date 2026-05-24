/**
 * خدمة الطباعة المحلية الصامتة
 *
 * الخطوات:
 *   1) استقبال HTML من التطبيق
 *   2) حفظه كملف مؤقت
 *   3) استدعاء Edge/Chrome headless لتحويله إلى PDF
 *   4) طباعة الـ PDF بصمت عبر pdf-to-printer (SumatraPDF المضمّن)
 *
 * نتيجة: لا مربعات حوار، لا معاينات، طباعة مباشرة على الطابعة الافتراضية.
 */

import { exec } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { print, getPrinters, getDefaultPrinter } from 'pdf-to-printer';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

let cachedBrowser = null;
function findBrowser() {
  if (cachedBrowser) return cachedBrowser;
  for (const p of [...EDGE_PATHS, ...CHROME_PATHS]) {
    if (existsSync(p)) {
      cachedBrowser = p;
      return p;
    }
  }
  return null;
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const quotedArgs = args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ');
    const fullCmd = `"${cmd}" ${quotedArgs}`;
    exec(fullCmd, { windowsHide: true, timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

/* ────────────────────────────────────────────
   HTML → PDF عبر Edge/Chrome headless
   ──────────────────────────────────────────── */
async function htmlToPdf(htmlPath, pdfPath, options = {}) {
  const browser = findBrowser();
  if (!browser) throw new Error('Microsoft Edge / Google Chrome غير مثبت — لا يمكن التحويل إلى PDF');

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--print-to-pdf=${pdfPath}`,
    '--no-pdf-header-footer',
    '--print-to-pdf-no-header',
    `file:///${htmlPath.replace(/\\/g, '/')}`,
  ];

  if (options.pageSize) {
    args.push(`--virtual-time-budget=500`);
  }

  await runCommand(browser, args);

  if (!existsSync(pdfPath)) {
    throw new Error('فشل تحويل HTML إلى PDF');
  }
}

/* ────────────────────────────────────────────
   نقطة الدخول الرئيسية: POST /api/print
   body: { html: string, printer?: string }
   ──────────────────────────────────────────── */
export async function printHtmlHandler(req, res) {
  const { html, printer: requestedPrinter, copies = 1 } = req.body || {};

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'يجب تمرير html' });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const htmlPath = path.join(tmpdir(), `omega-print-${id}.html`);
  const pdfPath = path.join(tmpdir(), `omega-print-${id}.pdf`);

  try {
    // 1) كتابة HTML إلى ملف مؤقت
    await writeFile(htmlPath, html, 'utf8');

    // 2) تحويل إلى PDF
    await htmlToPdf(htmlPath, pdfPath);

    // 3) طباعة الـ PDF بصمت
    const printOptions = {
      silent: true,
      printDialog: false,
    };
    if (requestedPrinter) printOptions.printer = requestedPrinter;
    if (copies && copies > 1) printOptions.copies = copies;

    await print(pdfPath, printOptions);

    res.json({ success: true, printer: requestedPrinter || 'default' });
  } catch (err) {
    console.error('❌ خطأ الطباعة:', err.message);
    res.status(500).json({ error: err.message || 'فشل الطباعة' });
  } finally {
    // تنظيف الملفات المؤقتة بعد 5 ثوانٍ
    setTimeout(() => {
      unlink(htmlPath).catch(() => {});
      unlink(pdfPath).catch(() => {});
    }, 5000);
  }
}

/* ────────────────────────────────────────────
   GET /api/printers — قائمة الطابعات المتاحة
   ──────────────────────────────────────────── */
export async function listPrintersHandler(req, res) {
  try {
    const printers = await getPrinters();
    let defaultPrinter = null;
    try {
      defaultPrinter = await getDefaultPrinter();
    } catch { /* ignore */ }
    res.json({ printers, default: defaultPrinter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/* ────────────────────────────────────────────
   GET /api/print/health — اختبار جاهزية الخدمة
   ──────────────────────────────────────────── */
export async function printHealthHandler(req, res) {
  const browser = findBrowser();
  res.json({
    ready: !!browser,
    browser: browser || null,
    message: browser ? 'خدمة الطباعة جاهزة' : 'Edge/Chrome غير مثبت',
  });
}
