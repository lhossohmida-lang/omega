/**
 * LocalNetworkSettings.jsx
 * بانر/إعداد الشبكة المحلية — يظهر في لوحة الإدارة
 * يسمح بتغيير عنوان WebSocket والتحقق من حالة الاتصال
 */
import { useState, useEffect } from 'react';
import localSync from '../services/localSync';
import { IoWifiOutline, IoCloseOutline, IoSaveOutline, IoRefreshOutline } from 'react-icons/io5';

export default function LocalNetworkSettings({ onClose }) {
  const [wsUrl, setWsUrl] = useState(localStorage.getItem('omega_local_ws') || '');
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    // مراقبة حالة الاتصال
    const unsub1 = localSync.on('_connected', (d) => {
      setStatus('connected');
      setClientCount(d.clientCount || 0);
    });
    const unsub2 = localSync.on('_disconnected', () => setStatus('error'));
    const unsub3 = localSync.on('connected', (d) => setClientCount(d.clientCount || 0));

    if (localSync.isConnected) setStatus('connected');

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const handleConnect = () => {
    const url = wsUrl.trim() || `ws://${window.location.hostname}:3001`;
    localStorage.setItem('omega_local_ws', url);
    setStatus('connecting');
    localSync.disconnect();
    setTimeout(() => localSync.connect(url), 300);
  };

  const statusColors = {
    idle:       { bg: 'bg-gray-100', text: 'text-gray-500', label: 'غير متصل' },
    connecting: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'جاري الاتصال...' },
    connected:  { bg: 'bg-green-50', text: 'text-green-600', label: `متصل ✅ (${clientCount} أجهزة)` },
    error:      { bg: 'bg-red-50',   text: 'text-red-500',   label: 'فشل الاتصال ❌' },
  };
  const s = statusColors[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md">
        {/* رأس */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">
            <IoCloseOutline size={20} className="text-gray-600" />
          </button>
          <div className="text-right">
            <h3 className="font-black text-gray-900 text-base flex items-center gap-2 justify-end">
              <IoWifiOutline className="text-indigo-500" size={20} />
              إعداد الشبكة المحلية
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">ربط الإدارة والمطبخ عبر WiFi بدون إنترنت</p>
          </div>
        </div>

        {/* شرح */}
        <div className="bg-indigo-50 rounded-2xl p-4 mb-5 space-y-2">
          <p className="text-xs font-bold text-indigo-700">📋 طريقة الإعداد:</p>
          <ol className="text-xs text-indigo-600 space-y-1 list-decimal list-inside">
            <li>شغّل السيرفر على جهاز الإدارة: <code className="bg-indigo-100 px-1 rounded font-mono">npm run local</code></li>
            <li>ستظهر في الطرفية عناوين IP المحلية</li>
            <li>أدخل عنوان WebSocket أدناه (مثال: <code className="bg-indigo-100 px-1 rounded font-mono">ws://192.168.1.5:3001</code>)</li>
            <li>افتح نفس العنوان على جهاز المطبخ وكرر الإعداد</li>
          </ol>
        </div>

        {/* إدخال العنوان */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 text-right">عنوان WebSocket</label>
          <input
            type="text"
            value={wsUrl}
            onChange={e => setWsUrl(e.target.value)}
            placeholder={`ws://${window.location.hostname}:3001`}
            dir="ltr"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 font-mono text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* حالة الاتصال */}
        <div className={`${s.bg} rounded-xl p-3 mb-5 text-center`}>
          <span className={`text-xs font-black ${s.text}`}>الحالة: {s.label}</span>
        </div>

        {/* أزرار */}
        <div className="flex gap-3">
          <button onClick={handleConnect} disabled={status === 'connecting'}
            className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
            <IoWifiOutline size={16} />
            {status === 'connecting' ? 'جاري الاتصال...' : 'اتصال'}
          </button>
          {localSync.isConnected && (
            <button onClick={() => { localSync.emit('ping', {}); }}
              className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer">
              <IoRefreshOutline size={16} />
              اختبار
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
