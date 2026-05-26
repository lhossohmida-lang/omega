import { useState } from 'react';

export default function CategoryIcon({ iconUrl, emoji, className = '', style, alt = '' }) {
  const [errored, setErrored] = useState(false);
  if (iconUrl && !errored) {
    return (
      <img
        src={iconUrl}
        alt={alt}
        className={className}
        style={style}
        onError={() => setErrored(true)}
      />
    );
  }
  return <span className={className} style={style} aria-hidden="true">{emoji}</span>;
}
