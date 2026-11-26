import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import adminService from '@/services/adminService';
import { ROLES } from '@/components/v2/channelAccess';
import { INITIAL_PERMS } from '@/components/v2/CrewDataTable';
import {
  buildInitialForm,
  runPostCreateSteps,
  validateMemberForm,
} from '@/components/v2/create-member/createMemberHelpers';
import { getErrorStatus, notifyApiError } from '@/utils/apiError';

export function useCreateMemberController({
  open,
  onOpenChange,
  isSystemAdminViewer = false,
  vehicles = [],
  onSuccess,
}) {
  const [form, setForm] = useState(() => buildInitialForm());
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildInitialForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const next = buildInitialForm();
    setForm(next);
    setInitialSnapshot(next);
    setFieldErrors({});
  }, [open]);

  const roleOptions = useMemo(
    () =>
      isSystemAdminViewer
        ? [ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.SYSTEM_ADMIN]
        : [ROLES.DRIVER, ROLES.FLEET_MANAGER],
    [isSystemAdminViewer]
  );

  const assignableVehicles = useMemo(
    () => (Array.isArray(vehicles) ? vehicles : []).filter((v) => v && v.arsivlendi_mi !== true),
    [vehicles]
  );

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialSnapshot),
    [form, initialSnapshot]
  );

  const clearFieldError = useCallback((field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (submittingRef.current && !nextOpen) return;
      onOpenChange?.(nextOpen);
    },
    [onOpenChange]
  );

  const handleChange = useCallback(
    (field, value) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      clearFieldError(field);
    },
    [clearFieldError]
  );

  const handleRoleChange = useCallback(
    (nextRole) => {
      if (!nextRole) return;
      if (!isSystemAdminViewer && nextRole === ROLES.SYSTEM_ADMIN) return;

      setForm((prev) => ({
        ...prev,
        role: nextRole,
        yetkiler: { ...(INITIAL_PERMS[nextRole] || INITIAL_PERMS[ROLES.DRIVER]) },
        arac_id: nextRole === ROLES.DRIVER ? prev.arac_id : '',
      }));
      clearFieldError('role');
      if (nextRole !== ROLES.DRIVER) {
        clearFieldError('atanma_tarihi');
      }
    },
    [clearFieldError, isSystemAdminViewer]
  );

  const handleTogglePerm = useCallback((key, checked) => {
    setForm((prev) => ({
      ...prev,
      yetkiler: { ...prev.yetkiler, [key]: Boolean(checked) },
    }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current || isSubmitting) return;

    const { errors, trimmedName, trimmedEmail, trimmedPhone } = validateMemberForm(
      form,
      isSystemAdminViewer
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setFieldErrors({});

    let newUserId = null;
    try {
      const created = await adminService.createDriver({
        ad_soyad: trimmedName,
        email: trimmedEmail,
        sifre: form.sifre,
        telefon: trimmedPhone,
      });
      newUserId = created?.user?.user_id ?? null;
    } catch (err) {
      if (getErrorStatus(err) === 409) {
        setFieldErrors((prev) => ({
          ...prev,
          email: err?.response?.data?.message || 'Bu e-posta adresi zaten kayıtlı.',
        }));
      } else {
        notifyApiError(err, 'Üye oluşturulamadı.');
      }
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const adimHatalari = await runPostCreateSteps(newUserId, form);
      if (adimHatalari.length === 0) {
        toast.success('Yeni ekip üyesi oluşturuldu ve yetkilendirildi.');
      } else {
        adimHatalari.forEach((mesaj, idx) =>
          toast.error(mesaj, { id: `crew-create-step-${idx}`, duration: 8000 })
        );
      }
      onOpenChange?.(false);
    } finally {
      await onSuccess?.();
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}
