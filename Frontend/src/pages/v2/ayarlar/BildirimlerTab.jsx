import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, Info, Loader2, Save } from 'lucide-react';
import api from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import { canAccessChannel } from '@/components/v2/channelAccess';
import { notifyApiError } from '@/utils/apiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DEFAULT_NOTIFICATION_MATRIX,
  NOTIFICATION_CATEGORIES,
  normalizeNotificationMatrix,
} from './ayarlarConstants';

export default function BildirimlerTab({
  telefon,
  setTelefon,
  emailBildirimAktif,
  setEmailBildirimAktif,
  smsBildirimAktif,
  setSmsBildirimAktif,
  bildirimTercihleri,
  setBildirimTercihleri,
}) {
  const user = useAuthStore((s) => s.user);
  const canViewAnalytics = canAccessChannel(user, 'analytics');
  const visibleCategories = canViewAnalytics
    ? NOTIFICATION_CATEGORIES
    : NOTIFICATION_CATEGORIES.filter((category) => category.key !== 'maliyet_ozeti');
  const [savingNotifications, setSavingNotifications] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleToggleCategoryChannel = (categoryKey, channelKey, checked) => {
    setBildirimTercihleri((prev) => ({
      ...prev,
      [categoryKey]: {
        ...(prev[categoryKey] || DEFAULT_NOTIFICATION_MATRIX[categoryKey]),
        [channelKey]: Boolean(checked),
      },
    }));
  };

  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    if (savingNotifications) return;

    const trimmedTelefon = telefon.trim();
    if (smsBildirimAktif && !trimmedTelefon) {
      toast.error('SMS bildirimlerini açmak için geçerli bir telefon numarası girin.');
      return;
    }

    setSavingNotifications(true);
    try {
      const normalizedMatrix = normalizeNotificationMatrix(bildirimTercihleri);
      await api.put('/users/settings/notifications', {
        telefon: trimmedTelefon,
        email_bildirim_aktif: emailBildirimAktif,
        sms_bildirim_aktif: smsBildirimAktif,
        bildirim_tercihleri: normalizedMatrix,
      });
      toast.success('Bildirim ayarları güncellendi.');
    } catch (err) {
      notifyApiError(err, 'Bildirim ayarları güncellenemedi.');
    } finally {
      if (mountedRef.current) setSavingNotifications(false);
    }
  };

  return (
    <form onSubmit={handleSaveNotifications} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Bildirim Kanalları</h2>
        <p className="text-xs text-muted-foreground">
          Bakım, belge vadesi ve kritik filo uyarılarının iletileceği kanalları seçin.
        </p>
      </div>

      <Separator />

      <div className="grid max-w-md gap-2">
        <Label htmlFor="settings-telefon">Telefon Numarası</Label>
        <Input
          id="settings-telefon"
          type="tel"
          maxLength={20}
          autoComplete="tel"
          placeholder="05xx xxx xx xx"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          disabled={savingNotifications}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="settings-email-bildirim" className="text-sm font-medium">
              E-posta Bildirimleri
            </Label>
            <p className="text-xs text-muted-foreground">
              Yaklaşan bakım ve evrak bitiş uyarılarını kayıtlı e-posta adresinize alın.
            </p>
          </div>
          <Switch
            id="settings-email-bildirim"
            checked={emailBildirimAktif}
            onCheckedChange={setEmailBildirimAktif}
            disabled={savingNotifications}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="settings-sms-bildirim" className="text-sm font-medium">
              SMS Bildirimleri
            </Label>
            <p className="text-xs text-muted-foreground">
              Kritik bakım eşikleri için telefon numaranıza anlık SMS bildirimi gönderilir.
            </p>
          </div>
          <Switch
            id="settings-sms-bildirim"
            checked={smsBildirimAktif}
            onCheckedChange={setSmsBildirimAktif}
            disabled={savingNotifications}
          />
        </div>
      </div>

      {/* account-settings-10 tabanlı Kategori × Kanal Bildirim Matrisi */}
      <div className="overflow-hidden rounded-xl border border-border bg-background/60">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Bell className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">
              Kategori Bazlı Bildirim Matrisi
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Hangi uyarı kategorilerinin Uygulama İçi, E-posta veya SMS kanalından iletileceğini özelleştirin.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-64 pl-4 text-xs font-medium text-muted-foreground">
                  Bildirim Kategorisi
                </TableHead>
                <TableHead className="w-28 text-center text-xs font-medium text-muted-foreground">
                  Uygulama İçi
                </TableHead>
                <TableHead className="w-32 text-center text-xs font-medium text-muted-foreground">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>E-posta</span>
                    {!emailBildirimAktif && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        E-posta kanalı kapalı
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-36 pr-4 text-center text-xs font-medium text-muted-foreground">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>SMS</span>
                    {!smsBildirimAktif && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        SMS kanalı kapalı
                      </span>
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCategories.map((category) => {
                const CategoryIcon = category.icon;
                const rowPrefs =
                  bildirimTercihleri[category.key] || DEFAULT_NOTIFICATION_MATRIX[category.key];
                const uygulamaChecked =
                  rowPrefs?.uygulama ?? (Boolean(rowPrefs?.email) || Boolean(rowPrefs?.sms));

                return (
                  <TableRow key={category.key}>
                    <TableCell className="py-3 pl-4 whitespace-normal">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                          <CategoryIcon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium text-foreground">{category.label}</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      <Switch
                        id={`notif-matrix-${category.key}-uygulama`}
                        checked={Boolean(uygulamaChecked)}
                        disabled={savingNotifications}
                        onCheckedChange={(checked) =>
                          handleToggleCategoryChannel(category.key, 'uygulama', checked)
                        }
                        aria-label={`${category.label} için Uygulama İçi bildirimleri`}
                      />
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Switch
                          id={`notif-matrix-${category.key}-email`}
                          checked={Boolean(rowPrefs?.email)}
                          disabled={!emailBildirimAktif || savingNotifications}
                          onCheckedChange={(checked) =>
                            handleToggleCategoryChannel(category.key, 'email', checked)
                          }
                          aria-label={`${category.label} için E-posta bildirimleri`}
                        />
                        {!emailBildirimAktif && (
                          <span className="text-[10px] text-muted-foreground">
                            E-posta kanalı kapalı
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 pr-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Switch
                          id={`notif-matrix-${category.key}-sms`}
                          checked={Boolean(rowPrefs?.sms)}
                          disabled={!smsBildirimAktif || savingNotifications}
                          onCheckedChange={(checked) =>
                            handleToggleCategoryChannel(category.key, 'sms', checked)
                          }
                          aria-label={`${category.label} için SMS bildirimleri`}
                        />
                        {!smsBildirimAktif && (
                          <span className="text-[10px] text-muted-foreground">
                            SMS kanalı kapalı
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>Kaydettiğinizde aktif kanallara test bildirimi gönderilir.</span>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" size="sm" disabled={savingNotifications} className="gap-2">
          {savingNotifications ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          <span>Bildirim Ayarlarını Kaydet</span>
        </Button>
      </div>
    </form>
  );
}
