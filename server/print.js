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

import { spawn } from 'child_process';
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

// spawn: المسارات لا تحتاج اقتباس يدوي + لا تعارض مع shell
function runCommand(cmd, args, { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const t = setTimeout(() => {
      timedOut = true;
      try { proc.kill('SIGKILL'); } catch { /* ignore */ }
    }, timeout);

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => {
      clearTimeout(t);
      err.stderr = stderr;
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(t);
      if (timedOut) {
        const e = new Error('انتهت مهلة التنفيذ');
        e.stderr = stderr;
        return reject(e);
      }
      if (code !== 0 && code !== null) {
        const e = new Error(`exited with code ${code}`);
        e.stderr = stderr;
        e.stdout = stdout;
        return reject(e);
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

  // بروفايل منفصل لتفادي التعارض مع Edge/Chrome المفتوح
  const userDataDir = path.join(tmpdir(), `omega-headless-${process.pid}`);

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=${userDataDir}`,
    '--no-pdf-header-footer',
    '--virtual-time-budget=2000',
    `--print-to-pdf=${pdfPath}`,
    `file:///${htmlPath.replace(/\\/g, '/')}`,
  ];

  console.log(`🖨️  [print] HTML → PDF عبر ${path.basename(browser)}...`);
  try {
    const { stdout, stderr } = await runCommand(browser, args);
    if (stderr && stderr.trim()) console.log('   stderr:', stderr.trim().slice(0, 200));
  } catch (err) {
    console.error('   ❌ فشل headless:', err.message);
    if (err.stderr) console.error('   stderr:', err.stderr.toString().slice(0, 300));
    throw err;
  }

  if (!existsSync(pdfPath)) {
    throw new Error('فشل تحويل HTML إلى PDF — الملف غير موجود');
  }
  console.log(`   ✅ تم إنشاء PDF (${pdfPath})`);
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

  console.log(`\n🖨️  [print] طلب طباعة جديد (${id})`);
  console.log(`   HTML size: ${html.length} bytes`);
  if (requestedPrinter) console.log(`   الطابعة المطلوبة: ${requestedPrinter}`);

  try {
    // 1) كتابة HTML إلى ملف مؤقت
    await writeFile(htmlPath, html, 'utf8');
    console.log(`   📝 HTML تم حفظه في: ${htmlPath}`);

    // 2) تحويل إلى PDF
    await htmlToPdf(htmlPath, pdfPath);

    // 3) طباعة الـ PDF بصمت
    const printOptions = {
      silent: true,
      printDialog: false,
    };
    if (requestedPrinter) printOptions.printer = requestedPrinter;
    if (copies && copies > 1) printOptions.copies = copies;

    console.log(`   🖨️  إرسال PDF للطابعة...`);
    await print(pdfPath, printOptions);
    console.log(`   ✅ تمت الطباعة بنجاح`);

    res.json({ success: true, printer: requestedPrinter || 'default' });
  } catch (err) {
    console.error(`   ❌ خطأ الطباعة: ${err.message}`);
    if (err.stack) console.error(err.stack);
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
