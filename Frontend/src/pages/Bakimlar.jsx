import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wrench,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  Gauge,
  Banknote,
  Car,
  Search,
  X,
  FileText,
} from 'lucide-react';
import bakimService from '@/services/bakimService';
import aracService from '@/services/aracService';
import useVehicleStore from '@/store/useVehicleStore';
import { formatLocaleNumber, parseLocaleNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const bosForm = {
  arac_id: '',
  bakim_tipi: '',
  tarih: new Date().toISOString().slice(0, 10),
  km: '',
  maliyet: '',
  notlar: '',
};

export default function Bakimlar() {
  const navigate = useNavigate();

  const [araclar, setAraclar] = useState([]);
  const [bakimlar, setBakimlar] = useState([]);
  const [seciliAracId, setSeciliAracId] = useState('tum');
  const [aramaMetni, setAramaMetni] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBakimId, setEditingBakimId] = useState(null);
  const [formData, setFormData] = useState(bosForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteBakimId, setDeleteBakimId] = useState(null);

  const verileriYukle = useCallback(async (aracFiltre = seciliAracId) => {
    setLoading(true);
    try {
      const aracRes = await aracService.getAraclar();
      const aracListesi = Array.isArray(aracRes) ? aracRes : aracRes?.araclar || [];
      setAraclar(aracListesi);

      if (aracFiltre && aracFiltre !== 'tum') {
        const bakimRes = await bakimService.getBakimlarByArac(aracFiltre);
        setBakimlar(Array.isArray(bakimRes) ? bakimRes : bakimRes?.bakimlar || []);
      } else {
        const bakimRes = await bakimService.getAllBakimlar();
        setBakimlar(Array.isArray(bakimRes) ? bakimRes : bakimRes?.bakimlar || []);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bakım kayıtları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [seciliAracId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    verileriYukle(seciliAracId);
  }, [navigate, seciliAracId, verileriYukle]);

  const gosterilenBakimlar = useMemo(() => {
    const q = aramaMetni.trim().toLowerCase();
    if (!q) return bakimlar;
    return bakimlar.filter(
      (b) =>
        (b.plaka || '').toLowerCase().includes(q) ||
        (b.bakim_tipi || '').toLowerCase().includes(q) ||
        (b.notlar || '').toLowerCase().includes(q)
    );
  }, [bakimlar, aramaMetni]);

  const toplamMaliyet = useMemo(
    () => gosterilenBakimlar.reduce((sum, b) => sum + (Number(b.maliyet) || 0), 0),
    [gosterilenBakimlar]
  );

  const openAddModal = () => {
    setEditingBakimId(null);
    setFormData({
      ...bosForm,
      arac_id: seciliAracId !== 'tum' ? String(seciliAracId) : araclar[0]?.arac_id ? String(araclar[0].arac_id) : '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (bakim) => {
    setEditingBakimId(bakim.bakim_id);
    setFormData({
      arac_id: String(bakim.arac_id || ''),
      bakim_tipi: bakim.bakim_tipi || '',
      tarih: bakim.tarih ? String(bakim.tarih).slice(0, 10) : '',
      km: bakim.km !== null && bakim.km !== undefined ? formatLocaleNumber(bakim.km, 0) : '',
      maliyet: bakim.maliyet !== null && bakim.maliyet !== undefined ? formatLocaleNumber(bakim.maliyet, 2) : '',
      notlar: bakim.notlar || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBakimId(null);
    setFormData(bosForm);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberBlur = (e) => {
    const { name, value } = e.target;
    if (!['km', 'maliyet'].includes(name)) return;
    const parsed = parseLocaleNumber(value);
    if (parsed === null) return;
    setFormData((prev) => ({
      ...prev,
      [name]: formatLocaleNumber(parsed, name === 'maliyet' ? 2 : 0),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedAracId = Number(formData.arac_id);
    const parsedKm = parseLocaleNumber(formData.km);
    const parsedMaliyet = parseLocaleNumber(formData.maliyet);

    if (
      !Number.isFinite(parsedAracId) ||
      parsedAracId <= 0 ||
      !formData.bakim_tipi?.trim() ||
      !formData.tarih ||
      parsedKm === null ||
      parsedKm < 0 ||
      parsedMaliyet === null ||
      parsedMaliyet < 0
    ) {
      toast.error('Lütfen zorunlu alanları geçerli değerlerle doldurun.');
      return;
    }

    const payload = {
      arac_id: parsedAracId,
      bakim_tipi: formData.bakim_tipi.trim(),
      tarih: formData.tarih,
      km: Number(parsedKm),
      maliyet: Number(parsedMaliyet),
      notlar: formData.notlar?.trim() || null,
    };

    setIsSubmitting(true);
    try {
      if (editingBakimId) {
        await bakimService.bakimGuncelle(editingBakimId, payload);
        toast.success('Bakım kaydı güncellendi.');
      } else {
        await bakimService.bakimEkle(payload);
        toast.success('Bakım kaydı eklendi.');
      }
      closeModal();
      await Promise.all([
        verileriYukle(seciliAracId),
        useVehicleStore.getState().fetchAraclar(),
      ]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bakım kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await bakimService.bakimSil(deleteBakimId);
      setBakimlar((prev) => prev.filter((b) => b.bakim_id !== deleteBakimId));
      toast.success('Bakım kaydı silindi.');
      setDeleteBakimId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bakım kaydı silinemedi.');
    }
  };

  return (
    <div className="space-y-3 bg-truss-bg text-truss-text">
      {/* Compact Toolbar (Sol: Başlık + Araç Filtresi, Sağ: Arama + Yeni Ekle) */}
      <div className="flex flex-col gap-2 rounded-xl border border-truss-border bg-truss-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-truss-purple" />
            <span className="text-sm font-semibold tracking-tight text-truss-text">Bakım Kayıtları</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Car className="size-3.5 text-truss-muted" />
            <select
              value={seciliAracId}
              onChange={(e) => setSeciliAracId(e.target.value)}
              className="h-8 rounded-lg border border-truss-border bg-truss-bg px-2.5 text-xs text-truss-text focus:border-truss-purple focus:outline-none focus:ring-1 focus:ring-truss-purple"
            >
              <option value="tum" className="bg-truss-surface text-truss-text">Tüm Araçlar</option>
              {araclar.map((a) => (
                <option key={a.arac_id} value={a.arac_id} className="bg-truss-surface text-truss-text">
                  {a.plaka} — {a.marka} {a.model}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-truss-muted" />
            <Input
              type="search"
              placeholder="Plaka, bakım tipi veya not ara…"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="h-8 rounded-lg border-truss-border bg-truss-bg pl-8 text-xs text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus-visible:ring-truss-purple"
            />
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-lg bg-truss-purple px-3 text-xs font-semibold text-truss-text hover:bg-truss-purple-hover"
            onClick={openAddModal}
          >
            <Plus className="size-3.5" /> Yeni Bakım Ekle
          </Button>
        </div>
      </div>

      {/* Kompakt Tek Satırlık KPI Şeridi */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-truss-muted">
            <Wrench className="size-4 shrink-0 text-truss-purple" />
            Toplam Bakım Kaydı
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-truss-text">
            {gosterilenBakimlar.length}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-truss-muted">
            <Banknote className="size-4 shrink-0 text-truss-purple" />
            Toplam Bakım Gideri
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-truss-text">
            {toplamMaliyet.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-truss-muted">
            <Car className="size-4 shrink-0 text-truss-purple" />
            Kayıtlı Araç Sayısı
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-truss-text">
            {araclar.length}
          </span>
        </div>
      </div>

      {/* Kompakt Grid Bakım Tablosu */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg border border-truss-border bg-truss-surface" />
          ))}
        </div>
      ) : gosterilenBakimlar.length === 0 ? (
        <div className="rounded-xl border border-truss-border bg-truss-surface p-6 text-center text-truss-muted">
          <Wrench className="mx-auto mb-2 size-6 text-truss-muted" />
          <p className="text-sm font-medium text-truss-text">Henüz bakım kaydı bulunmuyor.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-8 gap-1.5 border-truss-border bg-truss-bg text-xs text-truss-text hover:border-truss-purple hover:bg-truss-purple/15"
            onClick={openAddModal}
          >
            <Plus className="size-3.5" /> İlk Bakımı Ekle
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-truss-border bg-truss-surface">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-truss-border bg-truss-bg/60 hover:bg-truss-bg/60">
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Plaka / Araç</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Bakım Tipi</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Tarih</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Kilometre</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Maliyet</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Notlar</TableHead>
                <TableHead className="px-3.5 py-2.5 text-right text-xs font-semibold text-truss-muted">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-truss-border">
              {gosterilenBakimlar.map((bakim) => (
                <TableRow
                  key={bakim.bakim_id}
                  className="border-truss-border transition-colors hover:bg-truss-bg/50"
                >
                  <TableCell className="px-3.5 py-2.5 font-mono text-sm font-semibold tabular-nums text-truss-text">
                    <div>{bakim.plaka || `#${bakim.arac_id}`}</div>
                    {(bakim.marka || bakim.model) && (
                      <div className="font-sans text-xs font-normal text-truss-muted">
                        {bakim.marka} {bakim.model}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm">
                    <Badge
                      variant="outline"
                      className="gap-1 border-truss-border bg-truss-bg text-xs font-medium text-truss-text"
                    >
                      <Wrench className="size-3 text-truss-purple" />
                      {bakim.bakim_tipi}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm tabular-nums text-truss-text">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-truss-muted" />
                      {bakim.tarih ? new Date(bakim.tarih).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm tabular-nums text-truss-text">
                    <span className="inline-flex items-center gap-1.5">
                      <Gauge className="size-3.5 text-truss-muted" />
                      {Number(bakim.km || 0).toLocaleString('tr-TR')} KM
                    </span>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm font-semibold tabular-nums text-truss-text">
                    <span className="inline-flex items-center gap-1.5">
                      <Banknote className="size-3.5 text-truss-purple" />
                      {Number(bakim.maliyet || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ₺
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate px-3.5 py-2.5 text-sm text-truss-muted">
                    {bakim.notlar || '-'}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-truss-muted hover:bg-truss-bg hover:text-truss-text"
                        onClick={() => openEditModal(bakim)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-truss-muted hover:bg-truss-bg hover:text-truss-purple"
                        onClick={() => setDeleteBakimId(bakim.bakim_id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Shadcn AlertDialog - Silme Onayı */}
      <AlertDialog
        open={deleteBakimId !== null}
        onOpenChange={(open) => !open && setDeleteBakimId(null)}
      >
        <AlertDialogContent className="border-truss-border bg-truss-surface text-truss-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-truss-text">Bakım kaydını sil?</AlertDialogTitle>
            <AlertDialogDescription className="text-truss-muted">
              Bu bakım kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-truss-border bg-truss-bg text-truss-text hover:bg-truss-surface">
              Vazgeç
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-truss-purple text-truss-text hover:bg-truss-purple-hover"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ekle / Düzenle Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-truss-bg/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-truss-border bg-truss-surface p-6 text-truss-text shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between border-b border-truss-border pb-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-truss-text">
                <Wrench className="size-4 text-truss-purple" />
                {editingBakimId ? 'Bakım Kaydını Düzenle' : 'Yeni Bakım Ekle'}
              </h3>
              <Button size="icon" variant="ghost" className="size-7 text-truss-muted hover:bg-truss-bg hover:text-truss-text" onClick={closeModal}>
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Araç</Label>
                <select
                  name="arac_id"
                  value={formData.arac_id}
                  onChange={handleInputChange}
                  required
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 text-sm text-truss-text focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25"
                >
                  <option value="" className="bg-truss-surface text-truss-muted">Araç seçin…</option>
                  {araclar.map((a) => (
                    <option key={a.arac_id} value={a.arac_id} className="bg-truss-surface text-truss-text">
                      {a.plaka} — {a.marka} {a.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Bakım Tipi</Label>
                <Input
                  type="text"
                  name="bakim_tipi"
                  value={formData.bakim_tipi}
                  onChange={handleInputChange}
                  placeholder="Örn: Periyodik Bakım, Fren Balatası Değişimi"
                  className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Tarih</Label>
                  <TrussDatePicker
                    name="tarih"
                    value={formData.tarih}
                    onChange={handleInputChange}
                    placeholder="Bakım tarihi seçin"
                    required
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Kilometre (KM)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    name="km"
                    value={formData.km}
                    onChange={handleInputChange}
                    onBlur={handleNumberBlur}
                    placeholder="125.000"
                    className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Maliyet (₺)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  name="maliyet"
                  value={formData.maliyet}
                  onChange={handleInputChange}
                  onBlur={handleNumberBlur}
                  placeholder="4.500,00"
                  className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                  required
                />
              </div>

              <div>
                <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-truss-muted">
                  <FileText className="size-3.5" /> Notlar (İsteğe Bağlı)
                </Label>
                <Input
                  type="text"
                  name="notlar"
                  value={formData.notlar}
                  onChange={handleInputChange}
                  placeholder="Servis adı, değişen parçalar vb."
                  className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                />
              </div>

              <div className="flex justify-end gap-2.5 border-t border-truss-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="border-truss-border bg-truss-bg text-truss-muted hover:border-truss-purple/50 hover:bg-truss-purple/15 hover:text-truss-text"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-truss-purple font-semibold text-truss-text hover:bg-truss-purple-hover"
                >
                  {isSubmitting
                    ? 'Kaydediliyor…'
                    : editingBakimId
                      ? 'Güncelle'
                      : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
