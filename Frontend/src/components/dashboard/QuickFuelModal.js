import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const QuickFuelModal = ({
  isQuickFuelModalOpen,
  isQuickFuelModalVisible,
  quickFuelError,
  handleQuickFuelSubmit,
  handleFormEnterKeyDown,
  quickFuelData,
  handleQuickFuelInputChange,
  handleQuickFuelNumberBlur,
  araclar,
  closeQuickFuelModal,
  isQuickFuelSubmitting,
  quickFuelAracSelectRef
}) => {
  if (!isQuickFuelModalOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm ${isQuickFuelModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
      <div className={`glass-card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-7 text-slate-900 shadow-2xl ${isQuickFuelModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
        <h3 className="mb-5 text-xl font-bold text-slate-900">Hızlı Yakıt Kaydı</h3>

        {quickFuelError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {quickFuelError}
          </div>
        )}

        <form onSubmit={handleQuickFuelSubmit} onKeyDown={handleFormEnterKeyDown} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Araç Seç</Label>
            <Select
              value={quickFuelData.arac_id}
              onValueChange={(value) => handleQuickFuelInputChange({ target: { name: 'arac_id', value } })}
            >
              <SelectTrigger
                ref={quickFuelAracSelectRef}
                autoFocus
                className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              >
                <SelectValue placeholder="Araç seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {araclar.map((arac) => (
                  <SelectItem key={arac.arac_id} value={String(arac.arac_id)}>
                    {(arac.plaka || '-') + ' - ' + (arac.marka || '-') + ' ' + (arac.model || '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Tarih</Label>
            <Input
              type="date"
              name="tarih"
              value={quickFuelData.tarih}
              onChange={handleQuickFuelInputChange}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
            <Label className="mb-1.5 block">Litre</Label>
            <Input
              type="text"
              inputMode="decimal"
              name="litre"
              value={quickFuelData.litre}
              onChange={handleQuickFuelInputChange}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="45.5"
            />
            </div>

            <div>
            <Label className="mb-1.5 block">Tutar</Label>
            <Input
              type="text"
              inputMode="decimal"
              name="tutar"
              value={quickFuelData.tutar}
              onChange={handleQuickFuelInputChange}
              onBlur={handleQuickFuelNumberBlur}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="2500"
            />
            </div>

            <div>
            <Label className="mb-1.5 block">KM</Label>
            <Input
              type="text"
              inputMode="numeric"
              name="km"
              value={quickFuelData.km}
              onChange={handleQuickFuelInputChange}
              onBlur={handleQuickFuelNumberBlur}
              className="neon-focus border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="125000"
            />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeQuickFuelModal}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isQuickFuelSubmitting}
              className="neo-btn bg-indigo-500 font-semibold text-white shadow-md hover:bg-indigo-400"
            >
              {isQuickFuelSubmitting ? 'Kaydediliyor...' : 'Yakıt Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickFuelModal;

