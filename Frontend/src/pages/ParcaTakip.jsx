import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Cog,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Gauge,
  Car,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import parcaService from '@/services/parcaService';
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
  parca_adi: '',
  son_degisim_km: '',
  degisim_araligi_km: '',
  son_degisim_tarihi: new Date().toISOString().slice(0, 10),
};

function hesaplaParcaDurumu(parca) {
  const guncelKm = Number(parca.guncel_km) || 0;
  const sonKm = Number(parca.son_degisim_km) || 0;
  const aralikKm =
    parca.degisim_araligi_km !== null && parca.degisim_araligi_km !== undefined
      ? Number(parca.degisim_araligi_km)
      : null;

  if (!aralikKm || aralikKm <= 0) {
    return {
      kalanKm: null,
      yuzde: null,
      durum: 'tarih_bazli',
      etiket: 'Tarih Bazlı',
    };
  }

  const kullanilanKm = Math.max(0, guncelKm - sonKm);
  const kalanKm = aralikKm - kullanilanKm;
  const yuzde = Math.max(0, Math.min(100, Math.round((kalanKm / aralikKm) * 100)));

  if (kalanKm <= 0) {
    return { kalanKm, yuzde: 0, durum: 'kritik', etiket: 'Değişim Gerekli' };
  }
  if (kalanKm <= 1500) {
    return { kalanKm, yuzde, durum: 'uyari', etiket: 'Yaklaşıyor' };
  }
  return { kalanKm, yuzde, durum: 'iyi', etiket: 'İyi Durumda' };
}

export default function ParcaTakip() {
  const navigate = useNavigate();

  const [araclar, setAraclar] = useState([]);
  const [parcalar, setParcalar] = useState([]);
  const [seciliAracId, setSeciliAracId] = useState('tum');
  const [aramaMetni, setAramaMetni] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteParcaId, setDeleteParcaId] = useState(null);
  const [editingParcaId, setEditingParcaId] = useState(null);
  const [formData, setFormData] = useState(bosForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verileriYukle = useCallback(
    async (aracFiltre = seciliAracId) => {
      setLoading(true);
      try {
        const aracRes = await aracService.getAraclar();
        const aracListesi = Array.isArray(aracRes) ? aracRes : aracRes?.araclar || [];
        setAraclar(aracListesi);

        if (aracFiltre && aracFiltre !== 'tum') {
          const parcaRes = await parcaService.getParcalarByArac(aracFiltre);
          setParcalar(Array.isArray(parcaRes) ? parcaRes : parcaRes?.parcalar || []);
        } else {
          const parcaRes = await parcaService.getAllParcalar();
          setParcalar(Array.isArray(parcaRes) ? parcaRes : parcaRes?.parcalar || []);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Parça kayıtları yüklenemedi.');
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

  const gosterilenParcalar = useMemo(() => {
    const q = aramaMetni.trim().toLowerCase();
    if (!q) return parcalar;
    return parcalar.filter(
      (p) =>
        (p.plaka || '').toLowerCase().includes(q) ||
        (p.parca_adi || '').toLowerCase().includes(q) ||
        (p.marka || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q)
    );
  }, [parcalar, aramaMetni]);

  const ozet = useMemo(() => {
    let kritik = 0;
    let uyari = 0;
    gosterilenParcalar.forEach((p) => {
      const d = hesaplaParcaDurumu(p).durum;
      if (d === 'kritik') kritik += 1;
      else if (d === 'uyari') uyari += 1;
    });
    return { toplam: gosterilenParcalar.length, kritik, uyari };
  }, [gosterilenParcalar]);

  const openAddModal = () => {
    setEditingParcaId(null);
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

  const openEditModal = (parca) => {
    setEditingParcaId(parca.parca_id);
    setFormData({
      arac_id: String(parca.arac_id || ''),
      parca_adi: parca.parca_adi || '',
      son_degisim_km: parca.son_degisim_km ?? 0,
      degisim_araligi_km: parca.degisim_araligi_km ?? '',
      son_degisim_tarihi: parca.son_degisim_tarihi
        ? String(parca.son_degisim_tarihi).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingParcaId(null);
    setFormData(bosForm);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.arac_id ||
      !formData.parca_adi.trim() ||
      formData.son_degisim_km === '' ||
      !formData.son_degisim_tarihi
    ) {
      toast.error('Lütfen zorunlu alanları doldurun.');
      return;
    }

    const payload = {
      arac_id: Number(formData.arac_id),
      parca_adi: formData.parca_adi.trim(),
      son_degisim_km: Number(formData.son_degisim_km),
      degisim_araligi_km:
        formData.degisim_araligi_km === '' || formData.degisim_araligi_km === null
          ? null
          : Number(formData.degisim_araligi_km),
      son_degisim_tarihi: formData.son_degisim_tarihi,
    };

    setIsSubmitting(true);
    try {
      if (editingParcaId) {
        await parcaService.parcaGuncelle(editingParcaId, payload);
        toast.success('Parça kaydı güncellendi.');
      } else {
        await parcaService.parcaEkle(payload);
        toast.success('Parça takibe alındı.');
      }
      closeModal();
      await verileriYukle(seciliAracId);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Parça kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await parcaService.parcaSil(deleteParcaId);
      setParcalar((prev) => prev.filter((p) => p.parca_id !== deleteParcaId));
      toast.success('Parça kaydı silindi.');
      setDeleteParcaId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Parça silinemedi.');
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
              placeholder="Plaka veya parça adı ara…"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openAddModal}>
            <Plus className="size-3.5" /> Yeni Parça Ekle
          </Button>
        </div>
      </div>

      {/* Kompakt Tek Satırlık KPI Şeridi */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Cog className="size-4 shrink-0 text-primary" />
            Takip Edilen Parça
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">{ozet.toplam}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clock className="size-4 shrink-0 text-amber-500" />
            Değişimi Yaklaşan
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-amber-500">{ozet.uyari}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            Ömrü Dolan / Kritik
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight text-destructive">{ozet.kritik}</span>
        </div>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : gosterilenParcalar.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center text-muted-foreground">
          <Cog className="mx-auto mb-3 size-8 opacity-40" />
          <p className="text-sm font-medium">Takip edilen parça kaydı bulunamadı.</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openAddModal}>
            <Plus className="size-4" /> Yeni Parça Ekle
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Plaka / Araç</TableHead>
                <TableHead>Parça Adı</TableHead>
                <TableHead>Son Değişim Tarihi</TableHead>
                <TableHead>Son Değişim KM</TableHead>
                <TableHead>Değişim Aralığı</TableHead>
                <TableHead>Kalan Ömür</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gosterilenParcalar.map((parca) => {
                const analiz = hesaplaParcaDurumu(parca);
                return (
                  <TableRow key={parca.parca_id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-semibold">
                      <div>{parca.plaka || `#${parca.arac_id}`}</div>
                      {(parca.marka || parca.model) && (
                        <div className="font-sans text-xs font-normal text-muted-foreground">
                          {parca.marka} {parca.model}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{parca.parca_adi}</TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        {parca.son_degisim_tarihi
                          ? new Date(parca.son_degisim_tarihi).toLocaleDateString('tr-TR')
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Gauge className="size-3.5 text-muted-foreground" />
                        {Number(parca.son_degisim_km || 0).toLocaleString('tr-TR')} KM
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {parca.degisim_araligi_km
                        ? `${Number(parca.degisim_araligi_km).toLocaleString('tr-TR')} KM`
                        : 'Tarih Bazlı'}
                    </TableCell>
                    <TableCell>
                      {analiz.kalanKm === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">
                              {analiz.kalanKm <= 0
                                ? `${Math.abs(analiz.kalanKm).toLocaleString('tr-TR')} KM aşım`
                                : `${analiz.kalanKm.toLocaleString('tr-TR')} KM`}
                            </span>
                            <span className="text-muted-foreground">%{analiz.yuzde}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full transition-all ${
                                analiz.durum === 'kritik'
                                  ? 'bg-destructive'
                                  : analiz.durum === 'uyari'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${analiz.yuzde}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {analiz.durum === 'kritik' && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" /> {analiz.etiket}
                        </Badge>
                      )}
                      {analiz.durum === 'uyari' && (
                        <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-500">
                          <Clock className="size-3" /> {analiz.etiket}
                        </Badge>
                      )}
                      {analiz.durum === 'iyi' && (
                        <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-500">
                          <CheckCircle2 className="size-3" /> {analiz.etiket}
                        </Badge>
                      )}
                      {analiz.durum === 'tarih_bazli' && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {analiz.etiket}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => openEditModal(parca)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteParcaId(parca.parca_id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <ConfirmAlertDialog
        open={deleteParcaId !== null}
        onOpenChange={(open) => !open && setDeleteParcaId(null)}
        title="Parça kaydını sil?"
        description="Bu parça takip kaydı kalıcı olarak silinecek."
        onConfirm={handleDelete}
      />

      {/* Ekle / Düzenle Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-truss-bg/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-truss-border bg-truss-surface p-6 text-truss-text shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between border-b border-truss-border pb-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-truss-text">
                <Cog className="size-4 text-truss-purple" />
                {editingParcaId ? 'Parça Kaydını Düzenle' : 'Yeni Parça Ekle'}
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
                  disabled={Boolean(editingParcaId)}
                  required
                  className="h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 text-sm text-truss-text focus:border-truss-purple focus:outline-none focus:ring-2 focus:ring-truss-purple/25 disabled:opacity-60"
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
                <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Parça Adı</Label>
                <Input
                  type="text"
                  name="parca_adi"
                  value={formData.parca_adi}
                  onChange={handleInputChange}
                  placeholder="Örn: Motor Yağı, Triger Kayışı, Fren Balataları"
                  className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Son Değişim KM</Label>
                  <Input
                    type="number"
                    min="0"
                    name="son_degisim_km"
                    value={formData.son_degisim_km}
                    onChange={handleInputChange}
                    placeholder="120000"
                    className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                    required
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Değişim Aralığı (KM)</Label>
                  <Input
                    type="number"
                    min="0"
                    name="degisim_araligi_km"
                    value={formData.degisim_araligi_km}
                    onChange={handleInputChange}
                    placeholder="Örn: 10000 (Boş = Tarih bazlı)"
                    className="h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Son Değişim Tarihi</Label>
                <TrussDatePicker
                  name="son_degisim_tarihi"
                  value={formData.son_degisim_tarihi}
                  onChange={handleInputChange}
                  placeholder="Son değişim tarihi seçin"
                  required
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
                    : editingParcaId
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
