// Local development server — API endpoints + WebSocket for local network sync
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { networkInterfaces } from 'os';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import chatHandler from '../api/admin-ai/chat.js';
import executeHandler from '../api/admin-ai/execute-action.js';
import { printHtmlHandler, listPrintersHandler, printHealthHandler } from './print.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // HTML tickets قد تكون كبيرة قليلاً

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'تم تجاوز الحد الأقصى للطلبات. انتظر قليلاً.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function wrap(handler) {
  return async (req, res) => { await handler(req, res); };
}

app.post('/api/admin-ai/chat', aiLimiter, wrap(chatHandler));
app.post('/api/admin-ai/execute-action', wrap(executeHandler));

// ─── خدمة الطباعة الصامتة ───
app.post('/api/print', wrap(printHtmlHandler));
app.get('/api/printers', wrap(listPrintersHandler));
app.get('/api/print/health', wrap(printHealthHandler));

// ─── تشغيل السيرفر المحلي + Chrome من داخل التطبيق ───
let posProcess = null; // مرجع لعملية npm run local

app.post('/api/launch-pos', async (req, res) => {
  try {
    // 1) تشغيل npm run local في الخلفية إذا لم يكن يعمل بالفعل
    if (!posProcess || posProcess.exitCode !== null) {
      posProcess = spawn('npm', ['run', 'local'], {
        cwd: ROOT_DIR,
        detached: true,
        stdio: 'ignore',
        shell: true,          // ضروري على Windows لتشغيل npm
        windowsHide: true,
      });
      posProcess.unref();
      posProcess.on('error', (err) => { console.error('[launch-pos] خطأ npm:', err.message); posProcess = null; });
      posProcess.on('exit', (code) => { console.log(`[launch-pos] npm run local انتهى بكود: ${code}`); posProcess = null; });
    }

    // 2) انتظر 6 ثوانٍ حتى يرتفع Vite
    await new Promise((r) => setTimeout(r, 6000));

    // 3) أغلق Chrome الحالي
    exec('taskkill /f /im chrome.exe', { shell: true }, () => {});
    await new Promise((r) => setTimeout(r, 2000));

    // 4) حدد مسار Chrome
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    const { existsSync } = await import('fs');
    const chromePath = chromePaths.find((p) => existsSync(p));

    const profileDir = path.join(
      process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local',
      'OmegaPOS', 'ChromeProfile'
    );

    if (chromePath) {
      const chromeArgs = [
        '--kiosk-printing',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-features=Translate,PrintPreview',
        '--disable-print-preview',
        '--disable-pdf-tagging',
        `--user-data-dir=${profileDir}`,
        '--start-maximized',
        '--app=http://localhost:5173',
      ];
      const chromeProc = spawn(chromePath, chromeArgs, { detached: true, stdio: 'ignore', shell: false });
      chromeProc.unref();
    } else {
      // افتح بالمتصفح الافتراضي (shell ضروري لـ start على Windows)
      exec('start http://localhost:5173', { shell: true });
    }

    res.json({ ok: true, message: 'تم تشغيل السيرفر المحلي وفتح الواجهة بنجاح ✅' });
  } catch (err) {
    console.error('[launch-pos] خطأ:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// حالة السيرفر المحلي
app.get('/api/launch-pos/status', (req, res) => {
  const running = posProcess !== null && posProcess.exitCode === null;
  res.json({ running });
});

// ─── WebSocket للمزامنة المحلية ───
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// تخزين المتصلين
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  const ip = req.socket.remoteAddress;
  console.log(`🔌 جهاز متصل: ${ip} | المتصلون: ${clients.size}`);

  // إرسال تأكيد الاتصال
  ws.send(JSON.stringify({ type: 'connected', clientCount: clients.size }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log(`📨 حدث: ${msg.type} من ${ip}`);

      // بث الرسالة لجميع المتصلين الآخرين
      for (const client of clients) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify(msg));
        }
      }
    } catch (e) {
      console.error('خطأ في تحليل الرسالة:', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`❌ جهاز قطع الاتصال | المتصلون: ${clients.size}`);
  });

  ws.on('error', () => clients.delete(ws));
});

// عرض عنوان IP المحلي عند الإطلاق
function getLocalIP() {
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n🚀 OMEGA Backend Server');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://${ip}:${PORT}  ← شبكة WiFi المحلية`);
  console.log(`\n🔌 WebSocket جاهز على ws://${ip}:${PORT}`);
  console.log(`   أدخل هذا العنوان في إعدادات الشبكة المحلية:\n   IP: ${ip}\n`);
});
