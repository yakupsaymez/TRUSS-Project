import React, { useEffect, useRef, useState } from 'react';
import { Building2, Check, Clock, Copy, Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupportConfig } from '@/utils/supportConfig';
import { cn } from '@/lib/utils';

function CopyButton({ copied, onClick }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClick}
      className="h-6 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
      <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
    </Button>
  );
}

export default function CorporateContactCard({ className }) {
  const config = getSupportConfig();
  const [copiedKey, setCopiedKey] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = async (key, value) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedKey(key);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  if (!config.hasAnyContact) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground', className)}>
        Kurumsal destek ve iletişim kanalları sistem yöneticisi tarafından yapılandırıldığında burada görüntülenecektir.
      </div>
    );
  }

  return (
    <div className={cn('space-y-2.5 rounded-xl border border-border bg-card p-4 text-xs', className)}>
      {config.companyLegalName && (
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Building2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{config.companyLegalName}</span>
        </div>
      )}
      {config.email && (
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="flex min-w-0 items-center gap-2">
            <Mail className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate text-foreground">{config.email}</span>
          </span>
          <CopyButton copied={copiedKey === 'email'} onClick={() => handleCopy('email', config.email)} />
        </div>
      )}
      {config.phone && (
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="flex min-w-0 items-center gap-2">
            <Phone className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate font-mono text-foreground tabular-nums">{config.phone}</span>
          </span>
          <CopyButton copied={copiedKey === 'phone'} onClick={() => handleCopy('phone', config.phone)} />
        </div>
      )}
      {config.hours && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{config.hours}</span>
        </div>
      )}
      {config.companyAddress && (
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{config.companyAddress}</span>
        </div>
      )}
    </div>
  );
}
