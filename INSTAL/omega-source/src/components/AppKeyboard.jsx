import { useState, useEffect, useRef } from 'react';
import { IoBackspaceOutline, IoChevronDownOutline, IoArrowUpOutline } from 'react-icons/io5';

const ARABIC_ROWS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'],
];

const LATIN_LOWER = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const LATIN_UPPER = LATIN_LOWER.map(row => row.map(c => c.toUpperCase()));

const NUMBER_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '+'],
];

function isEligible(el) {
  if (!el) return false;
  if (el.dataset?.noKeyboard === 'true') return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT') {
    const t = (el.type || '').toLowerCase();
    return t === '' || t === 'text' || t === 'tel' || t === 'number' || t === 'search' || t === 'email' || t === 'url';
  }
  return false;
}

function setNativeValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function pickInitialMode(el) {
  if (!el) return 'arabic';
  const t = (el.type || '').toLowerCase();
  const im = (el.inputMode || '').toLowerCase();
  if (t === 'tel' || t === 'number' || im === 'numeric' || im === 'tel' || im === 'decimal') return 'numbers';
  // If dir="ltr" on input, default to Latin
  if (el.dir === 'ltr') return 'latin';
  return 'arabic';
}

export default function AppKeyboard() {
  const [activeEl, setActiveEl] = useState(null);
  const [mode, setMode] = useState('arabic');
  const [shift, setShift] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    const onFocusIn = (e) => {
      const el = e.target;
      if (isEligible(el)) {
        closingRef.current = false;
        setActiveEl(el);
        setMode(pickInitialMode(el));
        setShift(false);
      }
    };

    const onFocusOut = () => {
      setTimeout(() => {
        if (closingRef.current) return;
        const ae = document.activeElement;
        if (!ae || ae === document.body || !isEligible(ae)) {
          setActiveEl(null);
        }
      }, 80);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // عند فتح اللوحة: مرّر المُدخل ليظهر أعلى اللوحة
  useEffect(() => {
    if (activeEl) {
      const t = setTimeout(() => {
        try {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch { /* ignore */ }
      }, 120);
      return () => clearTimeout(t);
    }
  }, [activeEl]);

  if (!activeEl) return null;

  const closeKeyboard = () => {
    closingRef.current = true;
    try { activeEl.blur(); } catch { /* ignore */ }
    setActiveEl(null);
  };

  const focusInput = () => {
    try { activeEl.focus(); } catch { /* ignore */ }
  };

  const insertText = (text) => {
    const el = activeEl;
    if (!el) return;
    const start = (el.selectionStart != null ? el.selectionStart : el.value.length);
    const end = (el.selectionEnd != null ? el.selectionEnd : el.value.length);
    const newValue = el.value.slice(0, start) + text + el.value.slice(end);
    setNativeValue(el, newValue);
    requestAnimationFrame(() => {
      try {
        el.selectionStart = el.selectionEnd = start + text.length;
      } catch { /* ignore */ }
      focusInput();
    });
  };

  const backspace = () => {
    const el = activeEl;
    if (!el) return;
    const start = (el.selectionStart != null ? el.selectionStart : el.value.length);
    const end = (el.selectionEnd != null ? el.selectionEnd : el.value.length);
    let newValue, newPos;
    if (start === end && start > 0) {
      newValue = el.value.slice(0, start - 1) + el.value.slice(end);
      newPos = start - 1;
    } else if (start !== end) {
      newValue = el.value.slice(0, start) + el.value.slice(end);
      newPos = start;
    } else {
      return;
    }
    setNativeValue(el, newValue);
    requestAnimationFrame(() => {
      try { el.selectionStart = el.selectionEnd = newPos; } catch { /* ignore */ }
      focusInput();
    });
  };

  const press = (text) => {
    insertText(text);
    if (shift && mode === 'latin') setShift(false);
  };

  const rows = mode === 'arabic'
    ? ARABIC_ROWS
    : mode === 'latin'
      ? (shift ? LATIN_UPPER : LATIN_LOWER)
      : NUMBER_ROWS;

  const keyBase = 'rounded-lg bg-white border border-gray-200 text-gray-900 font-bold flex items-center justify-center select-none active:bg-gray-100 active:scale-95 transition-all shadow-sm';
  const keySize = mode === 'numbers' ? 'h-14 text-2xl' : 'h-11 text-base sm:text-lg';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] bg-gray-100 border-t-2 border-gray-300 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.2)]"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => { /* allow native for click; prevent blur via key handlers */ }}
      dir="ltr"
    >
      {/* الشريط العلوي: مفاتيح الأوضاع + إغلاق */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={closeKeyboard}
          className="flex h-9 px-3 items-center gap-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold text-sm"
        >
          <IoChevronDownOutline size={18} />
          إغلاق
        </button>
        <div className="flex gap-1.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMode('numbers')}
            className={`h-9 px-3 rounded-lg font-black text-sm ${
              mode === 'numbers' ? 'bg-omega-orange text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >123</button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMode('arabic')}
            className={`h-9 px-3 rounded-lg font-black text-sm ${
              mode === 'arabic' ? 'bg-omega-orange text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >ع</button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMode('latin')}
            className={`h-9 px-3 rounded-lg font-black text-sm ${
              mode === 'latin' ? 'bg-omega-orange text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >EN</button>
        </div>
      </div>

      {/* الصفوف */}
      <div className="p-2 space-y-1.5">
        {mode === 'numbers' ? (
          <div className="flex justify-center">
            <div className="grid grid-cols-3 gap-2 w-full max-w-[420px]">
              {NUMBER_ROWS.flat().map((char, idx) => (
                <button
                  key={`${char}-${idx}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => press(char)}
                  className={`${keyBase} h-16 text-3xl`}
                >{char}</button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={backspace}
                className={`${keyBase} h-16 col-span-3 text-base bg-gray-200`}
              >
                <IoBackspaceOutline size={24} />
                <span className="mr-2">مسح</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1 justify-center">
                {row.map((char, idx) => (
                  <button
                    key={`${char}-${idx}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => press(char)}
                    className={`${keyBase} ${keySize} flex-1 min-w-0 max-w-[3.2rem]`}
                  >{char}</button>
                ))}
              </div>
            ))}
            <div className="flex gap-1 justify-center">
              {mode === 'latin' && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShift(s => !s)}
                  className={`${keyBase} h-11 px-3 ${shift ? 'bg-omega-orange text-white border-omega-orange' : ''}`}
                >
                  <IoArrowUpOutline size={18} />
                </button>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => press(' ')}
                className={`${keyBase} h-11 flex-1 text-sm`}
              >
                المسافة
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={backspace}
                className={`${keyBase} h-11 px-3 bg-gray-200`}
              >
                <IoBackspaceOutline size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
