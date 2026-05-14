import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useVoiceInput - Web Speech API hook for STT
 * يستخدم Browser Speech Recognition بدون أي مفتاح API
 */
export function useVoiceInput({ lang = 'ar-SA', onResult, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [duration, setDuration] = useState(0);

  const recognitionRef = useRef(null);
  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);
  const finalTextRef = useRef('');
  const interimRef = useRef('');
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // keep latest callbacks
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current?.('المتصفح لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    finalTextRef.current = '';
    interimRef.current = '';

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
      setDuration(0);
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      interimRef.current = interim;
      finalTextRef.current = final;
      setInterimText((final + ' ' + interim).trim());
    };

    recognition.onerror = (event) => {
      let msg = 'حدث خطأ أثناء معالجة الصوت';
      const err = event.error;
      if (err === 'not-allowed' || err === 'permission-denied' || err === 'service-not-allowed') {
        msg = 'يرجى السماح باستخدام الميكروفون من إعدادات المتصفح';
      } else if (err === 'no-speech') {
        msg = 'لم يتم التعرف على الكلام بوضوح، حاول مرة أخرى';
      } else if (err === 'audio-capture') {
        msg = 'لم يتم العثور على ميكروفون';
      } else if (err === 'network') {
        msg = 'فشل الاتصال بخدمة التعرف على الصوت';
      } else if (err === 'aborted') {
        msg = null;
      }
      if (msg) onErrorRef.current?.(msg);
      setIsListening(false);
      cleanup();
    };

    recognition.onend = () => {
      setIsListening(false);
      cleanup();
      const combined = (finalTextRef.current + ' ' + interimRef.current).trim();
      if (combined && onResultRef.current) {
        onResultRef.current(combined);
      }
      setInterimText('');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      onErrorRef.current?.(e?.message || 'فشل بدء التسجيل');
    }
  }, [lang, isSupported, cleanup]);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    interimText,
    duration,
    start,
    stop,
    isSupported,
  };
}
