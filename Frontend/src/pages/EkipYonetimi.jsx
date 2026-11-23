import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Car,
  ShieldCheck,
  Mail,
  Phone,
  Link2,
  X,
  CheckCircle2,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '@/services/adminService';
import aracService from '@/services/aracService';

const ROLE_BADGES = {
  SYSTEM_ADMIN: {
    label: 'Sistem Admini',
    className: 'bg-truss-purple/15 text-truss-purple border-truss-purple/30',
  },
  FLEET_MANAGER: {
    label: 'Filo Yöneticisi',
    className: 'bg-truss-surface text-truss-text border-truss-border',
  },
  DRIVER: {
    label: 'Şoför',
    className: 'bg-truss-bg text-truss-muted border-truss-border',
  },
};

const EkipYonetimi = () => {
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [driverForm, setDriverForm] = useState({
    ad_soyad: '',
    email: '',
    sifre: '',
    telefon: '',
  });

  const [assignForm, setAssignForm] = useState({
    sofor_user_id: '',
    arac_id: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [userList, aracRes] = await Promise.all([
        adminService.getUsers(),
        aracService.getAraclar(),
      ]);
      setUsers(Array.isArray(userList) ? userList : []);
      const aracList = Array.isArray(aracRes) ? aracRes : aracRes?.araclar || [];
      setVehicles(aracList);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Ekip verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDriver = async (e) => {
    e.preventDefault();
    if (!driverForm.ad_soyad || !driverForm.email || !driverForm.sifre) {
      toast.error('Lütfen zorunlu alanları doldurun.');
      return;
    }

    setSubmitting(true);
    try {
      await adminService.createDriver(driverForm);
      toast.success('Yeni şoför filoya eklendi.');
      setDriverForm({ ad_soyad: '', email: '', sifre: '', telefon: '' });
      setIsAddDriverOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Şoför eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignVehicle = async (e) => {
    e.preventDefault();
    if (!assignForm.sofor_user_id || !assignForm.arac_id) {
      toast.error('Lütfen şoför ve araç seçin.');
      return;
    }

    setSubmitting(true);
    try {
      await adminService.assignVehicle({
        sofor_user_id: Number(assignForm.sofor_user_id),
        arac_id: Number(assignForm.arac_id),
      });
      toast.success('Araç şoföre başarıyla zimmetlendi.');
      setAssignForm({ sofor_user_id: '', arac_id: '' });
      setIsAssignOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Araç zimmetlenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModalForDriver = (driverId = '') => {
    setAssignForm({
      sofor_user_id: driverId ? String(driverId) : '',
      arac_id: vehicles[0]?.arac_id ? String(vehicles[0].arac_id) : '',
    });
    setIsAssignOpen(true);
  };

  const driversOnly = users.filter((u) => u.role === 'DRIVER');
  const assignedCount = users.reduce(
    (sum, u) => sum + (Array.isArray(u.zimmetli_araclar) ? u.zimmetli_araclar.length : 0),
    0
  );

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.ad_soyad?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Kompakt Filtre ve Aksiyon Çubuğu (Toolbar) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ad, e-posta veya rol ara..."
            className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openAssignModalForDriver('')}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-xs hover:bg-accent transition-colors"
          >
            <Link2 className="size-3.5 text-primary" />
            Araç Zimmetle
          </button>

          <button
            type="button"
            onClick={() => setIsAddDriverOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="size-3.5" />
            Yeni Şoför Ekle
          </button>
        </div>
      </div>

      {/* Kompakt Tek Satırlık KPI Şeridi */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Users className="size-4 shrink-0 text-primary" />
            Toplam Ekip Üyesi
          </span>
          <span className="text-base font-bold tabular-nums text-foreground">{users.length}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
            Aktif Şoför Sayısı
          </span>
          <span className="text-base font-bold tabular-nums text-foreground">{driversOnly.length}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Car className="size-4 shrink-0 text-blue-400" />
            Zimmetli Araçlar
          </span>
          <span className="text-base font-bold tabular-nums text-foreground">{assignedCount}</span>
        </div>
      </div>

      {/* Ekip Tablosu */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">Ad Soyad</th>
                <th className="px-3 py-2.5 font-medium">İletişim</th>
                <th className="px-3 py-2.5 font-medium">Rol</th>
                <th className="px-3 py-2.5 font-medium">Zimmetli Araçlar</th>
                <th className="px-3 py-2.5 text-right font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Ekip listesi yükleniyor...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Kayıtlı ekip üyesi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((member) => {
                  const badge = ROLE_BADGES[member.role] || ROLE_BADGES.DRIVER;
                  const zimmetler = Array.isArray(member.zimmetli_araclar)
                    ? member.zimmetli_araclar
                    : [];

                  return (
                    <tr key={member.user_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {member.ad_soyad}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="size-3.5" />
                            {member.email}
                          </span>
                          {member.telefon && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="size-3.5" />
                              {member.telefon}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {zimmetler.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {zimmetler.map((z) => (
                              <span
                                key={z.atama_id || z.arac_id}
                                className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-foreground"
                              >
                                <Car className="size-3 text-primary" />
                                {z.plaka} ({z.marka} {z.model})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Zimmetli araç yok</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => openAssignModalForDriver(member.user_id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          <Car className="size-3.5 text-primary" />
                          Araç Zimmetle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Yeni Şoför Ekle */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-truss-bg/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-truss-border bg-truss-surface p-6 text-truss-text shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-truss-border pb-3">
              <h3 className="text-lg font-semibold text-truss-text flex items-center gap-2">
                <UserPlus className="size-5 text-truss-purple" />
                Yeni Şoför Ekle (DRIVER)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDriverOpen(false)}
                className="rounded-lg p-1 text-truss-muted hover:bg-truss-bg hover:text-truss-text"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-truss-muted mb-1.5">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  required
                  value={driverForm.ad_soyad}
                  onChange={(e) => setDriverForm({ ...driverForm, ad_soyad: e.target.value })}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 py-2 text-sm text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-truss-muted mb-1.5">
                  E-Posta Adresi *
                </label>
                <input
                  type="email"
                  required
                  value={driverForm.email}
                  onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                  placeholder="sofor@sirket.com"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 py-2 text-sm text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-truss-muted mb-1.5">
                  Geçici Şifre *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={driverForm.sifre}
                  onChange={(e) => setDriverForm({ ...driverForm, sifre: e.target.value })}
                  placeholder="En az 6 karakter"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 py-2 text-sm text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-truss-muted mb-1.5">
                  Telefon (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={driverForm.telefon}
                  onChange={(e) => setDriverForm({ ...driverForm, telefon: e.target.value })}
                  placeholder="05XX XXX XX XX"
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 py-2 text-sm text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-truss-border pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="rounded-xl border border-truss-border bg-truss-bg px-4 py-2 text-sm font-medium text-truss-muted hover:border-truss-purple/50 hover:bg-truss-purple/15 hover:text-truss-text transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-truss-purple px-4 py-2 text-sm font-semibold text-truss-text shadow-md shadow-truss-purple/20 hover:bg-truss-purple-hover disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" />
                  {submitting ? 'Kaydediliyor...' : 'Şoförü Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Araç Zimmetle */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-truss-bg/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-truss-border bg-truss-surface p-6 text-truss-text shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-truss-border pb-3">
              <h3 className="text-lg font-semibold text-truss-text flex items-center gap-2">
                <Car className="size-5 text-truss-purple" />
                Personele Araç Zimmetle
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="rounded-lg p-1 text-truss-muted hover:bg-truss-bg hover:text-truss-text"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleAssignVehicle} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-truss-muted mb-1.5">
                  Şoför / Ekip Üyesi Seçin *
                </label>
                <select
                  required
                  value={assignForm.sofor_user_id}
                  onChange={(e) => setAssignForm({ ...assignForm, sofor_user_id: e.target.value })}
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 py-2 text-sm text-truss-text focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25"
                >
                  <option value="" className="bg-truss-surface text-truss-muted">-- Kullanıcı Seçin --</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id} className="bg-truss-surface text-truss-text">
                      {u.ad_soyad} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-truss-muted mb-1.5">
                  Zimmetlenecek Araç *
                </label>
                <select
                  required
                  value={assignForm.arac_id}
                  onChange={(e) => setAssignForm({ ...assignForm, arac_id: e.target.value })}
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 py-2 text-sm text-truss-text focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25"
                >
                  <option value="" className="bg-truss-surface text-truss-muted">-- Araç Seçin --</option>
                  {vehicles.map((v) => (
                    <option key={v.arac_id} value={v.arac_id} className="bg-truss-surface text-truss-text">
                      {v.plaka} — {v.marka} {v.model} ({v.yil})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-truss-border pt-3">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="rounded-xl border border-truss-border bg-truss-bg px-4 py-2 text-sm font-medium text-truss-muted hover:border-truss-purple/50 hover:bg-truss-purple/15 hover:text-truss-text transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-truss-purple px-4 py-2 text-sm font-semibold text-truss-text shadow-md shadow-truss-purple/20 hover:bg-truss-purple-hover disabled:opacity-50"
                >
                  <Link2 className="size-4" />
                  {submitting ? 'Atanıyor...' : 'Zimmeti Tamamla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EkipYonetimi;
