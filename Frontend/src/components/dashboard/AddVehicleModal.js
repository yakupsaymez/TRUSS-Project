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
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm ${isModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
      <div className={`glass-card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-7 text-slate-900 shadow-2xl ${isModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
        <h3 className="mb-5 text-xl font-bold text-slate-900">{editingAracId ? 'Araç Düzenle' : 'Yeni Araç Ekle'}</h3>

        <form onSubmit={handleAddArac} onKeyDown={handleFormEnterKeyDown} className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-slate-700">Plaka</Label>
            <Input
              ref={plakaInputRef}
              type="text"
              name="plaka"
              value={formData.plaka}
              onChange={handleInputChange}
              autoFocus
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="34 ABC 123"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-slate-700">Marka</Label>
            <Input
              type="text"
              name="marka"
              value={formData.marka}
              onChange={handleInputChange}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="Toyota"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-slate-700">Model</Label>
            <Input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="Corolla"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-slate-700">Yıl</Label>
            <Input
              type="number"
              name="yil"
              value={formData.yil}
              onChange={handleInputChange}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="2020"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
            <Label className="mb-1.5 block text-slate-700">Muayene Tarihi</Label>
            <Input
              type="date"
              name="muayene_tarihi"
              value={formData.muayene_tarihi}
              onChange={handleInputChange}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            />
            </div>

            <div>
            <Label className="mb-1.5 block text-slate-700">Kasko Tarihi</Label>
            <Input
              type="date"
              name="kasko_tarihi"
              value={formData.kasko_tarihi}
              onChange={handleInputChange}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            />
            </div>

            <div>
            <Label className="mb-1.5 block text-slate-700">Sigorta Tarihi</Label>
            <Input
              type="date"
              name="sigorta_tarihi"
              value={formData.sigorta_tarihi}
              onChange={handleInputChange}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="neo-btn bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-95"
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

