import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrussDatePicker } from '@/components/ui/truss-date-picker';
import useVehicleStore from '@/store/useVehicleStore';
import katalogService from '@/services/katalogService';
import { formatTurkishPlate } from '@/utils/formatters';

const AddVehicleModal = () => {
  const isModalOpen = useVehicleStore((s) => s.isModalOpen);
  const isModalVisible = useVehicleStore((s) => s.isModalVisible);
  const editingAracId = useVehicleStore((s) => s.editingAracId);
  const formData = useVehicleStore((s) => s.formData);
  const isSubmitting = useVehicleStore((s) => s.isSubmitting);
  const setFormField = useVehicleStore((s) => s.setFormField);
  const submitArac = useVehicleStore((s) => s.submitArac);
  const closeModal = useVehicleStore((s) => s.closeModal);
  const plakaInputRef = useRef(null);

  // 4 Kademeli Kaskad Katalog State'leri (Kategori -> Marka -> Model -> Varyant)
  const [kategoriler, setKategoriler] = useState([]);
  const [markalar, setMarkalar] = useState([]);
  const [modeller, setModeller] = useState([]);
  const [varyantlar, setVaryantlar] = useState([]);

  const [seciliKategoriId, setSeciliKategoriId] = useState('');
  const [seciliMarkaId, setSeciliMarkaId] = useState('');
  const [seciliModelId, setSeciliModelId] = useState('');
  const [seciliVaryantId, setSeciliVaryantId] = useState('');

  // Arka planda otomatik parça/bakım takibi için tutulan varyant bakım verileri
  const [varyantBakimBilgisi, setVaryantBakimBilgisi] = useState({
    onerilen_bakim_km: null,
    triger_degisim_km: null,
    calisma_saati_bakim: null,
  });

  useEffect(() => {
    if (isModalOpen && isModalVisible) {
      plakaInputRef.current?.focus();
    }
  }, [isModalOpen, isModalVisible]);

  // Modal açıldığında kategorileri yükle
  useEffect(() => {
    if (!isModalOpen) return;

    let active = true;
    katalogService
      .getKategoriler()
      .then((list) => {
        if (!active) return;
        setKategoriler(list);

        if (formData.kategori_id) {
          setSeciliKategoriId(String(formData.kategori_id));
        } else if (formData.kategori) {
          const eslesenKategori = list.find(
            (k) => k.ad.toLowerCase() === String(formData.kategori).toLowerCase()
          );
          if (eslesenKategori) {
            setSeciliKategoriId(String(eslesenKategori.kategori_id));
          } else {
            setSeciliKategoriId('');
          }
        } else {
          setSeciliKategoriId('');
        }
      })
      .catch(() => setKategoriler([]));

    return () => {
      active = false;
    };
  }, [isModalOpen, formData.kategori_id, formData.kategori]);

  // Kategori seçildiğinde ilgili kategorinin markalarını yükle
  useEffect(() => {
    if (!isModalOpen) return;
    if (!seciliKategoriId) {
      setMarkalar([]);
      setSeciliMarkaId('');
      setModeller([]);
      setSeciliModelId('');
      setVaryantlar([]);
      setSeciliVaryantId('');
      return;
    }

    let active = true;
    katalogService
      .getMarkalar(seciliKategoriId)
      .then((list) => {
        if (!active) return;
        setMarkalar(list);

        if (formData.marka) {
          const eslesenMarka = list.find(
            (m) => m.ad.toLowerCase() === String(formData.marka).toLowerCase()
          );
          if (eslesenMarka) {
            setSeciliMarkaId(String(eslesenMarka.marka_id));
          } else {
            setSeciliMarkaId('');
          }
        } else {
          setSeciliMarkaId('');
          setSeciliModelId('');
          setSeciliVaryantId('');
          setModeller([]);
          setVaryantlar([]);
          setVaryantBakimBilgisi({
            onerilen_bakim_km: null,
            triger_degisim_km: null,
            calisma_saati_bakim: null,
          });
        }
      })
      .catch(() => setMarkalar([]));

    return () => {
      active = false;
    };
  }, [isModalOpen, seciliKategoriId, formData.marka]);

  // Marka seçildiğinde modelleri yükle
  useEffect(() => {
    if (!seciliMarkaId) {
      setModeller([]);
      setSeciliModelId('');
      setVaryantlar([]);
      setSeciliVaryantId('');
      return;
    }

    let active = true;
    katalogService
      .getModeller(seciliMarkaId, seciliKategoriId || undefined)
      .then((list) => {
        if (!active) return;
        setModeller(list);

        if (formData.model) {
          const eslesenModel = list.find(
            (m) => m.ad.toLowerCase() === String(formData.model).toLowerCase()
          );
          if (eslesenModel) {
            setSeciliModelId(String(eslesenModel.model_id));
          } else {
            setSeciliModelId('');
          }
        }
      })
      .catch(() => setModeller([]));

    return () => {
      active = false;
    };
  }, [seciliMarkaId, seciliKategoriId, formData.model]);

  // Model seçildiğinde varyantları yükle
  useEffect(() => {
    if (!seciliModelId) {
      setVaryantlar([]);
      setSeciliVaryantId('');
      return;
    }

    let active = true;
    katalogService
      .getVaryantlar(seciliModelId)
      .then((list) => {
        if (!active) return;
        setVaryantlar(list);
        if (formData.varyant_id) {
          setSeciliVaryantId(String(formData.varyant_id));
        }
      })
      .catch(() => setVaryantlar([]));

    return () => {
      active = false;
    };
  }, [seciliModelId, formData.varyant_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormField(name, name === 'plaka' ? formatTurkishPlate(value) : value);
  };

  const handleKategoriSelect = (e) => {
    const kategoriId = e.target.value;
    setSeciliKategoriId(kategoriId);
    setSeciliMarkaId('');
    setSeciliModelId('');
    setSeciliVaryantId('');
    setModeller([]);
    setVaryantlar([]);
    setVaryantBakimBilgisi({
      onerilen_bakim_km: null,
      triger_degisim_km: null,
      calisma_saati_bakim: null,
    });

    const kategoriObj = kategoriler.find((k) => String(k.kategori_id) === String(kategoriId));
    setFormField('kategori_id', kategoriId);
    setFormField('kategori', kategoriObj ? kategoriObj.ad : '');
    setFormField('marka', '');
    setFormField('model', '');
    setFormField('varyant_id', '');
    setFormField('onerilen_bakim_km', null);
    setFormField('triger_degisim_km', null);
    setFormField('calisma_saati_bakim', null);
  };

  const handleMarkaSelect = (e) => {
    const markaId = e.target.value;
    setSeciliMarkaId(markaId);
    setSeciliModelId('');
    setSeciliVaryantId('');
    setVaryantBakimBilgisi({
      onerilen_bakim_km: null,
      triger_degisim_km: null,
      calisma_saati_bakim: null,
    });

    const markaObj = markalar.find((m) => String(m.marka_id) === String(markaId));
    setFormField('marka', markaObj ? markaObj.ad : '');
    setFormField('model', '');
    setFormField('varyant_id', '');
  };

  const handleModelSelect = (e) => {
    const modelId = e.target.value;
    setSeciliModelId(modelId);
    setSeciliVaryantId('');
    setVaryantBakimBilgisi({
      onerilen_bakim_km: null,
      triger_degisim_km: null,
      calisma_saati_bakim: null,
    });

    const modelObj = modeller.find((m) => String(m.model_id) === String(modelId));
    setFormField('model', modelObj ? modelObj.ad : '');
    setFormField('varyant_id', '');
  };

  const handleVaryantSelect = (e) => {
    const varyantId = e.target.value;
    setSeciliVaryantId(varyantId);
    setFormField('varyant_id', varyantId);

    const varyantObj = varyantlar.find((v) => String(v.varyant_id) === String(varyantId));
    if (varyantObj) {
      const bakimKm = varyantObj.onerilen_bakim_km ?? null;
      const trigerKm = varyantObj.triger_degisim_km ?? null;
      const calismaSaati = varyantObj.calisma_saati_bakim ?? null;
      setVaryantBakimBilgisi({
        onerilen_bakim_km: bakimKm,
        triger_degisim_km: trigerKm,
        calisma_saati_bakim: calismaSaati,
      });
      setFormField('onerilen_bakim_km', bakimKm);
      setFormField('triger_degisim_km', trigerKm);
      setFormField('calisma_saati_bakim', calismaSaati);
    } else {
      setVaryantBakimBilgisi({
        onerilen_bakim_km: null,
        triger_degisim_km: null,
        calisma_saati_bakim: null,
      });
      setFormField('onerilen_bakim_km', null);
      setFormField('triger_degisim_km', null);
      setFormField('calisma_saati_bakim', null);
    }
  };

  const handleFormEnterKeyDown = (e) => {
    if (e.key !== 'Enter' || e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    e.currentTarget.requestSubmit();
  };

  const handleAddArac = (e) => {
    e.preventDefault();
    submitArac();
  };

  if (!isModalOpen) return null;

  const selectClassName =
    'flex h-10 w-full rounded-xl border border-truss-border bg-truss-bg px-3.5 py-2 text-sm text-truss-text focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

  const inputClassName =
    'h-10 rounded-xl border-truss-border bg-truss-bg px-3.5 text-truss-text placeholder:text-truss-muted focus:border-truss-purple focus:ring-2 focus:ring-truss-purple/25';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-truss-bg/80 px-4 backdrop-blur-sm ${isModalVisible ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
      <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-truss-border bg-truss-surface p-6 sm:p-7 text-truss-text shadow-2xl backdrop-blur-xl ${isModalVisible ? 'modal-panel-enter' : 'modal-panel-exit'}`}>
        <h3 className="mb-5 text-xl font-bold text-truss-text">{editingAracId ? 'Araç Düzenle' : 'Yeni Araç Ekle'}</h3>

        <form onSubmit={handleAddArac} onKeyDown={handleFormEnterKeyDown} className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Plaka</Label>
            <Input
              ref={plakaInputRef}
              type="text"
              name="plaka"
              value={formData.plaka}
              onChange={handleInputChange}
              autoFocus
              className={inputClassName}
              placeholder="34 ABC 123"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Kategori</Label>
            <select
              name="kategori_id"
              value={seciliKategoriId}
              onChange={handleKategoriSelect}
              className={selectClassName}
            >
              <option value="" className="bg-truss-bg text-truss-muted">
                -- Kategori Seçin --
              </option>
              {kategoriler.map((k) => (
                <option key={k.kategori_id} value={k.kategori_id} className="bg-truss-bg text-truss-text">
                  {k.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Marka</Label>
            <select
              name="marka_id"
              value={seciliMarkaId}
              onChange={handleMarkaSelect}
              disabled={!seciliKategoriId}
              className={selectClassName}
            >
              <option value="" className="bg-truss-bg text-truss-muted">
                {!seciliKategoriId
                  ? 'Önce kategori seçin'
                  : formData.marka
                  ? `${formData.marka} (Değiştirmek için seçin)`
                  : '-- Marka Seçin --'}
              </option>
              {markalar.map((m) => (
                <option key={m.marka_id} value={m.marka_id} className="bg-truss-bg text-truss-text">
                  {m.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Model</Label>
            <select
              name="model_id"
              value={seciliModelId}
              onChange={handleModelSelect}
              disabled={!seciliMarkaId}
              className={selectClassName}
            >
              <option value="" className="bg-truss-bg text-truss-muted">
                {!seciliMarkaId
                  ? 'Önce marka seçin'
                  : formData.model
                  ? `${formData.model} (Değiştirmek için seçin)`
                  : '-- Model Seçin --'}
              </option>
              {modeller.map((mo) => (
                <option key={mo.model_id} value={mo.model_id} className="bg-truss-bg text-truss-text">
                  {mo.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Kasa / Motor Varyantı</Label>
            <select
              name="varyant_id"
              value={seciliVaryantId}
              onChange={handleVaryantSelect}
              disabled={!seciliModelId}
              className={selectClassName}
            >
              <option value="" className="bg-truss-bg text-truss-muted">
                {!seciliModelId ? 'Önce model seçin' : '-- Kasa / Motor Seçin --'}
              </option>
              {varyantlar.map((v) => (
                <option key={v.varyant_id} value={v.varyant_id} className="bg-truss-bg text-truss-text">
                  {v.etiket || `${v.kasa_tipi} • ${v.motor_adi} • ${v.sanziman_tipi} (${v.yakit_tipi})`}
                </option>
              ))}
            </select>
            {(varyantBakimBilgisi.onerilen_bakim_km || varyantBakimBilgisi.calisma_saati_bakim) && (
              <p className="mt-1.5 text-xs text-truss-muted">
                {varyantBakimBilgisi.calisma_saati_bakim ? (
                  <>
                    Çalışma Saati Bakımı:{' '}
                    <strong className="text-truss-purple">{varyantBakimBilgisi.calisma_saati_bakim} Saat</strong>
                  </>
                ) : (
                  <>
                    Önerilen Bakım:{' '}
                    <strong className="text-truss-purple">{varyantBakimBilgisi.onerilen_bakim_km.toLocaleString('tr-TR')} km</strong>
                    {varyantBakimBilgisi.triger_degisim_km
                      ? ` • Triger: ${varyantBakimBilgisi.triger_degisim_km.toLocaleString('tr-TR')} km`
                      : ' • Elektrikli / Zincirli Sürüş'}
                  </>
                )}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Yıl</Label>
            <Input
              type="number"
              name="yil"
              value={formData.yil}
              onChange={handleInputChange}
              className={inputClassName}
              placeholder="2023"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Muayene Tarihi</Label>
              <TrussDatePicker
                name="muayene_tarihi"
                value={formData.muayene_tarihi}
                onChange={handleInputChange}
                placeholder="Muayene seç"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Kasko Tarihi</Label>
              <TrussDatePicker
                name="kasko_tarihi"
                value={formData.kasko_tarihi}
                onChange={handleInputChange}
                placeholder="Kasko seç"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-truss-muted">Sigorta Tarihi</Label>
              <TrussDatePicker
                name="sigorta_tarihi"
                value={formData.sigorta_tarihi}
                onChange={handleInputChange}
                placeholder="Sigorta seç"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-truss-border">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="rounded-xl border border-truss-border bg-truss-bg px-4 py-2 text-truss-text hover:border-truss-purple hover:bg-truss-purple/15"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="neo-btn rounded-xl bg-truss-purple px-5 py-2 font-semibold text-truss-text shadow-md shadow-truss-purple/20 hover:bg-truss-purple-hover"
            >
              {isSubmitting ? (editingAracId ? 'Güncelleniyor...' : 'Ekleniyor...') : (editingAracId ? 'Güncelle' : 'Kaydet')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVehicleModal;


