import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
    isSaving,
    settingsForm,
    activeSettingsTab,
    deleteConfirmText,
    handleAttemptCloseSettings,
    setActiveSettingsTab,
    handleSettingsChange,
    handlePreferenceChange,
    handleSettingsSave,
    setDeleteConfirmText,
    handleDeleteAccountIntent
  } = useAppStore(useShallow((state) => ({
    isSettingsOpen: state.isSettingsOpen,
    isSettingsVisible: state.isSettingsVisible,
    isSaving: state.isSaving,
    settingsForm: state.settingsForm,
    activeSettingsTab: state.activeSettingsTab,
    deleteConfirmText: state.deleteConfirmText,
    handleAttemptCloseSettings: state.handleAttemptCloseSettings,
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
    <div
      onClick={handleAttemptCloseSettings}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 ${isSettingsVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}
    >
      <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${isSettingsVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Komuta Merkezi Ayarlari</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleAttemptCloseSettings}
            className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
            aria-label="Ayarlar penceresini kapat"
          >
            ×
          </Button>
        </div>

        <form onSubmit={handleSettingsSave} className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-2">
            {settingsTabs.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant="ghost"
                onClick={() => setActiveSettingsTab(tab.key)}
                className={`mb-1 w-full justify-start rounded-lg px-3 py-2 text-left text-sm transition-colors duration-300 ${
                  activeSettingsTab === tab.key
                    ? 'bg-[#2563EB] font-semibold text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </aside>

          <section className="animate-fade-in min-h-[320px] rounded-xl border border-slate-200 bg-white p-4">
            {activeSettingsTab === 'hesap' && (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block text-slate-700">Ad Soyad</Label>
                  <Input
                    type="text"
                    value={settingsForm.ad_soyad}
                    disabled
                    className="border-slate-200 bg-slate-100 text-slate-700"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-slate-700">E-posta</Label>
                  <Input
                    type="text"
                    value={settingsForm.email}
                    disabled
                    className="border-slate-200 bg-slate-100 text-slate-700"
                  />
                </div>
              </div>
            )}

            {activeSettingsTab === 'tercihler' && (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block text-slate-700">Dil</Label>
                  <Select
                    value={settingsForm.dil}
                    onValueChange={handleDilChange}
                  >
                    <SelectTrigger className="border-slate-200 bg-white text-slate-700">
                      <SelectValue placeholder="Dil seciniz" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-700">
                      <SelectItem value="TR">Türkçe (TR)</SelectItem>
                      <SelectItem value="EN">İngilizce (EN)</SelectItem>
                      <SelectItem value="RU">Rusça (RU)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-slate-700">Para Birimi</Label>
                  <Select
                    value={settingsForm.para_birimi}
                    onValueChange={handleParaBirimiChange}
                  >
                    <SelectTrigger className="border-slate-200 bg-white text-slate-700">
                      <SelectValue placeholder="Para birimi seciniz" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-700">
                      <SelectItem value="TRY">TRY (₺)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-slate-700">Birim</Label>
                  <Select
                    value={settingsForm.olcu_birimi}
                    onValueChange={handleOlcuBirimiChange}
                  >
                    <SelectTrigger className="border-slate-200 bg-white text-slate-700">
                      <SelectValue placeholder="Birim seciniz" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-700">
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
                  <Label className="mb-1 block text-slate-700">Telefon Numarasi</Label>
                  <Input
                    type="text"
                    name="telefon"
                    value={settingsForm.telefon}
                    onChange={handleSettingsChange}
                    className="border-slate-200 bg-white text-slate-700"
                    placeholder="05xx xxx xx xx"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Label htmlFor="layout_email_bildirim_aktif" className="cursor-pointer text-sm text-slate-700">
                    E-posta bildirimi istiyorum
                  </Label>
                  <Switch
                    id="layout_email_bildirim_aktif"
                    checked={settingsForm.email_bildirim_aktif}
                    onCheckedChange={handleEmailSwitchChange}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Label htmlFor="layout_sms_bildirim_aktif" className="cursor-pointer text-sm text-slate-700">
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
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-rose-700">Danger Zone</h4>
                  <p className="mb-3 text-sm text-rose-600">
                    Hesap silme islemi geri alinamaz. Devam etmek icin ONAYLIYORUM yazin.
                  </p>
                  <Input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="border-rose-200 bg-white text-slate-700"
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

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAttemptCloseSettings}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            >
              Kapat
            </Button>
            <Button type="submit" variant="default" disabled={isSaving} className="neo-btn bg-[#2563EB] text-white shadow-sm hover:bg-[#1D4ED8]">
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;

