import React, { useState } from 'react';
import AppSheet from '@/components/v2/AppSheet';
import ActiveAssignmentsList from './assign-vehicle/ActiveAssignmentsList';
import AssignFormSection from './assign-vehicle/AssignFormSection';
import HandoverChecklistFields from './assign-vehicle/HandoverChecklistFields';
import HandoverInspectionSheet from './assign-vehicle/HandoverInspectionSheet';
import useAssignVehicleController from './assign-vehicle/useAssignVehicleController';

export default function AssignVehicleSheet({
  open,
  onOpenChange,
  member = null,
  drivers = [],
  vehicles = [],
  users = [],
  onSuccess,
}) {
  const [inspectionTarget, setInspectionTarget] = useState(null);
  const c = useAssignVehicleController({
    open,
    onOpenChange,
    member,
    drivers,
    vehicles,
    users,
    onSuccess,
  });

  const handleInspectionSuccess = async () => {
    await Promise.all([
      onSuccess?.(),
      c.loadDriverZimmetler(c.form.sofor_user_id),
    ]);
  };

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Araç Zimmetle"
        description="Şoför rolündeki ekip üyesine aktif araç zimmeti oluşturun, teslim muayenesi yapın veya zimmeti kapatın."
        onSubmit={c.handleSubmit}
        submitLabel={c.includeInspection ? 'Zimmetle & Muayeneyi Kaydet' : 'Aracı Zimmetle'}
        isSubmitting={c.isSubmitting}
        submitDisabled={c.photoUploading}
        isDirty={c.isDirty}
      >
        <AssignFormSection
          member={member}
          drivers={drivers}
          vehicles={vehicles}
          activeAssigneeByVehicle={c.activeAssigneeByVehicle}
          form={c.form}
          fieldErrors={c.fieldErrors}
          isSubmitting={c.isSubmitting}
          selectedVehicleOwner={c.selectedVehicleOwner}
          isTransferringFromOtherDriver={c.isTransferringFromOtherDriver}
          isSameDriverAlreadyAssigned={c.isSameDriverAlreadyAssigned}
          includeInspection={c.includeInspection}
          onToggleInspection={c.handleToggleInspection}
          onFieldChange={c.handleFieldChange}
          inspectionChildren={
            <HandoverChecklistFields
              idPrefix="assign-handover"
              arac={c.selectedVehicle}
              muayeneTarihi={c.form.muayene_tarihi}
              onDateChange={(v) => c.handleFieldChange('muayene_tarihi', v)}
              dateError={c.fieldErrors.muayene_tarihi}
              sayacDegeri={c.form.sayac_degeri}
              onSayacChange={(v) => c.handleFieldChange('sayac_degeri', v)}
              sayacFieldError={c.sayacFieldError}
              sayacLocalError={c.fieldErrors.sayac_degeri}
              checklist={c.form.checklist}
              onChecklistChange={c.handleChecklistChange}
              genelSonuc={c.form.genel_sonuc}
              onGenelSonucChange={(v) => c.handleFieldChange('genel_sonuc', v)}
              notlar={c.form.notlar}
              onNotlarChange={(v) => c.handleFieldChange('notlar', v)}
              photoItems={c.photoItems}
              photoUploading={c.photoUploading}
              photoError={c.photoError}
              photoDisabled={!c.form.arac_id}
              disabled={c.isSubmitting}
              onSelectPhoto={c.handleSelectPhoto}
              onRemovePhoto={c.handleRemovePhoto}
            />
          }
        />

        <ActiveAssignmentsList
          selectedDriver={c.selectedDriver}
          assignments={c.mergedAssignments}
          loading={c.loadingZimmetler}
          isSubmitting={c.isSubmitting}
          unassigningVehicleId={c.unassigningVehicleId}
          onStartInspection={(assignment, tip) => setInspectionTarget({ assignment, tip })}
          onUnassign={c.handleUnassignVehicle}
        />
      </AppSheet>

      <HandoverInspectionSheet
        open={Boolean(inspectionTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setInspectionTarget(null);
        }}
        assignment={inspectionTarget?.assignment || null}
        defaultTip={inspectionTarget?.tip || null}
        defaultCloseAssignment={inspectionTarget?.tip === 'TESLIM_ETME'}
        onSuccess={handleInspectionSuccess}
      />
    </>
  );
}
