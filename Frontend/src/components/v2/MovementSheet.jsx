import React from 'react';
import { Fuel, Wrench } from 'lucide-react';
import AppSheet from '@/components/v2/AppSheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useMovementSheetForm from './movement-sheet/useMovementSheetForm';
import MovementIdentitySection from './movement-sheet/MovementIdentitySection';
import MovementCostSection from './movement-sheet/MovementCostSection';
import MovementNotesSection from './movement-sheet/MovementNotesSection';

export default function MovementSheet({
  open,
  onOpenChange,
  mode = 'create',
  initialTip = 'YAKIT',
  record = null,
  prefill = null,
  araclar = [],
  defaultAracId = null,
  canAddFuel: canAddFuelProp,
  canAddMaintenance: canAddMaintenanceProp,
  onSuccess,
}) {
  const {
    form,
    fieldErrors,
    sayacHatasi,
    isSubmitting,
    isDirty,
    isYakit,
    isSmh,
    canAddFuel,
    canAddMaintenance,
    canViewFinance,
    canUploadBelge,
    belgeDraft,
    belgeUploading,
    belgeError,
    yakitOptions,
    bakimOptions,
    selectedAracInList,
    liveUnitPriceHint,
    meta,
    handleTipChange,
    handleAracChange,
    handleTarihChange,
    handleKmChange,
    handleSelectBelge,
    handleRemoveBelge,
    handleOpenBelge,
    updateField,
    handleSubmit,
  } = useMovementSheetForm({
    open,
    onOpenChange,
    mode,
    initialTip,
    record,
    prefill,
    araclar,
    defaultAracId,
    canAddFuelProp,
    canAddMaintenanceProp,
    onSuccess,
  });

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={meta.title}
      description={meta.description}
      badge={meta.badge}
      submitLabel={meta.submitLabel}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      submitDisabled={belgeUploading}
      onSubmit={handleSubmit}
    >
      {/* Kayıt Türü Seçimi (Yalnızca Yeni Kayıt Modunda ve Her İki Yetki Açıkken) */}
      {mode === 'create' && canAddFuel && canAddMaintenance && (
        <Tabs value={form.tip} onValueChange={handleTipChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="YAKIT" className="gap-1.5 text-xs">
              <Fuel className="size-3.5" />
              <span>Yakıt</span>
            </TabsTrigger>
            <TabsTrigger value="BAKIM" className="gap-1.5 text-xs">
              <Wrench className="size-3.5" />
              <span>Bakım</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* 1. Bölüm: Araç & Tarih */}
      <MovementIdentitySection
        form={form}
        isYakit={isYakit}
        araclar={araclar}
        record={record}
        selectedAracInList={selectedAracInList}
        yakitOptions={yakitOptions}
        bakimOptions={bakimOptions}
        fieldErrors={fieldErrors}
        handleAracChange={handleAracChange}
        handleTarihChange={handleTarihChange}
        updateField={updateField}
      />

      {/* 2. Bölüm: Sayaç & Maliyet */}
      <MovementCostSection
        form={form}
        isYakit={isYakit}
        isSmh={isSmh}
        fieldErrors={fieldErrors}
        sayacHatasi={sayacHatasi}
        liveUnitPriceHint={liveUnitPriceHint}
        handleKmChange={handleKmChange}
        updateField={updateField}
      />

      {/* 3. Bölüm: Fatura & Notlar */}
      <MovementNotesSection
        form={form}
        isYakit={isYakit}
        fieldErrors={fieldErrors}
        updateField={updateField}
        canUploadBelge={canUploadBelge}
        canViewFinance={canViewFinance}
        belgeDraft={belgeDraft}
        belgeUploading={belgeUploading}
        belgeError={belgeError}
        onSelectBelge={handleSelectBelge}
        onRemoveBelge={handleRemoveBelge}
        onOpenBelge={handleOpenBelge}
      />
    </AppSheet>
  );
}
