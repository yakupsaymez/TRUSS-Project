import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
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

  const inputClassName =
    'h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-truss-bg/80 px-4 backdrop-blur-sm ${isQuickFuelModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
      <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-truss-border bg-truss-surface p-6 sm:p-7 text-truss-text shadow-2xl backdrop-blur-xl ${isQuickFuelModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
        <h3 className="mb-5 text-xl font-bold text-truss-text">Hızlı Yakıt Kaydı</h3>

        {quickFuelError && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {quickFuelError}
          </div>
        )}

        <form onSubmit={handleQuickFuelSubmit} onKeyDown={handleFormEnterKeyDown} className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Araç Seç</Label>
            <Select
              value={quickFuelData.arac_id}
              onValueChange={(value) => handleQuickFuelInputChange({ target: { name: 'arac_id', value } })}
            >
              <SelectTrigger
                ref={quickFuelAracSelectRef}
                autoFocus
                className={inputClassName}
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
            <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Tarih</Label>
            <TrussDatePicker
              name="tarih"
              value={quickFuelData.tarih}
              onChange={handleQuickFuelInputChange}
              placeholder="Yakıt tarihi seçin"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Litre</Label>
              <Input
                type="text"
                inputMode="decimal"
                name="litre"
                value={quickFuelData.litre}
                onChange={handleQuickFuelInputChange}
                className={inputClassName}
                placeholder="45.5"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Tutar</Label>
              <Input
                type="text"
                inputMode="decimal"
                name="tutar"
                value={quickFuelData.tutar}
                onChange={handleQuickFuelInputChange}
                onBlur={handleQuickFuelNumberBlur}
                className={inputClassName}
                placeholder="2500"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-truss-muted">KM</Label>
              <Input
                type="text"
                inputMode="numeric"
                name="km"
                value={quickFuelData.km}
                onChange={handleQuickFuelInputChange}
                onBlur={handleQuickFuelNumberBlur}
                className={inputClassName}
                placeholder="125000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-truss-border">
            <Button
              type="button"
              variant="outline"
              onClick={closeQuickFuelModal}
              className="rounded-xl border border-truss-border bg-truss-bg px-4 py-2 text-truss-muted hover:border-truss-purple/50 hover:bg-truss-purple/15 hover:text-truss-text"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isQuickFuelSubmitting}
              className="neo-btn rounded-xl bg-truss-purple px-5 py-2 font-semibold text-truss-text shadow-md shadow-truss-purple/20 hover:bg-truss-purple-hover"
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


