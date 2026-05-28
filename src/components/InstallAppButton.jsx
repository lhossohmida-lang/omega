import { IoDownloadOutline, IoPhonePortraitOutline, IoDesktopOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';

/* ── Device detection ─────────────────────────────────── */
function detectDevice() {
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS     = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile  = isAndroid || isIOS || /mobile|tablet/i.test(ua);
  return { isAndroid, isIOS, isMobile };
}

/* ── Download config ──────────────────────────────────── */
const DOWNLOADS = {
  android: {
    url:   '/omega-app.apk',
    label: 'تحميل تطبيق OMEGA للأندرويد',
    ext:   'APK',
    toast: 'جاري تحميل تطبيق OMEGA للأندرويد... 📱',
  },
  desktop: {
    url:   '/omega-installer.exe',
    label: 'تحميل برنامج OMEGA للحاسوب (Windows)',
    ext:   'EXE',
    toast: 'جاري تحميل مثبّت OMEGA للحاسوب... 💻',
  },
};

/* ── Component ────────────────────────────────────────── */
export default function InstallAppButton({
  target    = 'customer',
  className = '',
  compact   = false,
}) {
  const { isAndroid, isIOS, isMobile } = detectDevice();

  /* Choose correct download config */
  let config;
  if (isAndroid) {
    config = DOWNLOADS.android;
  } else if (isIOS) {
    // iOS: no APK/EXE – fall back to PWA instructions
    config = null;
  } else {
    // Desktop (Windows / Mac / Linux)
    config = DOWNLOADS.desktop;
  }

  /* iOS: show install instructions */
  const handleIOS = () => {
    toast('للتثبيت على iOS: اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية" 📱', {
      duration: 6000,
      icon: '🍎',
    });
  };

  /* Android / Desktop: trigger real file download */
  const handleDownload = () => {
    if (!config) return;
    toast.success(config.toast, { duration: 3000 });
    const a = document.createElement('a');
    a.href     = config.url;
    a.download = config.url.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClick = isIOS ? handleIOS : handleDownload;

  /* Choose icon & label */
  const IconComponent = isAndroid
    ? IoPhonePortraitOutline
    : isIOS
    ? IoPhonePortraitOutline
    : IoDesktopOutline;

  const labelText = compact
    ? 'تحميل التطبيق'
    : isAndroid
    ? 'تحميل APK'
    : isIOS
    ? 'تثبيت التطبيق'
    : 'تحميل للحاسوب';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      title={config ? config.label : 'تثبيت التطبيق'}
    >
      {isMobile ? (
        <IconComponent size={compact ? 18 : 22} />
      ) : (
        <IoDesktopOutline size={compact ? 18 : 22} />
      )}
      <span>{labelText}</span>
    </button>
  );
}
