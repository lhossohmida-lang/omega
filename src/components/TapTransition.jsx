/**
 * TapTransition — نظام انتقال الفيديو العالمي
 *
 * الاستخدام:
 *   const { go } = useTapNav();
 *   // بدلاً من navigate('/cart') أو Link to="/cart":
 *   go('/cart');
 */

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ────── Context ────── */
const TapCtx = createContext(null);

/* ────── Provider ────── */
export function TapTransitionProvider({ children }) {
  const [show, setShow] = useState(false);
  const pendingRef  = useRef(null);   // المسار الهدف
  const timerRef    = useRef(null);
  const navigate    = useNavigate();
  const videoRef    = useRef(null);

  const doNavigate = useCallback(() => {
    clearTimeout(timerRef.current);
    setShow(false);
    if (pendingRef.current) {
      navigate(pendingRef.current);
      pendingRef.current = null;
    }
  }, [navigate]);

  const go = useCallback((path) => {
    if (show) return;
    pendingRef.current = path;
    setShow(true);
  }, [show]);

  /* عند ظهور الـ overlay — شغّل الفيديو */
  const handleRef = useCallback((el) => {
    videoRef.current = el;
    if (!el) return;
    el.currentTime = 0;
    el.muted = true;
    const p = el.play();
    if (p?.catch) p.catch(() => doNavigate());
    /* fallback إذا لم يكتمل الفيديو */
    timerRef.current = setTimeout(doNavigate, 2600);
  }, [doNavigate]);

  return (
    <TapCtx.Provider value={{ go }}>
      {children}

      {show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: '#000',
            pointerEvents: 'all',
          }}
        >
          <video
            ref={handleRef}
            src="/tap-transition.mp4"
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            onEnded={doNavigate}
            onError={doNavigate}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}
    </TapCtx.Provider>
  );
}

/* ────── Hook ────── */
export function useTapNav() {
  const ctx = useContext(TapCtx);
  if (!ctx) throw new Error('useTapNav must be used inside TapTransitionProvider');
  return ctx;
}

/* ────── الـ Component القديم — للتوافق مع الاستخدام الموجود ────── */
export default function TapTransition({ active, onDone, durationMs = 2600, finishOnEnded = true }) {
  const videoRef   = useRef(null);
  const timerRef   = useRef(null);
  const onDoneRef  = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = useCallback(() => {
    clearTimeout(timerRef.current);
    if (typeof onDoneRef.current === 'function') onDoneRef.current();
  }, []);

  const handleRef = useCallback((el) => {
    videoRef.current = el;
    if (!el || !active) return;
    clearTimeout(timerRef.current);
    el.currentTime = 0;
    el.muted = true;
    const p = el.play();
    if (p?.catch) p.catch(() => finish());
    timerRef.current = setTimeout(finish, durationMs);
  }, [active, durationMs, finish]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#000',
        pointerEvents: 'all',
      }}
    >
      <video
        ref={handleRef}
        src="/tap-transition.mp4"
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={finishOnEnded ? finish : undefined}
        onError={finish}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
}
