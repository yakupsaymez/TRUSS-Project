import React from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from './ayarlarConstants';

export default function ProfilTab({ adSoyad, email, role, isManager, activePermissions }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Profil Bilgileri</h2>
        <p className="text-xs text-muted-foreground">
          Oturum kimliğiniz, organizasyon rolünüz ve aktif modül yetkileriniz.
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="settings-ad-soyad">Ad Soyad</Label>
          <Input id="settings-ad-soyad" type="text" value={adSoyad || '—'} readOnly disabled />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="settings-email">E-posta</Label>
          <Input id="settings-email" type="email" value={email || '—'} readOnly disabled />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Oturum Rolü</p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex h-7 items-center rounded-md border bg-card px-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider',
                isManager ? 'border-primary text-primary' : 'border-border text-muted-foreground'
              )}
            >
              {role}
            </span>
            <span className="text-xs font-medium text-foreground">
              {ROLE_LABELS[role] || role}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Aktif Yetkiler</p>
          <div className="flex flex-wrap gap-1.5">
            {isManager ? (
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                Tam erişim
              </Badge>
            ) : activePermissions.length > 0 ? (
              activePermissions.map((perm) => (
                <Badge key={perm.key} variant="secondary">
                  {perm.label}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Standart sürücü erişimi
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Ad soyad ve e-posta değişiklikleri için sistem veya filo yöneticinizle iletişime geçin.
        </span>
      </div>
    </div>
  );
}
