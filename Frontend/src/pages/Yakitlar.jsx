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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import ConfirmAlertDialog from '@/components/ConfirmAlertDialog';
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
      litre: yakit.litre ?? '',
      tutar: yakit.tutar ?? '',
      km: yakit.km ?? '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.arac_id || !formData.tarih || formData.litre === '' || formData.tutar === '') {
      toast.error('Lütfen zorunlu alanları (Araç, Tarih, Litre, Tutar) doldurun.');
      return;
    }

    const payload = {
      arac_id: Number(formData.arac_id),
      yakit_tipi: formData.yakit_tipi || 'Diğer',
      tarih: formData.tarih,
      litre: Number(formData.litre),
      tutar: Number(formData.tutar),
      km: formData.km === '' || formData.km === null ? null : Number(formData.km),
      notlar: formData.notlar.trim() || null,
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
      await verileriYukle(seciliAracId);
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
    <div className="space-y-4">
      {/* Kompakt Filtre ve Aksiyon Çubuğu (Toolbar) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Car className="size-4 text-muted-foreground" />
          <select
            value={seciliAracId}
            onChange={(e) => setSeciliAracId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="tum">Tüm Araçlar</option>
            {araclar.map((a) => (
              <option key={a.arac_id} value={a.arac_id}>
                {a.plaka} — {a.marka} {a.model}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Plaka, yakıt tipi veya not ara…"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openAddModal}>
            <Plus className="size-3.5" /> Yeni Yakıt Kaydı
          </Button>
        </div>
      </div>

      {/* Kompakt Tek Satırlık KPI Şeridi */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Banknote className="size-4 shrink-0 text-emerald-500" />
            Toplam Harcama
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">
            {ozet.toplamTutar.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            ₺
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Droplets className="size-4 shrink-0 text-sky-500" />
            Toplam Litre
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">
            {ozet.toplamLitre.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            L
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Fuel className="size-4 shrink-0 text-amber-500" />
            Ortalama Litre Fiyatı
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">
            {ozet.ortalamaBirimFiyat.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            ₺/L
          </span>
        </div>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : gosterilenYakitlar.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center text-muted-foreground">
          <Fuel className="mx-auto mb-3 size-8 opacity-40" />
          <p className="text-sm font-medium">Henüz yakıt kaydı bulunmuyor.</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openAddModal}>
            <Plus className="size-4" /> İlk Yakıt Kaydını Ekle
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Plaka / Araç</TableHead>
                <TableHead>Yakıt Tipi</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Litre</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Kilometre</TableHead>
                <TableHead>Notlar</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gosterilenYakitlar.map((yakit) => (
                <TableRow key={yakit.yakit_id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-semibold">
                    <div>{yakit.plaka || `#${yakit.arac_id}`}</div>
                    {(yakit.marka || yakit.model) && (
                      <div className="font-sans text-xs font-normal text-muted-foreground">
                        {yakit.marka} {yakit.model}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Fuel className="size-3" />
                      {yakit.yakit_tipi || 'Diğer'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {yakit.tarih ? new Date(yakit.tarih).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <Droplets className="size-3.5 text-sky-500" />
                      {Number(yakit.litre || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      L
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <Banknote className="size-3.5 text-emerald-500" />
                      {Number(yakit.tutar || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ₺
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {yakit.km !== null && yakit.km !== undefined ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Gauge className="size-3.5 text-muted-foreground" />
                        {Number(yakit.km).toLocaleString('tr-TR')} KM
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {yakit.notlar || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => openEditModal(yakit)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
      <ConfirmAlertDialog
        open={deleteYakitId !== null}
        onOpenChange={(open) => !open && setDeleteYakitId(null)}
        title="Yakıt kaydını sil?"
        description="Bu yakıt kaydı kalıcı olarak silinecek."
        onConfirm={handleDelete}
      />

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
                    type="number"
                    step="0.01"
                    min="0"
                    name="litre"
                    value={formData.litre}
                    onChange={handleInputChange}
                    placeholder="45.50"
                    className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                    required
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Tutar (₺)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    name="tutar"
                    value={formData.tutar}
                    onChange={handleInputChange}
                    placeholder="1950.00"
                    className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Kilometre (KM)</Label>
                <Input
                  type="number"
                  min="0"
                  name="km"
                  value={formData.km}
                  onChange={handleInputChange}
                  placeholder="125000 (İsteğe bağlı)"
                  className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
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
                <Button type="submit" disabled={isSubmitting}>
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
