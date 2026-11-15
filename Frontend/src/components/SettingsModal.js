import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import useAppStore from '@/store/useAppStore';

const settingsTabs = [
  { key: 'hesap', label: 'Hesap' },
  { key: 'tercihler', label: 'Tercihler' },
  { key: 'bildirimler', label: 'Bildirimler' },
  { key: 'gelismis', label: 'Gelişmiş' }
];

const SettingsModal = () => {
  const navigate = useNavigate();

  const {
    isSettingsOpen,
    isSettingsVisible,
    isDiscardConfirmOpen,
    isSaving,
    settingsForm,
    activeSettingsTab,
    deleteConfirmText,
    handleAttemptCloseSettings,
    setDiscardConfirmOpen,
    confirmDiscardSettings,
    setActiveSettingsTab,
    handleSettingsChange,
    handlePreferenceChange,
    handleSettingsSave,
    setDeleteConfirmText,
    handleDeleteAccountIntent
  } = useAppStore(useShallow((state) => ({
    isSettingsOpen: state.isSettingsOpen,
    isSettingsVisible: state.isSettingsVisible,
    isDiscardConfirmOpen: state.isDiscardConfirmOpen,
    isSaving: state.isSaving,
    settingsForm: state.settingsForm,
    activeSettingsTab: state.activeSettingsTab,
    deleteConfirmText: state.deleteConfirmText,
    handleAttemptCloseSettings: state.handleAttemptCloseSettings,
    setDiscardConfirmOpen: state.setDiscardConfirmOpen,
    confirmDiscardSettings: state.confirmDiscardSettings,
    setActiveSettingsTab: state.setActiveSettingsTab,
    handleSettingsChange: state.handleSettingsChange,
    handlePreferenceChange: state.handlePreferenceChange,
    handleSettingsSave: state.handleSettingsSave,
    setDeleteConfirmText: state.setDeleteConfirmText,
    handleDeleteAccountIntent: state.handleDeleteAccountIntent
  })));

  const handleDeleteAccount = () => {
    handleDeleteAccountIntent(navigate);
  };

  const handleDilChange = (value) => {
    handlePreferenceChange({ target: { name: 'dil', value } });
  };

  const handleParaBirimiChange = (value) => {
    handlePreferenceChange({ target: { name: 'para_birimi', value } });
  };

  const handleOlcuBirimiChange = (value) => {
    handlePreferenceChange({ target: { name: 'olcu_birimi', value } });
  };

  const handleEmailSwitchChange = (checked) => {
    handleSettingsChange({
      target: { name: 'email_bildirim_aktif', type: 'checkbox', checked }
    });
  };

  const handleSmsSwitchChange = (checked) => {
    handleSettingsChange({
      target: { name: 'sms_bildirim_aktif', type: 'checkbox', checked }
    });
  };

  if (!isSettingsOpen) return null;

  return (
    <>
      <div
        onClick={handleAttemptCloseSettings}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-truss-bg/80 backdrop-blur-sm px-4 ${isSettingsVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}
      >
        <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-4xl rounded-2xl border border-truss-border bg-truss-surface p-6 text-truss-text shadow-2xl backdrop-blur-xl ${isSettingsVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
          <div className="mb-4 flex items-center justify-between border-b border-truss-border pb-3">
            <h3 className="font-display text-xl font-bold text-truss-text">Komuta Merkezi Ayarlari</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAttemptCloseSettings}
              className="h-8 w-8 rounded-lg border border-truss-border text-truss-muted hover:bg-truss-bg hover:text-truss-text"
              aria-label="Ayarlar penceresini kapat"
            >
              ×
            </Button>
          </div>

          <form onSubmit={handleSettingsSave} className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
            <aside className="rounded-xl border border-truss-border bg-truss-bg p-2">
              {settingsTabs.map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveSettingsTab(tab.key)}
                  className={`mb-1 w-full justify-start rounded-lg px-3 py-2 text-left text-sm transition-colors duration-300 ${
                    activeSettingsTab === tab.key
                      ? 'bg-truss-purple font-semibold text-truss-text hover:bg-truss-purple-hover'
                      : 'text-truss-muted hover:bg-truss-surface hover:text-truss-text'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </aside>

            <section className="animate-fade-in min-h-[320px] rounded-xl border border-truss-border bg-truss-bg p-4">
              {activeSettingsTab === 'hesap' && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Ad Soyad</Label>
                    <Input
                      type="text"
                      value={settingsForm.ad_soyad}
                      disabled
                      className="border-truss-border bg-truss-surface text-truss-text"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-truss-muted">E-posta</Label>
                    <Input
                      type="text"
                      value={settingsForm.email}
                      disabled
                      className="border-truss-border bg-truss-surface text-truss-text"
                    />
                  </div>
                </div>
              )}

              {activeSettingsTab === 'tercihler' && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Dil</Label>
                    <Select
                      value={settingsForm.dil}
                      onValueChange={handleDilChange}
                    >
                      <SelectTrigger className="border-truss-border bg-truss-surface text-truss-text">
                        <SelectValue placeholder="Dil seciniz" />
                      </SelectTrigger>
                      <SelectContent className="border-truss-border bg-truss-surface text-truss-text">
                        <SelectItem value="TR">Türkçe (TR)</SelectItem>
                        <SelectItem value="EN">İngilizce (EN)</SelectItem>
                        <SelectItem value="RU">Rusça (RU)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Para Birimi</Label>
                    <Select
                      value={settingsForm.para_birimi}
                      onValueChange={handleParaBirimiChange}
                    >
                      <SelectTrigger className="border-truss-border bg-truss-surface text-truss-text">
                        <SelectValue placeholder="Para birimi seciniz" />
                      </SelectTrigger>
                      <SelectContent className="border-truss-border bg-truss-surface text-truss-text">
                        <SelectItem value="TRY">TRY (₺)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Birim</Label>
                    <Select
                      value={settingsForm.olcu_birimi}
                      onValueChange={handleOlcuBirimiChange}
                    >
                      <SelectTrigger className="border-truss-border bg-truss-surface text-truss-text">
                        <SelectValue placeholder="Birim seciniz" />
                      </SelectTrigger>
                      <SelectContent className="border-truss-border bg-truss-surface text-truss-text">
                        <SelectItem value="KM">Kilometre (KM)</SelectItem>
                        <SelectItem value="MI">Mil (MI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'bildirimler' && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Telefon Numarasi</Label>
                    <Input
                      type="text"
                      name="telefon"
                      value={settingsForm.telefon}
                      onChange={handleSettingsChange}
                      className="border-truss-border bg-truss-surface text-truss-text"
                      placeholder="05xx xxx xx xx"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-truss-border bg-truss-surface px-3.5 py-2.5">
                    <Label htmlFor="layout_email_bildirim_aktif" className="cursor-pointer text-sm text-truss-text">
                      E-posta bildirimi istiyorum
                    </Label>
                    <Switch
                      id="layout_email_bildirim_aktif"
                      checked={settingsForm.email_bildirim_aktif}
                      onCheckedChange={handleEmailSwitchChange}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-truss-border bg-truss-surface px-3.5 py-2.5">
                    <Label htmlFor="layout_sms_bildirim_aktif" className="cursor-pointer text-sm text-truss-text">
                      SMS bildirimi istiyorum
                    </Label>
                    <Switch
                      id="layout_sms_bildirim_aktif"
                      checked={settingsForm.sms_bildirim_aktif}
                      onCheckedChange={handleSmsSwitchChange}
                    />
                  </div>
                </div>
              )}

              {activeSettingsTab === 'gelismis' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-destructive">Danger Zone</h4>
                    <p className="mb-3 text-sm text-truss-muted">
                      Hesap silme islemi geri alinamaz. Devam etmek icin ONAYLIYORUM yazin.
                    </p>
                    <Input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="border-truss-border bg-truss-surface text-truss-text"
                      placeholder="ONAYLIYORUM"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      className="mt-3"
                      disabled={deleteConfirmText.trim().toUpperCase() !== 'ONAYLIYORUM' || isSaving}
                    >
                      {isSaving ? 'Siliniyor...' : 'Hesabimi Sil'}
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <div className="md:col-span-2 flex justify-end gap-2.5 border-t border-truss-border pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleAttemptCloseSettings}
                className="border-truss-border bg-truss-bg text-truss-text hover:border-truss-purple hover:bg-truss-purple/15"
              >
                Kapat
              </Button>
              <Button type="submit" variant="default" disabled={isSaving} className="neo-btn bg-truss-purple text-truss-text shadow-sm hover:bg-truss-purple-hover">
                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <AlertDialog open={isDiscardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş değişiklikler</AlertDialogTitle>
            <AlertDialogDescription>
              Kaydedilmemiş değişiklikleriniz var, çıkmak istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDiscardSettings}>
              Değişiklikleri Yoksay ve Çık
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SettingsModal;

