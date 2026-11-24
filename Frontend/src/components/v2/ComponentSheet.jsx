import React from 'react';
import AppSheet from '@/components/v2/AppSheet';
import useComponentSheetForm from './component-sheet/useComponentSheetForm';
import ComponentIdentitySection from './component-sheet/ComponentIdentitySection';
import ComponentLifecycleSection from './component-sheet/ComponentLifecycleSection';

export default function ComponentSheet({
  open,
  onOpenChange,
  mode = 'create',
  parca = null,
  prefill = null,
  araclar = [],
  defaultAracId = null,
  onSuccess,
}) {
  const {
    form,
    fieldErrors,
    sayacHatasi,
    isSubmitting,
    isDirty,
    isCreateMode,
    isReplaceMode,
    selectedArac,
    isSmh,
    birim,
    birimEtiketi,
    selectedAracInList,
    meta,
    updateField,
    handleAracChange,
    handleSonDegisimKmChange,
    handleSubmit,
  } = useComponentSheetForm({
    open,
    onOpenChange,
    mode,
    parca,
    prefill,
    araclar,
    defaultAracId,
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
      onSubmit={handleSubmit}
    >
      {/* 1. Bölüm: Araç & Parça Kimliği */}
      <ComponentIdentitySection
        form={form}
        araclar={araclar}
        parca={parca}
        selectedAracInList={selectedAracInList}
        isCreateMode={isCreateMode}
        isReplaceMode={isReplaceMode}
        fieldErrors={fieldErrors}
        handleAracChange={handleAracChange}
        updateField={updateField}
      />

      {/* 2. & 3. Bölüm: Değişim & Ömür Parametreleri + Notlar */}
      <ComponentLifecycleSection
        form={form}
        selectedArac={selectedArac}
        isSmh={isSmh}
        birim={birim}
        birimEtiketi={birimEtiketi}
        fieldErrors={fieldErrors}
        sayacHatasi={sayacHatasi}
        handleSonDegisimKmChange={handleSonDegisimKmChange}
        updateField={updateField}
      />
    </AppSheet>
  );
}
