import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Fuel,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Gauge,
  Banknote,
  Droplets,
  Car,
  Search,
  X,
  FileText,
} from 'lucide-react';
import yakitService from '@/services/yakitService';
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

const YAKIT_TIPLERI = ['Dizel', 'Benzin', 'LPG', 'Elektrik', 'Diğer'];

const bosForm = {
  arac_id: '',
  yakit_tipi: 'Dizel',
  tarih: new Date().toISOString().slice(0, 10),
  litre: '',
  tutar: '',
  km: '',
  notlar: '',
};

export default function Yakitlar() {
  const navigate = useNavigate();

  const [araclar, setAraclar] = useState([]);
  const [yakitlar, setYakitlar] = useState([]);
  const [seciliAracId, setSeciliAracId] = useState('tum');
  const [aramaMetni, setAramaMetni] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYakitId, setEditingYakitId] = useState(null);
  const [formData, setFormData] = useState(bosForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteYakitId, setDeleteYakitId] = useState(null);

  const verileriYukle = useCallback(
    async (aracFiltre = seciliAracId) => {
      setLoading(true);
      try {
        const aracRes = await aracService.getAraclar();
        const aracListesi = Array.isArray(aracRes) ? aracRes : aracRes?.araclar || [];
        setAraclar(aracListesi);

        if (aracFiltre && aracFiltre !== 'tum') {
          const yakitRes = await yakitService.getYakitlarByArac(aracFiltre);
          setYakitlar(Array.isArray(yakitRes) ? yakitRes : yakitRes?.yakitlar || []);
        } else {
          const yakitRes = await yakitService.getAllYakitlar();
          setYakitlar(Array.isArray(yakitRes) ? yakitRes : yakitRes?.yakitlar || []);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Yakıt kayıtları yüklenemedi.');
      } finally {
        setLoading(false);
      }
    },
    [seciliAracId]
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    verileriYukle(seciliAracId);
  }, [navigate, seciliAracId, verileriYukle]);

  const gosterilenYakitlar = useMemo(() => {
    const q = aramaMetni.trim().toLowerCase();
    if (!q) return yakitlar;
    return yakitlar.filter(
      (y) =>
        (y.plaka || '').toLowerCase().includes(q) ||
        (y.yakit_tipi || '').toLowerCase().includes(q) ||
        (y.notlar || '').toLowerCase().includes(q) ||
        (y.marka || '').toLowerCase().includes(q) ||
        (y.model || '').toLowerCase().includes(q)
    );
  }, [yakitlar, aramaMetni]);

  const ozet = useMemo(() => {
    const toplamTutar = gosterilenYakitlar.reduce((sum, y) => sum + (Number(y.tutar) || 0), 0);
    const toplamLitre = gosterilenYakitlar.reduce((sum, y) => sum + (Number(y.litre) || 0), 0);
    const ortalamaBirimFiyat = toplamLitre > 0 ? toplamTutar / toplamLitre : 0;
    return { toplamTutar, toplamLitre, ortalamaBirimFiyat };
  }, [gosterilenYakitlar]);

  const openAddModal = () => {
    setEditingYakitId(null);
    setFormData({
      ...bosForm,
      arac_id:
        seciliAracId !== 'tum'
          ? String(seciliAracId)
          : araclar[0]?.arac_id
            ? String(araclar[0].arac_id)
            : '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (yakit) => {
    setEditingYakitId(yakit.yakit_id);
    setFormData({
      arac_id: String(yakit.arac_id || ''),
      yakit_tipi: yakit.yakit_tipi || 'Dizel',
      tarih: yakit.tarih ? String(yakit.tarih).slice(0, 10) : new Date().toISOString().slice(0, 10),
      litre: yakit.litre !== null && yakit.litre !== undefined ? formatLocaleNumber(yakit.litre, 2) : '',
      tutar: yakit.tutar !== null && yakit.tutar !== undefined ? formatLocaleNumber(yakit.tutar, 2) : '',
      km: yakit.km !== null && yakit.km !== undefined ? formatLocaleNumber(yakit.km, 0) : '',
      notlar: yakit.notlar || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingYakitId(null);
    setFormData(bosForm);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberBlur = (e) => {
    const { name, value } = e.target;
    if (!['litre', 'tutar', 'km'].includes(name)) return;
    const parsed = parseLocaleNumber(value);
    if (parsed === null) return;
    setFormData((prev) => ({
      ...prev,
      [name]: formatLocaleNumber(parsed, name === 'km' ? 0 : 2),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedAracId = Number(formData.arac_id);
    const parsedLitre = parseLocaleNumber(formData.litre);
    const parsedTutar = parseLocaleNumber(formData.tutar);
    const hasKmInput = String(formData.km ?? '').trim() !== '';
    const parsedKm = hasKmInput ? parseLocaleNumber(formData.km) : null;

    if (
      !Number.isFinite(parsedAracId) ||
      parsedAracId <= 0 ||
      !formData.tarih ||
      parsedLitre === null ||
      parsedLitre <= 0 ||
      parsedTutar === null ||
      parsedTutar < 0 ||
      (hasKmInput && (parsedKm === null || parsedKm < 0))
    ) {
      toast.error('Lütfen zorunlu alanları (Araç, Tarih, Litre, Tutar) geçerli sayısal değerlerle doldurun.');
      return;
    }

    const payload = {
      arac_id: parsedAracId,
      yakit_tipi: formData.yakit_tipi || 'Diğer',
      tarih: formData.tarih,
      litre: Number(parsedLitre),
      tutar: Number(parsedTutar),
      km: parsedKm !== null ? Number(parsedKm) : null,
      notlar: formData.notlar?.trim() || null,
    };

    setIsSubmitting(true);
    try {
      if (editingYakitId) {
        await yakitService.yakitGuncelle(editingYakitId, payload);
        toast.success('Yakıt kaydı güncellendi.');
      } else {
        await yakitService.yakitEkle(payload);
        toast.success('Yakıt kaydı eklendi.');
      }
      closeModal();
      await Promise.all([
        verileriYukle(seciliAracId),
        useVehicleStore.getState().fetchAraclar(),
      ]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Yakıt kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await yakitService.yakitSil(deleteYakitId);
      setYakitlar((prev) => prev.filter((y) => y.yakit_id !== deleteYakitId));
      toast.success('Yakıt kaydı silindi.');
      setDeleteYakitId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Yakıt kaydı silinemedi.');
    }
  };

  return (
    <div className="space-y-3 bg-truss-bg text-truss-text">
      {/* Compact Toolbar (Sol: Başlık + Araç Filtresi, Sağ: Arama + Yeni Ekle) */}
      <div className="flex flex-col gap-2 rounded-xl border border-truss-border bg-truss-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Fuel className="size-4 text-truss-purple" />
            <span className="text-sm font-semibold tracking-tight text-truss-text">Yakıt Alımları</span>
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
              placeholder="Plaka, yakıt tipi veya not ara…"
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
            <Plus className="size-3.5" /> Yeni Yakıt Kaydı
          </Button>
        </div>
      </div>

      {/* Kompakt Tek Satırlık KPI Şeridi */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-truss-muted">
            <Banknote className="size-4 shrink-0 text-truss-purple" />
            Toplam Harcama
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-truss-text">
            {ozet.toplamTutar.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            ₺
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-truss-muted">
            <Droplets className="size-4 shrink-0 text-truss-purple" />
            Toplam Litre
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-truss-text">
            {ozet.toplamLitre.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            L
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-truss-border bg-truss-surface p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-truss-muted">
            <Fuel className="size-4 shrink-0 text-truss-purple" />
            Ortalama Litre Fiyatı
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-truss-text">
            {ozet.ortalamaBirimFiyat.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            ₺/L
          </span>
        </div>
      </div>

      {/* Kompakt Grid Yakıt Tablosu */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg border border-truss-border bg-truss-surface" />
          ))}
        </div>
      ) : gosterilenYakitlar.length === 0 ? (
        <div className="rounded-xl border border-truss-border bg-truss-surface p-6 text-center text-truss-muted">
          <Fuel className="mx-auto mb-2 size-6 text-truss-muted" />
          <p className="text-sm font-medium text-truss-text">Henüz yakıt kaydı bulunmuyor.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-8 gap-1.5 border-truss-border bg-truss-bg text-xs text-truss-text hover:border-truss-purple hover:bg-truss-purple/15"
            onClick={openAddModal}
          >
            <Plus className="size-3.5" /> İlk Yakıt Kaydını Ekle
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-truss-border bg-truss-surface">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-truss-border bg-truss-bg/60 hover:bg-truss-bg/60">
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Plaka / Araç</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Yakıt Tipi</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Tarih</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Litre</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Tutar</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Kilometre</TableHead>
                <TableHead className="px-3.5 py-2.5 text-xs font-semibold text-truss-muted">Notlar</TableHead>
                <TableHead className="px-3.5 py-2.5 text-right text-xs font-semibold text-truss-muted">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-truss-border">
              {gosterilenYakitlar.map((yakit) => (
                <TableRow
                  key={yakit.yakit_id}
                  className="border-truss-border transition-colors hover:bg-truss-bg/50"
                >
                  <TableCell className="px-3.5 py-2.5 font-mono text-sm font-semibold tabular-nums text-truss-text">
                    <div>{yakit.plaka || `#${yakit.arac_id}`}</div>
                    {(yakit.marka || yakit.model) && (
                      <div className="font-sans text-xs font-normal text-truss-muted">
                        {yakit.marka} {yakit.model}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm">
                    <Badge
                      variant="outline"
                      className="gap-1 border-truss-border bg-truss-bg text-xs font-medium text-truss-text"
                    >
                      <Fuel className="size-3 text-truss-purple" />
                      {yakit.yakit_tipi || 'Diğer'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm tabular-nums text-truss-text">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-truss-muted" />
                      {yakit.tarih ? new Date(yakit.tarih).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm font-medium tabular-nums text-truss-text">
                    <span className="inline-flex items-center gap-1.5">
                      <Droplets className="size-3.5 text-truss-purple" />
                      {Number(yakit.litre || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      L
                    </span>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm font-semibold tabular-nums text-truss-text">
                    <span className="inline-flex items-center gap-1.5">
                      <Banknote className="size-3.5 text-truss-purple" />
                      {Number(yakit.tutar || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ₺
                    </span>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-sm tabular-nums text-truss-text">
                    {yakit.km !== null && yakit.km !== undefined ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Gauge className="size-3.5 text-truss-muted" />
                        {Number(yakit.km).toLocaleString('tr-TR')} KM
                      </span>
                    ) : (
                      <span className="text-xs text-truss-muted">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate px-3.5 py-2.5 text-sm text-truss-muted">
                    {yakit.notlar || '-'}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-truss-muted hover:bg-truss-bg hover:text-truss-text"
                        onClick={() => openEditModal(yakit)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-truss-muted hover:bg-truss-bg hover:text-truss-purple"
                        onClick={() => setDeleteYakitId(yakit.yakit_id)}
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
        open={deleteYakitId !== null}
        onOpenChange={(open) => !open && setDeleteYakitId(null)}
      >
        <AlertDialogContent className="border-truss-border bg-truss-surface text-truss-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-truss-text">Yakıt kaydını sil?</AlertDialogTitle>
            <AlertDialogDescription className="text-truss-muted">
              Bu yakıt kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.
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
                <Fuel className="size-4 text-truss-purple" />
                {editingYakitId ? 'Yakıt Kaydını Düzenle' : 'Yeni Yakıt Kaydı'}
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

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Yakıt Tipi</Label>
                  <select
                    name="yakit_tipi"
                    value={formData.yakit_tipi}
                    onChange={handleInputChange}
                    className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 text-sm text-truss-text focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25"
                  >
                    {YAKIT_TIPLERI.map((tip) => (
                      <option key={tip} value={tip} className="bg-truss-surface text-truss-text">
                        {tip}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Tarih</Label>
                  <TrussDatePicker
                    name="tarih"
                    value={formData.tarih}
                    onChange={handleInputChange}
                    placeholder="Yakıt tarihi seçin"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Litre (L)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    name="litre"
                    value={formData.litre}
                    onChange={handleInputChange}
                    onBlur={handleNumberBlur}
                    placeholder="45,50"
                    className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                    required
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Tutar (₺)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    name="tutar"
                    value={formData.tutar}
                    onChange={handleInputChange}
                    onBlur={handleNumberBlur}
                    placeholder="1.950,00"
                    className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                    required
                  />
                </div>
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
                  placeholder="125.000 (İsteğe bağlı)"
                  className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 tabular-nums text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
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
                  placeholder="İstasyon adı, fiş no vb."
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
                    : editingYakitId
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
