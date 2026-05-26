import { useEffect, useState } from 'react';

const cache = new Map();

function processImage(src) {
  if (!src) return Promise.resolve(src);
  if (cache.has(src)) return cache.get(src);

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

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
        resolve(src);
      }
    };

    img.onerror = () => resolve(src);
    img.src = src;
  });

  cache.set(src, promise);
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
