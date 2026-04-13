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
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ${isQuickFuelModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
      <div className={`glass-card w-full max-w-md rounded-xl p-6 text-slate-100 shadow-xl ${isQuickFuelModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
        <h3 className="mb-4 text-xl font-semibold text-slate-50">Hızlı Yakıt Kaydı</h3>

        {quickFuelError && (
          <div className="mb-4 rounded-md border border-red-300/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {quickFuelError}
          </div>
        )}

        <form onSubmit={handleQuickFuelSubmit} onKeyDown={handleFormEnterKeyDown} className="space-y-4">
          <div>
            <Label className="mb-1 block text-slate-300">Araç Seç</Label>
            <Select
              value={quickFuelData.arac_id}
              onValueChange={(value) => handleQuickFuelInputChange({ target: { name: 'arac_id', value } })}
            >
              <SelectTrigger
                ref={quickFuelAracSelectRef}
                autoFocus
                className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-indigo-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
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
            <Label className="mb-1 block text-slate-300">Tarih</Label>
            <Input
              type="date"
              name="tarih"
              value={quickFuelData.tarih}
              onChange={handleQuickFuelInputChange}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-indigo-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">Litre</Label>
            <Input
              type="text"
              inputMode="decimal"
              name="litre"
              value={quickFuelData.litre}
              onChange={handleQuickFuelInputChange}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-indigo-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
              placeholder="45.5"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">Tutar</Label>
            <Input
              type="text"
              inputMode="decimal"
              name="tutar"
              value={quickFuelData.tutar}
              onChange={handleQuickFuelInputChange}
              onBlur={handleQuickFuelNumberBlur}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-indigo-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
              placeholder="2500"
            />
          </div>

          <div>
            <Label className="mb-1 block text-slate-300">KM</Label>
            <Input
              type="text"
              inputMode="numeric"
              name="km"
              value={quickFuelData.km}
              onChange={handleQuickFuelInputChange}
              onBlur={handleQuickFuelNumberBlur}
              className="border-slate-400/60 bg-white/95 text-slate-900 focus-visible:ring-indigo-300 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-100"
              placeholder="125000"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeQuickFuelModal}
              className="border-slate-400/60 bg-white/95 text-slate-900 hover:bg-slate-200 dark:border-white/30 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800/90"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isQuickFuelSubmitting}
              className="bg-indigo-400 font-semibold text-slate-950 shadow-md hover:bg-indigo-300"
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

