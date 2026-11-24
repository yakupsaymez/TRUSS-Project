import React from 'react';
import { formatTurkishPlate } from '@/utils/formatters';
import AppSheet from '@/components/v2/AppSheet';
import useVehicleSheetForm from './vehicle-sheet/useVehicleSheetForm';
import VehicleCatalogSection from './vehicle-sheet/VehicleCatalogSection';
import VehicleCalibrationSection from './vehicle-sheet/VehicleCalibrationSection';
import VehicleDocumentsSection from './vehicle-sheet/VehicleDocumentsSection';

export default function VehicleSheet({ open, onOpenChange, arac = null, onSuccess }) {
  const {
    form,
    fieldErrors,
    sayacHatasi,
    isSubmitting,
    isEditMode,
    isDirty,
    isSmh,
    katalog,
    updateField,
    handleSayacTipiChange,
    handleGuncelSayacChange,
    handleSubmit,
  } = useVehicleSheetForm({ open, arac, onOpenChange, onSuccess });

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}
      description={
        isEditMode
          ? 'Araç kimliği, katalog varyantı, sayaç kalibrasyonu, bakım periyodu ve belge vadelerini güncelleyin.'
          : 'Filoya yeni araç ekleyin; 4 kademeli araç katalogundan varyant seçerek bakım periyotlarını otomatik doldurun.'
      }
      badge={isEditMode ? formatTurkishPlate(arac.plaka) : null}
      submitLabel={isEditMode ? 'Değişiklikleri Kaydet' : 'Aracı Ekle'}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      {/* 1. Bölüm: Kimlik & Sınıflandırma (4 Kademeli Araç Katalogu) */}
      <VehicleCatalogSection
        form={form}
        fieldErrors={fieldErrors}
        katalog={katalog}
        updateField={updateField}
      />

      {/* 2. Bölüm: Sayaç & Bakım Kalibrasyonu */}
      <VehicleCalibrationSection
        form={form}
        isSmh={isSmh}
        fieldErrors={fieldErrors}
        sayacHatasi={sayacHatasi}
        updateField={updateField}
        handleSayacTipiChange={handleSayacTipiChange}
        handleGuncelSayacChange={handleGuncelSayacChange}
      />

      {/* 3. Bölüm: Resmi Evrak Vadeleri */}
      <VehicleDocumentsSection form={form} updateField={updateField} />
    </AppSheet>
  );
}
