import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Loader2, LogOut, Trash2 } from 'lucide-react';
import api from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import useAppStore from '@/store/useAppStore';
import useVehicleStore from '@/store/useVehicleStore';
import { notifyApiError } from '@/utils/apiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import PasswordChangeForm from './PasswordChangeForm';

export default function GuvenlikTab({ isSystemAdmin }) {
  const navigate = useNavigate();
  const handleLogout = useAppStore((s) => s.handleLogout);

  // Hesap silme (yalnız SYSTEM_ADMIN)
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleDeleteAccount = async () => {
    if (!isSystemAdmin || isDeleting) return;
    if (confirmText.trim().toUpperCase() !== 'ONAYLIYORUM') return;

    setIsDeleting(true);
    try {
      await api.delete('/users/settings/account');
      toast.success('Hesabınız silindi.');
      useAuthStore.getState().logout();
      useVehicleStore.getState().reset();
      navigate('/login');
    } catch (err) {
      notifyApiError(err, 'Hesap silinemedi.');
    } finally {
      if (mountedRef.current) setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Güvenlik ve Oturum</h2>
        <p className="text-xs text-muted-foreground">
          Şifre yenileme politikası ve aktif cihaz oturum yönetimi.
        </p>
      </div>

      <Separator />

      <PasswordChangeForm />

      <div className="rounded-xl border border-border bg-background/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Aktif Oturum</p>
            <p className="text-xs text-muted-foreground">
              Bu cihazdaki oturumunuzu güvenli şekilde sonlandırabilirsiniz.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLogout(navigate)}
            className="gap-2"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span>Bu Cihazdan Çıkış Yap</span>
          </Button>
        </div>
      </div>

      {/* P0 RBAC KİLİDİ: Tehlikeli Bölge YALNIZCA SYSTEM_ADMIN için render edilir */}
      {isSystemAdmin && (
        <div className="space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-destructive">
                Tehlikeli Bölge — Hesabı Sil
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Hesap silme işlemi geri alınamaz. Devam etmek için{' '}
                <span className="font-mono font-semibold text-foreground">ONAYLIYORUM</span> yazın.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ONAYLIYORUM"
              aria-label="Hesap silme onay metni"
              disabled={isDeleting}
              className="bg-background sm:max-w-xs"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={confirmText.trim().toUpperCase() !== 'ONAYLIYORUM' || isDeleting}
              onClick={handleDeleteAccount}
              className="gap-2"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              <span>Hesabı Kalıcı Olarak Sil</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
