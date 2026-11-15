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
      km: bakim.km ?? '',
      maliyet: bakim.maliyet ?? '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.arac_id || !formData.bakim_tipi || !formData.tarih || formData.km === '' || formData.maliyet === '') {
      toast.error('Lütfen zorunlu alanları doldurun.');
      return;
    }

    const payload = {
      arac_id: Number(formData.arac_id),
      bakim_tipi: formData.bakim_tipi.trim(),
      tarih: formData.tarih,
      km: Number(formData.km),
      maliyet: Number(formData.maliyet),
      notlar: formData.notlar.trim() || null,
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
      await verileriYukle(seciliAracId);
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
              placeholder="Plaka, bakım tipi veya not ara…"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openAddModal}>
            <Plus className="size-3.5" /> Yeni Bakım Ekle
          </Button>
        </div>
      </div>

      {/* Kompakt Tek Satırlık KPI Şeridi */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wrench className="size-4 shrink-0 text-primary" />
            Toplam Bakım Kaydı
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">{gosterilenBakimlar.length}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Banknote className="size-4 shrink-0 text-emerald-500" />
            Toplam Bakım Gideri
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">
            {toplamMaliyet.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Car className="size-4 shrink-0 text-sky-500" />
            Kayıtlı Araç Sayısı
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">{araclar.length}</span>
        </div>
      </div>

      {/* Bakım Tablosu */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : gosterilenBakimlar.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center text-muted-foreground">
          <Wrench className="mx-auto mb-3 size-8 opacity-40" />
          <p className="text-sm font-medium">Henüz bakım kaydı bulunmuyor.</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openAddModal}>
            <Plus className="size-4" /> İlk Bakımı Ekle
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Plaka / Araç</TableHead>
                <TableHead>Bakım Tipi</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Kilometre</TableHead>
                <TableHead>Maliyet</TableHead>
                <TableHead>Notlar</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gosterilenBakimlar.map((bakim) => (
                <TableRow key={bakim.bakim_id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-semibold">
                    <div>{bakim.plaka || `#${bakim.arac_id}`}</div>
                    {(bakim.marka || bakim.model) && (
                      <div className="font-sans text-xs font-normal text-muted-foreground">
                        {bakim.marka} {bakim.model}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Wrench className="size-3" />
                      {bakim.bakim_tipi}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {bakim.tarih ? new Date(bakim.tarih).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Gauge className="size-3.5 text-muted-foreground" />
                      {Number(bakim.km || 0).toLocaleString('tr-TR')} KM
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <Banknote className="size-3.5 text-emerald-500" />
                      {Number(bakim.maliyet || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ₺
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {bakim.notlar || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => openEditModal(bakim)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
      <ConfirmAlertDialog
        open={deleteBakimId !== null}
        onOpenChange={(open) => !open && setDeleteBakimId(null)}
        title="Bakım kaydını sil?"
        description="Bu bakım kaydı kalıcı olarak silinecek."
        onConfirm={handleDelete}
      />

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
                    type="number"
                    name="km"
                    min="0"
                    value={formData.km}
                    onChange={handleInputChange}
                    placeholder="125000"
                    className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Maliyet (₺)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  name="maliyet"
                  value={formData.maliyet}
                  onChange={handleInputChange}
                  placeholder="4500.00"
                  className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
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
                <Button type="submit" disabled={isSubmitting}>
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
