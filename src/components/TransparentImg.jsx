import { useEffect, useState } from 'react';

const cache = new Map();

function fixLocalPath(src) {
  if (typeof src === 'string' && src.startsWith('./')) {
    return `/${src.slice(2)}`;
  }
  return src;
}

function processImage(src) {
  const correctedSrc = fixLocalPath(src);
  if (!correctedSrc) return Promise.resolve(correctedSrc);
  if (cache.has(correctedSrc)) return cache.get(correctedSrc);

  const promise = new Promise((resolve) => {
    const img = new Image();
    
    // Check if the source is a remote URL
    const isRemote = typeof correctedSrc === 'string' && (correctedSrc.startsWith('http://') || correctedSrc.startsWith('https://'));
    
    if (isRemote) {
      // Set crossOrigin BEFORE src
      img.crossOrigin = 'anonymous';
      
      // Append cache-buster so a CORS failure on this test request does NOT poison the cache of the main URL
      const separator = correctedSrc.includes('?') ? '&' : '?';
      img.src = `${correctedSrc}${separator}cors_bypass=${Date.now()}`;
    } else {
      img.src = correctedSrc;
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Detect fake transparency checkerboards (neutral grays and whites)
          const isNeutral = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;
          
          if (isNeutral && r > 185) {
            // Remove checkerboard and white backgrounds completely
            data[i + 3] = 0;
          } else if (r > 215 && g > 215 && b > 215) {
            const lightness = (r + g + b) / 3;
            const alpha = Math.max(0, 255 - (lightness - 215) * 8);
            data[i + 3] = Math.min(data[i + 3], alpha);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        // Safe fallback in case of canvas taint (CORS issue)
        resolve(correctedSrc);
      }
    };

    img.onerror = () => {
      // Safe fallback if loading the cache-busted URL fails due to CORS
      resolve(correctedSrc);
    };
  });

  cache.set(correctedSrc, promise);
  return promise;
}

export default function TransparentImg({ src, fallback = null, ...rest }) {
  const [processed, setProcessed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setProcessed(null);
    processImage(src).then((result) => {
      if (!cancelled) setProcessed(result);
    });
    return () => { cancelled = true; };
  }, [src]);

  if (!processed) return fallback;
  return <img src={processed} {...rest} />;
}
