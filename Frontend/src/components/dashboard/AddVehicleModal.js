import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AddVehicleModal = ({
  isModalOpen,
  isModalVisible,
  editingAracId,
  formData,
  isSubmitting,
  handleAddArac,
  handleFormEnterKeyDown,
  handleInputChange,
  closeModal,
  plakaInputRef
}) => {
  if (!isModalOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ${isModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
      <div className={`glass-card w-full max-w-md rounded-xl p-6 text-slate-100 shadow-xl ${isModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
        <h3 className="mb-4 text-xl font-semibold text-slate-50">{editingAracId ? 'Araç Düzenle' : 'Yeni Araç Ekle'}</h3>

        <form onSubmit={handleAddArac} onKeyDown={handleFormEnterKeyDown} className="space-y-4">
          <div>
            <Label className="mb-1 block text-slate-300">Plaka</Label>
            <Input
              ref={plakaInputRef}
              type="text"
              name="plaka"
              value={formData.plaka}
              onChange={handleInputChange}
              autoFocus
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-emerald-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
              placeholder="34 ABC 123"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">Marka</Label>
            <Input
              type="text"
              name="marka"
              value={formData.marka}
              onChange={handleInputChange}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-emerald-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
              placeholder="Toyota"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">Model</Label>
            <Input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-emerald-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
              placeholder="Corolla"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">Yıl</Label>
            <Input
              type="number"
              name="yil"
              value={formData.yil}
              onChange={handleInputChange}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-emerald-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
              placeholder="2020"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">Muayene Tarihi</Label>
            <Input
              type="date"
              name="muayene_tarihi"
              value={formData.muayene_tarihi}
              onChange={handleInputChange}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-emerald-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">Kasko Tarihi</Label>
            <Input
              type="date"
              name="kasko_tarihi"
              value={formData.kasko_tarihi}
              onChange={handleInputChange}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-emerald-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">Sigorta Tarihi</Label>
            <Input
              type="date"
              name="sigorta_tarihi"
              value={formData.sigorta_tarihi}
              onChange={handleInputChange}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-emerald-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="border-slate-400/60 bg-white/95 text-slate-900 hover:bg-slate-200 dark:border-white/30 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800/90"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-400 font-semibold text-slate-950 shadow-md hover:bg-emerald-300"
            >
              {isSubmitting ? (editingAracId ? 'Guncelleniyor...' : 'Ekleniyor...') : (editingAracId ? 'Guncelle' : 'Kaydet')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVehicleModal;

