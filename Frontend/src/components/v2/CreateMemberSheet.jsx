import React from 'react';
import AppSheet from '@/components/v2/AppSheet';
import { ROLES } from '@/components/v2/channelAccess';
import CreateMemberFormSections from '@/components/v2/create-member/CreateMemberFormSections';
import CreateMemberVehicleSection from '@/components/v2/create-member/CreateMemberVehicleSection';
import { useCreateMemberController } from '@/components/v2/create-member/useCreateMemberController';

export default function CreateMemberSheet({
  open,
  onOpenChange,
  isSystemAdminViewer = false,
  vehicles = [],
  onSuccess,
}) {
  const {
    form,
    fieldErrors,
    isSubmitting,
    isDirty,
    roleOptions,
    assignableVehicles,
    handleOpenChange,
    handleChange,
    handleRoleChange,
    handleTogglePerm,
    handleSubmit,
  } = useCreateMemberController({
    open,
    onOpenChange,
    isSystemAdminViewer,
    vehicles,
    onSuccess,
  });

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Yeni Ekip Üyesi"
      description="Organizasyona yeni üye ekleyin, başlangıç rolünü ve yetkilerini tanımlayın."
      onSubmit={handleSubmit}
      submitLabel="Üyeyi Oluştur"
      isSubmitting={isSubmitting}
      isDirty={isDirty}
    >
      <CreateMemberFormSections
        form={form}
        fieldErrors={fieldErrors}
        roleOptions={roleOptions}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onRoleChange={handleRoleChange}
        onTogglePerm={handleTogglePerm}
      />

      {form.role === ROLES.DRIVER && (
        <CreateMemberVehicleSection
          form={form}
          fieldErrors={fieldErrors}
          vehicles={assignableVehicles}
          isSubmitting={isSubmitting}
          onChange={handleChange}
        />
      )}
    </AppSheet>
  );
}
