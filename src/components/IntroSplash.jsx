import { useEffect, useRef, useState } from 'react';

/**
 * شاشة افتتاحية تعرض فيديو لمدة 4 ثوانٍ ثم تختفي.
 * تظهر في كل دخول للواجهة وكل إعادة تحميل (refresh).
 */

const DURATION_MS = 4000;

// إبقاء التوقيع لتوافق الاستيراد الموجود — تُرجع true دائماً (السبلاش يظهر دائماً)
export function shouldShowIntro() {
  return true;
}

export function markIntroShown() {
  /* لا شيء — السبلاش يظهر دائماً */
}

export default function IntroSplash({ scope = 'app', onDone }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // تشغيل الفيديو (يتطلب بعض المتصفحات تفعيل الكتم لتشغيل تلقائي)
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => { /* ignore autoplay block */ });
    }

    // مؤقت 4 ثوانٍ + 250ms للتلاشي
    const fadeTimer = setTimeout(() => setFading(true), DURATION_MS - 250);
    const endTimer = setTimeout(() => {
      setVisible(false);
      if (typeof onDone === 'function') onDone();
    }, DURATION_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, [scope, onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 250ms ease-out',
      }}
    >
      <video
        ref={videoRef}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        className="omega-intro-video"
      />
    </div>
  );
}
