import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useVehicleStore from '@/store/useVehicleStore';
import useAuthStore from '@/store/useAuthStore';
import adminService from '@/services/adminService';
import { notifyApiError, getErrorStatus } from '@/utils/apiError';
import { resolveRole } from './channelAccess';
import aracService from '@/services/aracService';
import { getTodayIso } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Car,
  ChevronDown,
  ChevronUp,
  Check,
  Mail,
  Phone,
  Link2,
  KeyRound,
  Search,
  Calendar,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';

const SELF_LOCK_MESSAGE = 'Kendi rol ve yetkinizi değiştiremezsiniz.';
const ADMIN_LOCK_MESSAGE = 'Sistem Admini kayıtları Filo Yöneticisi tarafından değiştirilemez.';

const ROLE_META = {
  SYSTEM_ADMIN: {
    label: 'SYSTEM_ADMIN',
    trLabel: 'Sistem Admini',
    aciklama: 'Tam Sistem & Mimari Yetki',
    badgeClass: 'border-destructive bg-truss-bg text-destructive',
    dotClass: 'bg-destructive',
  },
  FLEET_MANAGER: {
    label: 'FLEET_MANAGER',
    trLabel: 'Filo Yöneticisi',
    aciklama: 'Filo Operasyon & Maliyet Komutası',
    badgeClass: 'border-truss-purple bg-truss-bg text-truss-purple',
    dotClass: 'bg-truss-purple',
  },
  DRIVER: {
    label: 'DRIVER',
    trLabel: 'Şoför / Saha Operatörü',
    aciklama: 'Saha & Zimmetli Araç Operatörü',
    badgeClass: 'border-truss-border bg-truss-bg text-truss-muted',
    dotClass: 'bg-truss-muted',
  },
};

const PERMISSION_DEFINITIONS = [
  { key: 'yakit', label: 'Yakıt Girişi', desc: 'Yakıt ikmali ve litre kaydı' },
  { key: 'bakim', label: 'Servis Onayı', desc: 'Bakım ve onarım emri kaydı' },
  { key: 'finans', label: 'Finansal Rapor', desc: 'Bütçe ve maliyet telemetrisi' },
  { key: 'zimmet', label: 'Filo Atama', desc: 'Operatör ve araç zimmetleme' },
  { key: 'envanter', label: 'Parça & Envanter', desc: 'Yedek parça ömür takibi' },
  { key: 'ekip', label: 'Ekip Yönetimi', desc: 'Rol ve davet yetkilendirmesi' },
];

const INITIAL_PERMS = {
  SYSTEM_ADMIN: {
    yakit: true,
    bakim: true,
    finans: true,
    zimmet: true,
    envanter: true,
    ekip: true,
  },
  FLEET_MANAGER: {
    yakit: true,
    bakim: true,
    finans: true,
    zimmet: true,
    envanter: true,
    ekip: false,
  },
  DRIVER: {
    yakit: true,
    bakim: false,
    finans: false,
    zimmet: false,
    envanter: false,
    ekip: false,
  },
};

const FALLBACK_CREW = [
  {
    user_id: 'crew-1',
    ad_soyad: 'Yakup Saymez',
    email: 'architect@truss.os',
    telefon: '0532 100 10 01',
    role: 'SYSTEM_ADMIN',
    kayit_tarihi: '2026-01-10',
    zimmetli_araclar: [
      {
        atama_id: 'atm-1',
        arac_id: 'v-1',
        plaka: '34 TRS 001',
        marka: 'Mercedes-Benz',
        model: 'Actros 1848',
        atanma_tarihi: '2026-01-15',
      },
    ],
  },
  {
    user_id: 'crew-2',
    ad_soyad: 'Kerem Aksoy',
    email: 'operasyon@truss.os',
    telefon: '0533 210 20 02',
    role: 'FLEET_MANAGER',
    kayit_tarihi: '2026-02-14',
    zimmetli_araclar: [
      {
        atama_id: 'atm-2',
        arac_id: 'v-2',
        plaka: '06 FL 404',
        marka: 'Ford',
        model: 'Transit 350L',
        atanma_tarihi: '2026-03-01',
      },
    ],
  },
  {
    user_id: 'crew-3',
    ad_soyad: 'Murat Demir',
    email: 'sofor.murat@truss.os',
    telefon: '0544 320 30 03',
    role: 'DRIVER',
    kayit_tarihi: '2026-04-20',
    zimmetli_araclar: [
      {
        atama_id: 'atm-3',
        arac_id: 'v-3',
        plaka: '35 EGE 88',
        marka: 'Renault',
        model: 'Clio 1.5 Blue dCi',
        atanma_tarihi: '2026-05-05',
      },
    ],
  },
];

const INITIAL_DRIVER_FORM = {
  ad_soyad: '',
  email: '',
  sifre: '',
  telefon: '',
  role: 'DRIVER',
  arac_id: '',
  baslangic_tarihi: getTodayIso(),
  yetkiler: { ...INITIAL_PERMS.DRIVER },
};

// Yetkiler yalnızca sunucudan gelen üye verisinden türetilir; yoksa rol şablonu gösterilir (salt okunur varsayılan)
function resolveMemberPerms(member) {
  const roleKey = member?.role || 'DRIVER';
  const base = INITIAL_PERMS[roleKey] || INITIAL_PERMS.DRIVER;
  const serverPerms =
    member?.yetkiler && typeof member.yetkiler === 'object' ? member.yetkiler : {};
  return { ...base, ...serverPerms };
}

// Backend'de kalıcı kullanıcılar sayısal user_id taşır; FALLBACK_CREW ('crew-1' vb.) simülasyondur
const isPersistedUserId = (uid) => /^\d+$/.test(String(uid));

export default function CrewCommand() {
  const storeVehicles = useVehicleStore((s) => s.araclar);
  const fetchStoreVehicles = useVehicleStore((s) => s.fetchAraclar);

  // Oturumdaki kullanıcı: kendi satırı ve (FLEET_MANAGER ise) SYSTEM_ADMIN satırları salt okunurdur.
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.user_id ?? null;
  const isFleetManagerViewer = resolveRole(currentUser) === 'FLEET_MANAGER';

  const getMemberAccess = (member) => {
    const memberId = member?.user_id || member?.id || member?.email;
    const memberRole = member?.role || 'DRIVER';
    const isSelf = currentUserId !== null && String(memberId) === String(currentUserId);
    const isAdminLocked = isFleetManagerViewer && memberRole === 'SYSTEM_ADMIN';
    return {
      isSelf,
      isAdminLocked,
      readOnly: isSelf || isAdminLocked,
      lockMessage: isSelf ? SELF_LOCK_MESSAGE : isAdminLocked ? ADMIN_LOCK_MESSAGE : undefined,
    };
  };

  const [users, setUsers] = useState([]);
  const [localVehicles, setLocalVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtreleme & Arama
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Progressive Disclosure Akordeonları (Modalsız Satır İçi Akışlar)
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [isQuickAssignOpen, setIsQuickAssignOpen] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState(null);

  // Kişi Davet / Operatör Ekleme Formu (Tam Veri Seti + Rol & Yetki Başlangıç Parametreleri)
  const [driverForm, setDriverForm] = useState(INITIAL_DRIVER_FORM);
  const [isCreating, setIsCreating] = useState(false);

  // Üst Hızlı Zimmetleme Akordeon Formu (sofor_user_id, arac_id, atanma_tarihi)
  const [assignForm, setAssignForm] = useState({
    sofor_user_id: '',
    arac_id: '',
    atanma_tarihi: getTodayIso(),
  });

  // Satır İçi (Operatör Özelinde) Zimmetleme State
  const [rowAssignState, setRowAssignState] = useState({
    arac_id: '',
    atanma_tarihi: getTodayIso(),
  });
  const [isAssigning, setIsAssigning] = useState(false);

  const vehicles = useMemo(
    () => (storeVehicles && storeVehicles.length > 0 ? storeVehicles : localVehicles),
    [storeVehicles, localVehicles]
  );

  const ekibiVeAraclariYukle = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [userRes, aracRes] = await Promise.all([
        adminService.getUsers().catch(() => []),
        aracService.getAraclar().catch(() => []),
      ]);

      const uList = Array.isArray(userRes) && userRes.length > 0 ? userRes : FALLBACK_CREW;
      const aList = Array.isArray(aracRes) ? aracRes : aracRes?.araclar || [];

      setUsers(uList);
      setLocalVehicles(aList);
    } catch (error) {
      notifyApiError(error, 'Ekip verileri yüklenemedi.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    ekibiVeAraclariYukle();
  }, [ekibiVeAraclariYukle]);

  // Yeni Operatör Formunda Rol Değiştiğinde Varsayılan Yetki Anahtarlarını Senkronize Et
  const handleFormRoleChange = (nextRole) => {
    setDriverForm((prev) => ({
      ...prev,
      role: nextRole,
      yetkiler: { ...(INITIAL_PERMS[nextRole] || INITIAL_PERMS.DRIVER) },
    }));
  };

  // Yeni Operatör Formu İçindeki Başlangıç Yetki Toggle'ı
  const handleToggleFormPerm = (permKey) => {
    setDriverForm((prev) => ({
      ...prev,
      yetkiler: {
        ...prev.yetkiler,
        [permKey]: !prev.yetkiler[permKey],
      },
    }));
  };

  // Mevcut Operatörün Canlı Yetki Anahtarını Değiştir (Backend: PUT /admin/users/:id/permissions)
  const handleToggleUserPerm = async (uid, permKey, userName, permLabel) => {
    if (!isPersistedUserId(uid)) {
      toast.error('Simülasyon kaydının yetkisi değiştirilemez. Gerçek bir operatör seçin.');
      return;
    }
    const member = users.find((u) => String(u.user_id || u.id || u.email) === String(uid));
    if (!member) return;

    const access = getMemberAccess(member);
    if (access.readOnly) {
      toast.error(access.lockMessage);
      return;
    }

    const current = resolveMemberPerms(member);
    const nextVal = !current[permKey];
    const nextPerms = { ...current, [permKey]: nextVal };

    // Optimistic güncelleme yok: arayüz yalnızca sunucu onayından sonra yenilenir, bu yüzden
    // hata durumunda geri alınacak bir local state mutasyonu da kalmaz.
    try {
      await adminService.updateUserPermissions(uid, nextPerms);
      toast.success(
        `${userName} • ${permLabel} yetkisi ${nextVal ? 'aktif edildi' : 'devre dışı bırakıldı'}.`
      );
      await ekibiVeAraclariYukle({ silent: true });
    } catch (error) {
      notifyApiError(error, 'Yetki güncellenemedi.');
      // Kayıt silinmiş (404) veya eşzamanlı değişmiş (409) olabilir: listeyi sunucuyla eşitle.
      if ([404, 409].includes(getErrorStatus(error))) {
        await ekibiVeAraclariYukle({ silent: true });
      }
    }
  };

  // Mevcut Operatörün Rol Şablonunu Satır İçinden Değiştir (Backend: PUT /admin/users/:id/role)
  const handleChangeMemberRole = async (uid, nextRole, userName) => {
    if (!isPersistedUserId(uid)) {
      toast.error('Simülasyon kaydının rolü değiştirilemez. Gerçek bir operatör seçin.');
      return;
    }
    const member = users.find((u) => String(u.user_id || u.id || u.email) === String(uid));
    if (!member) return;

    const access = getMemberAccess(member);
    if (access.readOnly) {
      toast.error(access.lockMessage);
      return;
    }
    if (isFleetManagerViewer && nextRole === 'SYSTEM_ADMIN') {
      toast.error('Filo Yöneticisi, SYSTEM_ADMIN rolü atayamaz.');
      return;
    }

    try {
      await adminService.updateUserRole(uid, nextRole);
      const meta = ROLE_META[nextRole] || ROLE_META.DRIVER;
      toast.success(`${userName} rolü ${meta.label} (${meta.trLabel}) olarak güncellendi.`);
      await ekibiVeAraclariYukle({ silent: true });
    } catch (error) {
      notifyApiError(error, 'Rol güncellenemedi.');
      if ([404, 409].includes(getErrorStatus(error))) {
        await ekibiVeAraclariYukle({ silent: true });
      }
    }
  };

  // Modalsız Satır İçi Operatör / Şoför Kaydı (Opsiyonel İlk Araç Zimmeti Dahil)
  const handleCreateDriverInline = async (e) => {
    e.preventDefault();
    if (!driverForm.ad_soyad || !driverForm.email || !driverForm.sifre) {
      toast.error('Lütfen Ad Soyad, E-Posta ve Geçici Şifre alanlarını doldurun.');
      return;
    }

    if (String(driverForm.sifre).length < 6) {
      toast.error('Geçici şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (isFleetManagerViewer && driverForm.role === 'SYSTEM_ADMIN') {
      toast.error('Filo Yöneticisi, SYSTEM_ADMIN rolü atayamaz.');
      return;
    }

    setIsCreating(true);

    // ADIM 1: Kullanıcı oluşturma. Burada hata varsa hiçbir kayıt oluşmamıştır.
    let newUserId = null;
    try {
      const createdRes = await adminService.createDriver({
        ad_soyad: driverForm.ad_soyad.trim(),
        email: driverForm.email.trim(),
        sifre: driverForm.sifre,
        telefon: driverForm.telefon ? driverForm.telefon.trim() : '',
      });
      newUserId = createdRes?.user?.user_id ?? null;
    } catch (error) {
      notifyApiError(error, 'Operatör eklenemedi.');
      setIsCreating(false);
      return;
    }

    // Bundan sonrası: kullanıcı ARTIK VAR. Hangi adımın düştüğünü net söyle, listeyi yine de yenile.
    const adimHatalari = [];
    const detay = (error) => {
      const msg = error?.response?.data?.message;
      return getErrorStatus(error) === 403 || !msg ? '' : ` (${msg})`;
    };

    try {
      if (!newUserId) {
        adimHatalari.push(
          'Kullanıcı oluşturuldu ancak kimliği alınamadığından zimmet, rol ve yetkiler atanamadı — satırdan tekrar deneyebilirsiniz.'
        );
      } else {
        // ADIM 2: Opsiyonel ilk zimmet (kullanıcı henüz DRIVER iken yapılmalı)
        if (driverForm.arac_id) {
          try {
            await adminService.assignVehicle({
              sofor_user_id: Number(newUserId),
              arac_id: Number(driverForm.arac_id),
            });
          } catch (error) {
            adimHatalari.push(
              `Kullanıcı oluşturuldu ancak araç zimmetlenemedi${detay(error)} — satırdan tekrar deneyebilirsiniz.`
            );
          }
        }

        // ADIM 3: Rol (DRIVER dışındaysa)
        let rolBasarili = true;
        if (driverForm.role && driverForm.role !== 'DRIVER') {
          try {
            await adminService.updateUserRole(newUserId, driverForm.role);
          } catch (error) {
            rolBasarili = false;
            adimHatalari.push(
              `Kullanıcı oluşturuldu ancak rol atanamadı (DRIVER olarak kaldı)${detay(error)}; yetkiler de atanmadı — satırdan tekrar deneyebilirsiniz.`
            );
          }
        }

        // ADIM 4: Yetkiler (rol adımı düştüyse atlanır: yetkiler role göre anlamlıdır)
        if (rolBasarili) {
          try {
            await adminService.updateUserPermissions(newUserId, { ...driverForm.yetkiler });
          } catch (error) {
            adimHatalari.push(
              `Kullanıcı oluşturuldu ancak yetkiler atanamadı${detay(error)} — satırdan tekrar deneyebilirsiniz.`
            );
          }
        }
      }

      if (adimHatalari.length === 0) {
        toast.success('Yeni operatör filoya ve yetki matrisine eklendi.');
      } else {
        adimHatalari.forEach((mesaj, i) =>
          toast.error(mesaj, { id: `crew-create-step-${i}`, duration: 8000 })
        );
      }

      setDriverForm(INITIAL_DRIVER_FORM);
      setIsAddStreamOpen(false);
    } finally {
      // Kullanıcı oluştuysa (kısmi başarı dahil) liste mutlaka yenilenir; kayıt kaybolmaz.
      await Promise.all([ekibiVeAraclariYukle(), fetchStoreVehicles?.()]);
      setIsCreating(false);
    }
  };

  // Zimmet hataları: 409 (eşzamanlı çakışma) ve 422 (kullanıcı DRIVER değil) backend mesajıyla gösterilir.
  const handleAssignError = async (error) => {
    notifyApiError(error, 'Araç zimmetlenemedi.', {
      409: 'Araç eşzamanlı olarak başka bir işlemle zimmetlendi. Liste yenilendi, lütfen tekrar deneyin.',
      422: 'Zimmet yalnızca DRIVER rolündeki kullanıcılara yapılabilir.',
    });
    if (getErrorStatus(error) === 409) {
      await Promise.all([ekibiVeAraclariYukle({ silent: true }), fetchStoreVehicles?.()]);
    }
  };

  // Üst Hızlı Zimmet Akordeonundan Araç Zimmetleme
  const handleQuickAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.sofor_user_id || !assignForm.arac_id) {
      toast.error('Lütfen operatör ve zimmetlenecek aracı seçin.');
      return;
    }

    const numericUserId = Number(assignForm.sofor_user_id);
    const numericAracId = Number(assignForm.arac_id);

    if (!Number.isFinite(numericUserId) || !Number.isFinite(numericAracId)) {
      toast.success('Simülasyon operatörüne araç zimmetlendi.');
      setIsQuickAssignOpen(false);
      return;
    }

    setIsAssigning(true);
    try {
      await adminService.assignVehicle({
        sofor_user_id: numericUserId,
        arac_id: numericAracId,
      });
      toast.success('Araç personele başarıyla zimmetlendi.');
      setAssignForm({
        sofor_user_id: '',
        arac_id: '',
        atanma_tarihi: getTodayIso(),
      });
      setIsQuickAssignOpen(false);
      await Promise.all([ekibiVeAraclariYukle(), fetchStoreVehicles?.()]);
    } catch (error) {
      await handleAssignError(error);
    } finally {
      setIsAssigning(false);
    }
  };

  // Satır İçi (Progressive Disclosure) Araç Zimmetleme
  const handleRowAssignVehicle = async (member) => {
    const uid = member.user_id || member.id;
    const aracId = rowAssignState.arac_id || vehicles[0]?.arac_id;

    if (!aracId) {
      toast.error('Zimmetlenecek aracı seçin.');
      return;
    }

    if (typeof uid !== 'number') {
      const seciliAracObj = vehicles.find((v) => String(v.arac_id) === String(aracId));
      if (seciliAracObj) {
        setUsers((prev) =>
          prev.map((u) => {
            if ((u.user_id || u.id) !== uid) return u;
            const mevcutZimmetler = Array.isArray(u.zimmetli_araclar) ? u.zimmetli_araclar : [];
            return {
              ...u,
              zimmetli_araclar: [
                ...mevcutZimmetler,
                {
                  atama_id: `sim-${Date.now()}`,
                  arac_id: seciliAracObj.arac_id,
                  plaka: seciliAracObj.plaka,
                  marka: seciliAracObj.marka,
                  model: seciliAracObj.model,
                  atanma_tarihi: rowAssignState.atanma_tarihi,
                },
              ],
            };
          })
        );
      }
      toast.success(`${member.ad_soyad} operatörüne araç zimmetlendi.`);
      return;
    }

    setIsAssigning(true);
    try {
      await adminService.assignVehicle({
        sofor_user_id: Number(uid),
        arac_id: Number(aracId),
      });
      toast.success(`Araç ${member.ad_soyad} operatörüne başarıyla zimmetlendi.`);
      await Promise.all([ekibiVeAraclariYukle(), fetchStoreVehicles?.()]);
    } catch (error) {
      await handleAssignError(error);
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleExpandMember = (member) => {
    const uid = member.user_id || member.id || member.email;
    if (expandedUserId === uid) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(uid);
    setRowAssignState({
      arac_id: vehicles[0]?.arac_id ? String(vehicles[0].arac_id) : '',
      atanma_tarihi: getTodayIso(),
    });
  };

  // KPI ve Filtre Hesaplamaları (Orijinal EkipYonetimi metriklerinin tamamı + Rol kırılımları)
  const driversOnly = useMemo(
    () => users.filter((u) => (u.role || 'DRIVER') === 'DRIVER'),
    [users]
  );

  const assignedCount = useMemo(
    () =>
      users.reduce(
        (sum, u) => sum + (Array.isArray(u.zimmetli_araclar) ? u.zimmetli_araclar.length : 0),
        0
      ),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      const roleKey = u.role || 'DRIVER';
      if (roleFilter !== 'ALL' && roleKey !== roleFilter) return false;
      if (!q) return true;
      const zimmetPlakaMatch =
        Array.isArray(u.zimmetli_araclar) &&
        u.zimmetli_araclar.some(
          (z) =>
            z.plaka?.toLowerCase().includes(q) ||
            z.marka?.toLowerCase().includes(q) ||
            z.model?.toLowerCase().includes(q)
        );
      return (
        u.ad_soyad?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.telefon?.toLowerCase().includes(q) ||
        roleKey.toLowerCase().includes(q) ||
        zimmetPlakaMatch
      );
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. ÜST KOMUTA KÖPRÜSÜ, ARAMA FİLTRESİ & MODALSIZ AKORDEON FORMLAR      */}
      {/* ===================================================================== */}
      <div className="rounded-2xl border border-truss-border bg-truss-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-truss-purple bg-truss-bg text-truss-purple">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-truss-text">
                CREW COMMAND • EKİP, ROL & ZİMMET KOMUTASI
              </h2>
              <p className="text-xs text-truss-muted">
                SYSTEM_ADMIN, FLEET_MANAGER ve DRIVER erişim yetkilerini ve araç zimmetlerini modalsız yönetin
              </p>
            </div>
          </div>

          {/* Arama Çubuğu ve Modalsız Akordeon Tetikleyicileri */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-truss-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ad, e-posta, telefon, plaka veya rol ara..."
                className="h-9 w-full rounded-xl border border-truss-border bg-truss-bg pl-8 pr-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
              />
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsQuickAssignOpen((prev) => !prev);
                setIsAddStreamOpen(false);
              }}
              className={`h-9 gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                isQuickAssignOpen
                  ? 'border-truss-purple bg-truss-bg text-truss-purple'
                  : 'border-truss-border bg-truss-bg text-truss-text hover:border-truss-purple'
              }`}
            >
              <Link2 className="size-3.5 text-truss-purple" />
              {isQuickAssignOpen ? 'Zimmet Panelini Kapat' : 'Araç Zimmetle'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsAddStreamOpen((prev) => !prev);
                setIsQuickAssignOpen(false);
              }}
              className="h-9 gap-1.5 rounded-xl bg-truss-purple px-3.5 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
            >
              <UserPlus className="size-3.5" />
              {isAddStreamOpen ? 'Davet Akordeonunu Kapat' : 'Yeni Şoför / Operatör Ekle'}
            </Button>
          </div>
        </div>

        {/* AKORDEON A: MODALSIZ KİŞİ DAVET / YENİ ŞOFÖR EKLEME KUŞAĞI (EKSİKSİZ VERİ SETİ) */}
        {isAddStreamOpen && (
          <form
            onSubmit={handleCreateDriverInline}
            className="mt-4 space-y-3 border-t border-truss-border pt-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-truss-purple">
                <UserPlus className="size-3.5" />
                YENİ EKİP ÜYESİ / ŞOFÖR DAVET & YETKİLENDİRME AKORDEONU
              </span>
              <Badge
                variant="outline"
                className={`font-mono text-[10px] font-bold ${
                  (ROLE_META[driverForm.role] || ROLE_META.DRIVER).badgeClass
                }`}
              >
                HEDEF ROL: {(ROLE_META[driverForm.role] || ROLE_META.DRIVER).label}
              </Badge>
            </div>

            {/* 1. Satır: Orijinal Form Parametreleri (ad_soyad, email, sifre, telefon) */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  required
                  value={driverForm.ad_soyad}
                  onChange={(e) => setDriverForm((p) => ({ ...p, ad_soyad: e.target.value }))}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  E-Posta Adresi *
                </label>
                <input
                  type="email"
                  required
                  value={driverForm.email}
                  onChange={(e) => setDriverForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="sofor@sirket.com"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Geçici Şifre (En az 6 karakter) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={driverForm.sifre}
                  onChange={(e) => setDriverForm((p) => ({ ...p, sifre: e.target.value }))}
                  placeholder="En az 6 karakter"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Telefon (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={driverForm.telefon}
                  onChange={(e) => setDriverForm((p) => ({ ...p, telefon: e.target.value }))}
                  placeholder="05XX XXX XX XX"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Satır: Rol Seçimi, İlk Araç Zimmeti (Opsiyonel) ve TrussDatePicker Görev Başlangıç Tarihi */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Kullanıcı Rolü
                </label>
                <select
                  value={driverForm.role}
                  onChange={(e) => handleFormRoleChange(e.target.value)}
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 font-mono text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  <option value="DRIVER" className="bg-truss-surface text-truss-text">
                    DRIVER — Şoför / Saha Operatörü
                  </option>
                  <option value="FLEET_MANAGER" className="bg-truss-surface text-truss-text">
                    FLEET_MANAGER — Filo Yöneticisi
                  </option>
                  {!isFleetManagerViewer && (
                    <option value="SYSTEM_ADMIN" className="bg-truss-surface text-truss-text">
                      SYSTEM_ADMIN — Sistem Admini
                    </option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Başlangıç Araç Zimmeti (Opsiyonel)
                </label>
                <select
                  value={driverForm.arac_id}
                  onChange={(e) => setDriverForm((p) => ({ ...p, arac_id: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  <option value="" className="bg-truss-surface text-truss-muted">
                    -- Zimmetlenecek Araç Seçin (Opsiyonel) --
                  </option>
                  {vehicles.map((v) => (
                    <option
                      key={v.arac_id}
                      value={v.arac_id}
                      className="bg-truss-surface text-truss-text"
                    >
                      {v.plaka} — {v.marka} {v.model} ({v.yil})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Görev & Yetki Başlangıç Tarihi
                </label>
                <TrussDatePicker
                  name="baslangic_tarihi"
                  value={driverForm.baslangic_tarihi}
                  onChange={(e) =>
                    setDriverForm((p) => ({ ...p, baslangic_tarihi: e.target.value }))
                  }
                  placeholder="Görev başlangıç tarihi seçin"
                />
              </div>
            </div>

            {/* 3. Satır: Başlangıç İzin / Yetki Toggle Matrisi ve Kayıt Onayı */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-truss-border bg-truss-bg p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-truss-muted">
                  <SlidersHorizontal className="size-3.5 text-truss-purple" />
                  Başlangıç Yetki Anahtarları:
                </span>
                {PERMISSION_DEFINITIONS.map((perm) => {
                  const active = Boolean(driverForm.yetkiler[perm.key]);
                  return (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() => handleToggleFormPerm(perm.key)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        active
                          ? 'border-truss-purple bg-truss-surface text-truss-purple'
                          : 'border-truss-border bg-truss-surface text-truss-muted'
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          active ? 'bg-truss-purple' : 'bg-truss-muted'
                        }`}
                      />
                      {perm.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddStreamOpen(false)}
                  className="h-9 rounded-xl border-truss-border bg-truss-surface px-3 text-xs text-truss-muted hover:border-truss-purple hover:text-truss-text"
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="h-9 gap-1.5 rounded-xl bg-truss-purple px-4 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                >
                  <Check className="size-3.5" />
                  {isCreating ? 'Kaydediliyor…' : 'Şoförü / Operatörü Kaydet'}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* AKORDEON B: MODALSIZ PERSONELE ARAÇ ZİMMETLEME KUŞAĞI (sofor_user_id + arac_id + TrussDatePicker) */}
        {isQuickAssignOpen && (
          <form
            onSubmit={handleQuickAssignSubmit}
            className="mt-4 space-y-3 border-t border-truss-border pt-4"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-truss-purple">
                <Car className="size-3.5" />
                PERSONELE ARAÇ ZİMMETLEME AKORDEONU (MODALSIZ HIZLI ATAMA)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Şoför / Ekip Üyesi Seçin *
                </label>
                <select
                  required
                  value={assignForm.sofor_user_id}
                  onChange={(e) =>
                    setAssignForm((p) => ({ ...p, sofor_user_id: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  <option value="" className="bg-truss-surface text-truss-muted">
                    -- Kullanıcı Seçin --
                  </option>
                  {users.map((u) => (
                    <option
                      key={u.user_id || u.id}
                      value={u.user_id || u.id}
                      className="bg-truss-surface text-truss-text"
                    >
                      {u.ad_soyad} ({u.role || 'DRIVER'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Zimmetlenecek Araç *
                </label>
                <select
                  required
                  value={assignForm.arac_id}
                  onChange={(e) => setAssignForm((p) => ({ ...p, arac_id: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3 text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                >
                  <option value="" className="bg-truss-surface text-truss-muted">
                    -- Araç Seçin --
                  </option>
                  {vehicles.map((v) => (
                    <option
                      key={v.arac_id}
                      value={v.arac_id}
                      className="bg-truss-surface text-truss-text"
                    >
                      {v.plaka} — {v.marka} {v.model} ({v.yil})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-truss-muted">
                  Zimmet Başlangıç Tarihi
                </label>
                <TrussDatePicker
                  name="atanma_tarihi"
                  value={assignForm.atanma_tarihi}
                  onChange={(e) =>
                    setAssignForm((p) => ({ ...p, atanma_tarihi: e.target.value }))
                  }
                  placeholder="Zimmet tarihi seçin"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  disabled={isAssigning}
                  className="h-10 w-full gap-1.5 rounded-xl bg-truss-purple text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                >
                  <Link2 className="size-3.5" />
                  {isAssigning ? 'Atanıyor…' : 'Zimmeti Tamamla'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. KOMPAKT KPI & ROL FİLTRE ŞERİDİ (ORİJİNAL METRİKLER + ROL ROZETLERİ) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setRoleFilter('ALL')}
          className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
            roleFilter === 'ALL'
              ? 'border-truss-purple bg-truss-surface'
              : 'border-truss-border bg-truss-surface hover:border-truss-purple'
          }`}
        >
          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-truss-muted">
              <Users className="size-4 text-truss-purple" />
              Toplam Ekip Üyesi
            </span>
            <p className="mt-1 text-[11px] text-truss-muted">
              Aktif Şoför: <strong className="text-truss-text">{driversOnly.length}</strong> • Zimmetli Araç:{' '}
              <strong className="text-truss-purple">{assignedCount}</strong>
            </p>
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-truss-text">
            {users.length}
          </span>
        </button>

        {Object.entries(ROLE_META).map(([roleKey, meta]) => {
          const count = users.filter((u) => (u.role || 'DRIVER') === roleKey).length;
          const isSelected = roleFilter === roleKey;
          return (
            <button
              key={roleKey}
              type="button"
              onClick={() => setRoleFilter((prev) => (prev === roleKey ? 'ALL' : roleKey))}
              className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                isSelected
                  ? 'border-truss-purple bg-truss-surface'
                  : 'border-truss-border bg-truss-surface hover:border-truss-purple'
              }`}
            >
              <div>
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] font-bold ${meta.badgeClass}`}
                >
                  <span className={`mr-1 size-1.5 rounded-full ${meta.dotClass}`} />
                  {meta.label}
                </Badge>
                <p className="mt-1.5 text-xs text-truss-muted">{meta.aciklama}</p>
              </div>
              <span className="font-mono text-2xl font-bold tabular-nums text-truss-text">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* 3. LINEAR TARZI AKIŞKAN EKİP LİSTESİ & PROGRESSIVE DISCLOSURE          */}
      {/* ===================================================================== */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-truss-surface" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-truss-border bg-truss-surface p-8 text-center text-xs text-truss-muted">
          Arama veya rol filtresine uygun ekip üyesi bulunamadı.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredUsers.map((member) => {
            const uid = member.user_id || member.id || member.email;
            const roleKey = member.role || 'DRIVER';
            const roleMeta = ROLE_META[roleKey] || ROLE_META.DRIVER;
            const perms = resolveMemberPerms(member);
            const access = getMemberAccess(member);
            const isExpanded = expandedUserId === uid;
            const zimmetler = Array.isArray(member.zimmetli_araclar)
              ? member.zimmetli_araclar
              : [];

            return (
              <div
                key={uid}
                className={`rounded-xl border bg-truss-surface transition-all ${
                  isExpanded
                    ? 'border-truss-purple'
                    : 'border-truss-border hover:border-truss-purple'
                }`}
              >
                {/* KATMAN 1: Linear Tarzı Akışkan Operatör Satırı, İletişim, Zimmet Özeti & Yetki Toggle'ları */}
                <div
                  onClick={() => toggleExpandMember(member)}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                >
                  {/* Sol: Kimlik, Shadcn Rol Rozeti, E-posta & Telefon, Zimmetli Araç Rozetleri */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-truss-border bg-truss-bg font-mono text-xs font-bold text-truss-purple">
                      {(member.ad_soyad || 'OP').slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-truss-text">
                          {member.ad_soyad}
                        </span>
                        {access.readOnly && (
                          <span
                            title={access.lockMessage}
                            className="inline-flex items-center text-truss-muted"
                          >
                            <Lock className="size-3" aria-label={access.lockMessage} />
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] font-bold ${roleMeta.badgeClass}`}
                        >
                          <span className={`mr-1 size-1.5 rounded-full ${roleMeta.dotClass}`} />
                          {roleMeta.label}
                        </Badge>
                        <span className="text-[11px] text-truss-muted">({roleMeta.trLabel})</span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-truss-muted">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3 text-truss-purple" />
                          {member.email}
                        </span>
                        {member.telefon && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Phone className="size-3 text-truss-purple" />
                            {member.telefon}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Zimmetli Araç Plaka Rozetleri (Katman 1 Özeti) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {zimmetler.length > 0 ? (
                        zimmetler.map((z, idx) => (
                          <Badge
                            key={z.atama_id || z.arac_id || idx}
                            variant="outline"
                            className="border-truss-border bg-truss-bg font-mono text-[11px] font-semibold text-truss-text"
                          >
                            <Car className="mr-1 size-3 text-truss-purple" />
                            {z.plaka || z}
                            {z.marka ? ` (${z.marka} ${z.model || ''})` : ''}
                          </Badge>
                        ))
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-truss-border bg-truss-bg text-[10px] text-truss-muted"
                        >
                          Zimmetli araç yok
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Sağ: Canlı İzin Yönetimi (Yetki Toggle'ları) & Progressive Disclosure Ok İkonu */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    title={access.lockMessage}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {PERMISSION_DEFINITIONS.slice(0, 4).map((p) => {
                      const active = Boolean(perms[p.key]);
                      return (
                        <button
                          key={p.key}
                          type="button"
                          disabled={access.readOnly}
                          title={access.lockMessage}
                          onClick={() =>
                            handleToggleUserPerm(uid, p.key, member.ad_soyad, p.label)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all disabled:cursor-not-allowed ${
                            active
                              ? 'border-truss-purple bg-truss-bg text-truss-purple'
                              : 'border-truss-border bg-truss-bg text-truss-muted hover:text-truss-text'
                          }`}
                        >
                          <span
                            className={`size-2 rounded-full ${
                              active ? 'bg-truss-purple' : 'bg-truss-muted'
                            }`}
                          />
                          {p.label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => toggleExpandMember(member)}
                      className="ml-1 flex size-7 items-center justify-center rounded-lg border border-truss-border bg-truss-bg text-truss-muted hover:border-truss-purple hover:text-truss-text"
                      title="Yetki Matrisi & Araç Zimmet Detayını Aç"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* KATMAN 2: Progressive Disclosure (Detaylı Yetki Matrisi, Rol Değişimi & Satır İçi Araç Zimmetleme) */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="space-y-3 border-t border-truss-border bg-truss-bg px-4 py-3.5 text-xs"
                  >
                    {/* Alt Satır 1: Tüm 6'lı İzin Toggle Matrisi & Rol Atama Seçicisi */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div
                        title={access.lockMessage}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="font-semibold text-truss-muted">
                          Tam Yetki Anahtarları:
                        </span>
                        {PERMISSION_DEFINITIONS.map((p) => {
                          const active = Boolean(perms[p.key]);
                          return (
                            <button
                              key={p.key}
                              type="button"
                              disabled={access.readOnly}
                              onClick={() =>
                                handleToggleUserPerm(uid, p.key, member.ad_soyad, p.label)
                              }
                              title={access.readOnly ? access.lockMessage : p.desc}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all disabled:cursor-not-allowed ${
                                active
                                  ? 'border-truss-purple bg-truss-surface text-truss-purple'
                                  : 'border-truss-border bg-truss-surface text-truss-muted hover:text-truss-text'
                              }`}
                            >
                              <span
                                className={`size-2 rounded-full ${
                                  active ? 'bg-truss-purple' : 'bg-truss-muted'
                                }`}
                              />
                              {p.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-truss-muted">Rol Seviyesi:</span>
                        {access.isAdminLocked ? (
                          <span
                            title={access.lockMessage}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-truss-border bg-truss-surface px-2.5 font-mono text-xs text-truss-muted"
                          >
                            <Lock className="size-3" />
                            SYSTEM_ADMIN (Sistem Admini)
                          </span>
                        ) : (
                          <select
                            value={roleKey}
                            disabled={access.readOnly}
                            title={access.lockMessage}
                            onChange={(e) =>
                              handleChangeMemberRole(uid, e.target.value, member.ad_soyad)
                            }
                            className="h-8 rounded-lg border border-truss-border bg-truss-surface px-2.5 font-mono text-xs text-truss-text focus:border-truss-purple focus:outline-none disabled:cursor-not-allowed"
                          >
                            {!isFleetManagerViewer && (
                              <option
                                value="SYSTEM_ADMIN"
                                className="bg-truss-surface text-truss-text"
                              >
                                SYSTEM_ADMIN (Sistem Admini)
                              </option>
                            )}
                            <option value="FLEET_MANAGER" className="bg-truss-surface text-truss-text">
                              FLEET_MANAGER (Filo Yöneticisi)
                            </option>
                            <option value="DRIVER" className="bg-truss-surface text-truss-text">
                              DRIVER (Şoför)
                            </option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Alt Satır 2: Zimmetli Araç Detayları & TrussDatePicker ile Satır İçi Araç Zimmetleme */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-truss-border pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 font-semibold text-truss-muted">
                          <Car className="size-3.5 text-truss-purple" />
                          Aktif Zimmetli Araçlar ({zimmetler.length}):
                        </span>
                        {zimmetler.length === 0 ? (
                          <span className="text-truss-muted">
                            Bu personele henüz araç zimmetlenmemiş.
                          </span>
                        ) : (
                          zimmetler.map((z, idx) => (
                            <Badge
                              key={z.atama_id || z.arac_id || idx}
                              variant="outline"
                              className="border-truss-purple bg-truss-surface font-mono text-xs text-truss-text"
                            >
                              {z.plaka || z}
                              {z.marka ? ` — ${z.marka} ${z.model || ''}` : ''}
                            </Badge>
                          ))
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <KeyRound className="size-3.5 text-truss-purple" />
                        <select
                          value={rowAssignState.arac_id}
                          onChange={(e) =>
                            setRowAssignState((p) => ({ ...p, arac_id: e.target.value }))
                          }
                          className="h-9 rounded-xl border border-truss-border bg-truss-surface px-3 font-mono text-xs text-truss-text focus:border-truss-purple focus:outline-none"
                        >
                          <option value="" className="bg-truss-surface text-truss-muted">
                            -- Araç Seçin --
                          </option>
                          {vehicles.map((a) => (
                            <option
                              key={a.arac_id}
                              value={a.arac_id}
                              className="bg-truss-surface text-truss-text"
                            >
                              {a.plaka} — {a.marka} {a.model} ({a.yil})
                            </option>
                          ))}
                        </select>

                        <div className="w-44">
                          <TrussDatePicker
                            name={`row_atanma_tarihi_${uid}`}
                            value={rowAssignState.atanma_tarihi}
                            onChange={(e) =>
                              setRowAssignState((p) => ({ ...p, atanma_tarihi: e.target.value }))
                            }
                            placeholder="Zimmet tarihi"
                            className="h-9 bg-truss-surface text-xs"
                          />
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={isAssigning}
                          onClick={() => handleRowAssignVehicle(member)}
                          className="h-9 gap-1.5 rounded-xl bg-truss-purple px-3.5 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
                        >
                          <Link2 className="size-3.5" />
                          {isAssigning ? 'Atanıyor…' : 'Araç Zimmetle'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
