import React from 'react';

// Sayaç input'unun altında satır içi hata + ipucu. Input'ta aria-describedby={id} ile bağlanır.
export default function SayacHatasi({ id, hata }) {
  if (!hata) return null;
  return (
    <div id={id} role="alert" className="mt-1 space-y-0.5 text-[11px] leading-snug">
      <span className="block font-medium text-destructive">{hata.alanHatasi}</span>
      {hata.ipucu && (
        <span className="block font-mono tabular-nums text-truss-muted">{hata.ipucu}</span>
      )}
    </div>
  );
}
