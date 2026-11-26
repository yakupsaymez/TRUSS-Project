import React from 'react';
import { SheetField, SheetFormGrid, SheetFormSection } from '@/components/v2/AppSheet';
import { PERMISSION_DEFINITIONS, ROLE_META } from '@/components/v2/CrewDataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export default function CreateMemberFormSections({
  form,
  fieldErrors,
  roleOptions,
  isSubmitting,
  onChange,
  onRoleChange,
  onTogglePerm,
}) {
  return (
    <>
      <SheetFormSection title="Kimlik Bilgileri">
        <SheetFormGrid>
          <SheetField
            label="Ad Soyad"
            htmlFor="create-member-name"
            required
            error={fieldErrors.ad_soyad}
          >
            <Input
              id="create-member-name"
              value={form.ad_soyad}
              onChange={(e) => onChange('ad_soyad', e.target.value)}
              placeholder="Örn. Murat Demir"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.ad_soyad)}
            />
          </SheetField>

          <SheetField
            label="Telefon"
            htmlFor="create-member-phone"
            error={fieldErrors.telefon}
          >
            <Input
              id="create-member-phone"
              value={form.telefon}
              onChange={(e) => onChange('telefon', e.target.value)}
              placeholder="05XX XXX XX XX"
              maxLength={20}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.telefon)}
              className="tabular-nums"
            />
          </SheetField>
        </SheetFormGrid>

        <SheetFormGrid>
          <SheetField
            label="E-Posta"
            htmlFor="create-member-email"
            required
            error={fieldErrors.email}
          >
            <Input
              id="create-member-email"
              type="email"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="ornek@firma.com"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </SheetField>

          <SheetField
            label="Geçici Şifre"
            htmlFor="create-member-password"
            required
            hint="En az 6 karakter."
            error={fieldErrors.sifre}
          >
            <Input
              id="create-member-password"
              type="password"
              value={form.sifre}
              onChange={(e) => onChange('sifre', e.target.value)}
              placeholder="••••••"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.sifre)}
            />
          </SheetField>
        </SheetFormGrid>
      </SheetFormSection>

      <SheetFormSection
        title="Rol & Başlangıç Yetkileri"
        description="Rol seçimi başlangıç yetki şablonunu doldurur; anahtarları ayrıca düzenleyebilirsiniz."
      >
        <SheetField
          label="Rol"
          htmlFor="create-member-role"
          required
          error={fieldErrors.role}
        >
          <Select
            value={form.role}
            onValueChange={onRoleChange}
            disabled={isSubmitting}
          >
            <SelectTrigger id="create-member-role" aria-invalid={Boolean(fieldErrors.role)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {roleOptions.map((roleKey) => {
                  const meta = ROLE_META[roleKey];
                  return (
                    <SelectItem key={roleKey} value={roleKey}>
                      {meta?.label || roleKey}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </SheetField>

        <Card className="gap-0 overflow-hidden border border-border bg-transparent py-0 shadow-none ring-0">
          <CardContent className="gap-0 divide-y divide-border p-0">
            {PERMISSION_DEFINITIONS.map((def) => {
              const switchId = `create-perm-${def.key}`;
              const isChecked = Boolean(form.yetkiler[def.key]);
              return (
                <div
                  key={def.key}
                  className={cn(
                    'flex items-center justify-between gap-4 px-3.5 py-2.5 transition-colors',
                    isChecked && 'bg-muted/25'
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <Label
                      htmlFor={switchId}
                      className="block cursor-pointer text-xs font-medium text-foreground"
                    >
                      {def.fullLabel}
                    </Label>
                    <p className="text-[11px] text-muted-foreground">{def.desc}</p>
                  </div>
                  <Switch
                    id={switchId}
                    checked={isChecked}
                    disabled={isSubmitting}
                    aria-label={def.fullLabel}
                    onCheckedChange={(checked) => onTogglePerm(def.key, checked)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </SheetFormSection>
    </>
  );
}
