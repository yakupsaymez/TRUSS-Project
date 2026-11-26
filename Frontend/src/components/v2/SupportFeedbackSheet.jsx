import React from 'react';
import AppSheet, { SheetField, SheetFormSection } from '@/components/v2/AppSheet';
import CorporateContactCard from '@/components/v2/CorporateContactCard';
import SupportAdminList from '@/components/v2/support/SupportAdminList';
import { useSupportFeedback } from '@/components/v2/support/useSupportFeedback';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SupportFeedbackSheet({ open, onOpenChange, role }) {
  const {
    isAdmin,
    activeTab,
    setActiveTab,
    kategori,
    setKategori,
    baslik,
    setBaslik,
    mesaj,
    setMesaj,
    formError,
    submitting,
    items,
    loadingList,
    listError,
    filterDurum,
    setFilterDurum,
    filterKategori,
    setFilterKategori,
    updatingId,
    fetchList,
    handleSubmit,
    handleUpdateStatus,
    handleOpenChange,
  } = useSupportFeedback({ open, role, onOpenChange });

  const isDirty = activeTab === 'yeni' && Boolean(baslik.trim() || mesaj.trim());

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Destek & Geri Bildirim"
      description="Operasyon sorunlarını, hata bildirimlerini ve ürün önerilerinizi iletin."
      onSubmit={handleSubmit}
      submitLabel="Bildirimi Gönder"
      isSubmitting={submitting}
      isDirty={isDirty}
      footer={activeTab === 'yeni' ? undefined : null}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="yeni" className="text-xs">Yeni Bildirim</TabsTrigger>
          <TabsTrigger value="liste" className="text-xs">
            {isAdmin ? 'Gelen Bildirimler' : 'Taleplerim'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="yeni" className="mt-4 space-y-5">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {formError}
            </div>
          )}

          <SheetFormSection title="Bildirim Detayı">
            <SheetField label="Kategori" htmlFor="support-kategori" required>
              <Select value={kategori} onValueChange={setKategori} disabled={submitting}>
                <SelectTrigger id="support-kategori">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESTEK">Operasyonel Destek</SelectItem>
                  <SelectItem value="HATA">Hata Bildirimi</SelectItem>
                  <SelectItem value="ONERI">Özellik Önerisi</SelectItem>
                </SelectContent>
              </Select>
            </SheetField>

            <SheetField label="Başlık" htmlFor="support-baslik" required hint="3 - 140 karakter">
              <Input
                id="support-baslik"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                placeholder="Kısa bir özet başlık yazın"
                maxLength={140}
                disabled={submitting}
                required
              />
            </SheetField>

            <SheetField label="Açıklama" htmlFor="support-mesaj" required hint="En az 10 karakter">
              <Textarea
                id="support-mesaj"
                value={mesaj}
                onChange={(e) => setMesaj(e.target.value)}
                placeholder="Yaşadığınız durumu veya önerinizi detaylandırın..."
                rows={4}
                maxLength={2000}
                disabled={submitting}
                required
              />
            </SheetField>
          </SheetFormSection>

          <SheetFormSection title="Kurumsal İletişim">
            <CorporateContactCard />
          </SheetFormSection>
        </TabsContent>

        <TabsContent value="liste" className="mt-4">
          <SupportAdminList
            items={items}
            loading={loadingList}
            error={listError}
            isAdmin={isAdmin}
            filterDurum={filterDurum}
            filterKategori={filterKategori}
            onFilterDurumChange={setFilterDurum}
            onFilterKategoriChange={setFilterKategori}
            updatingId={updatingId}
            onUpdateStatus={handleUpdateStatus}
            onRetry={fetchList}
          />
        </TabsContent>
      </Tabs>
    </AppSheet>
  );
}
