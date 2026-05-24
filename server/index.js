// Local development server — API endpoints + WebSocket for local network sync
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { networkInterfaces } from 'os';
import chatHandler from '../api/admin-ai/chat.js';
import executeHandler from '../api/admin-ai/execute-action.js';
import { printHtmlHandler, listPrintersHandler, printHealthHandler } from './print.js';

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
