import React from 'react';
import { cn } from '@/lib/utils';

// src/utils/sayacHatasi.js (parseSayacHatasi / sayacAria) çıktısını satır içi gösterir.
export default function SayacFieldError({ id, hata, className }) {
  if (!hata) return null;

  return (
    <div
      id={id}
      role="alert"
      className={cn('mt-1 space-y-0.5 text-xs leading-snug', className)}
    >
      <span className="block font-medium text-destructive">{hata.alanHatasi}</span>
      {hata.ipucu && (
        <span className="block font-mono tabular-nums text-muted-foreground">
          {hata.ipucu}
        </span>
      )}
    </div>
  );
}
