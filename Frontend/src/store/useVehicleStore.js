import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from '@/services/api';
import aracService from '@/services/aracService';
import { formatTurkishPlate } from '@/utils/formatters';
import { toLocalIsoDate } from '@/utils/dateUtils';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const EVRAK_UYARI_GUN = 15;

const bosForm = {
  plaka: '',
  kategori_id: '',
  kategori: '',
  marka: '',
  model: '',
  yil: '',
  varyant_id: '',
  muayene_tarihi: '',
  kasko_tarihi: '',
  sigorta_tarihi: '',
  onerilen_bakim_km: null,
  triger_degisim_km: null,
  calisma_saati_bakim: null,
};

const bosRisk = { tehlike: [], evrak: [] };

const tarihInput = (deger) => {
  if (!deger) return '';
  const raw = String(deger).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return toLocalIsoDate(parsed);
  return raw.slice(0, 10);
};

const evrakRiskliMi = (arac) => {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  return [arac.muayene_tarihi, arac.kasko_tarihi, arac.sigorta_tarihi].some((t) => {
    if (!t) return false;
    const hedef = new Date(t);
    hedef.setHours(0, 0, 0, 0);
    return Math.ceil((hedef - bugun) / MILLISECONDS_IN_DAY) <= EVRAK_UYARI_GUN;
  });
};

let modalKapanmaTimer = null;
let fetchInFlight = null;

const useVehicleStore = create((set, get) => ({
  // Liste
  araclar: [],
  vehicles: [],
  loading: false,
  hasLoaded: false,
  error: null,
  riskliAracIdler: bosRisk,

  // Chrono-OS Zaman Merceği (global araç filtresi)
  seciliAracId: 'tum',
  setSeciliAracId: (aracId) => set({ seciliAracId: aracId ?? 'tum' }),

  // Ekle/Düzenle modalı
  isModalOpen: false,
  isModalVisible: false,
  editingAracId: null,
  formData: bosForm,
  isSubmitting: false,

  fetchAraclar: async () => {
    if (fetchInFlight) return fetchInFlight;
    fetchInFlight = (async () => {
      set({ loading: true, error: null });
      try {
        const data = await aracService.getAraclar();
        const liste = Array.isArray(data) ? data : data?.araclar || [];

        const tehlike = [];
        const evrak = [];
        liste.forEach((arac) => {
          if (evrakRiskliMi(arac)) evrak.push(arac.arac_id);
          const isSmh = arac.sayac_tipi === 'SMH' || Number(arac.calisma_saati_bakim) > 0;
          const sayac = Number(
            arac.guncel_sayac ?? (isSmh ? arac.guncel_calisma_saati : arac.guncel_km) ?? 0
          );
          const periyot = Number(
            (isSmh ? arac.calisma_saati_bakim : arac.onerilen_bakim_km) ||
            arac.bakim_periyodu ||
            (isSmh ? 250 : 15000)
          );
          const sonBakim =
            arac.son_bakim_km !== null && arac.son_bakim_km !== undefined
              ? Number(arac.son_bakim_km)
              : null;
          if (sonBakim !== null && Number.isFinite(sonBakim) && Number.isFinite(periyot) && sayac >= sonBakim + periyot) {
            tehlike.push(arac.arac_id);
          }
        });

        set((state) => {
          const secimGecerli =
            state.seciliAracId === 'tum' ||
            liste.some((a) => String(a.arac_id) === String(state.seciliAracId));
          return {
            araclar: liste,
            vehicles: liste,
            riskliAracIdler: { tehlike, evrak },
            hasLoaded: true,
            seciliAracId: secimGecerli ? state.seciliAracId : 'tum',
          };
        });
      } catch (err) {
        const message = err?.response?.data?.message || 'Araçlar yüklenemedi.';
        set({ error: message });
        toast.error(message);
      } finally {
        set({ loading: false });
        fetchInFlight = null;
      }
    })();
    return fetchInFlight;
  },

  openModal: () => {
    if (modalKapanmaTimer) clearTimeout(modalKapanmaTimer);
    set({ editingAracId: null, formData: bosForm, isModalOpen: true, isModalVisible: true });
  },

  openEditModal: (arac) => {
    if (modalKapanmaTimer) clearTimeout(modalKapanmaTimer);
    set({
      editingAracId: arac.arac_id,
      formData: {
        plaka: formatTurkishPlate(arac.plaka || ''),
        kategori_id: arac.kategori_id ? String(arac.kategori_id) : '',
        kategori: arac.kategori || '',
        marka: arac.marka || '',
        model: arac.model || '',
        yil: arac.yil || '',
        varyant_id: arac.varyant_id ? String(arac.varyant_id) : '',
        muayene_tarihi: tarihInput(arac.muayene_tarihi),
        kasko_tarihi: tarihInput(arac.kasko_tarihi),
        sigorta_tarihi: tarihInput(arac.sigorta_tarihi),
        onerilen_bakim_km: arac.onerilen_bakim_km ?? null,
        triger_degisim_km: arac.triger_degisim_km ?? null,
        calisma_saati_bakim: arac.calisma_saati_bakim ?? null,
      },
      isModalOpen: true,
      isModalVisible: true,
    });
  },

  closeModal: () => {
    set({ isModalVisible: false });
    if (modalKapanmaTimer) clearTimeout(modalKapanmaTimer);
    modalKapanmaTimer = setTimeout(() => {
      set({ isModalOpen: false, editingAracId: null, formData: bosForm });
      modalKapanmaTimer = null;
    }, 200);
  },

  setFormField: (name, value) => {
    set((state) => ({ formData: { ...state.formData, [name]: value } }));
  },

  submitArac: async () => {
    const { formData, editingAracId, closeModal, fetchAraclar } = get();
    if (!formData.plaka || !formData.marka || !formData.model || !formData.yil) {
      toast.error('Lütfen tüm alanları doldurun.');
      return false;
    }

    const payload = {
      plaka: formData.plaka,
      kategori_id: formData.kategori_id ? Number(formData.kategori_id) : null,
      kategori: formData.kategori || null,
      marka: formData.marka,
      model: formData.model,
      yil: Number(formData.yil),
      varyant_id: formData.varyant_id ? Number(formData.varyant_id) : null,
      onerilen_bakim_km: formData.onerilen_bakim_km,
      triger_degisim_km: formData.triger_degisim_km,
      calisma_saati_bakim: formData.calisma_saati_bakim,
      muayene_tarihi: formData.muayene_tarihi || null,
      kasko_tarihi: formData.kasko_tarihi || null,
      sigorta_tarihi: formData.sigorta_tarihi || null,
    };

    set({ isSubmitting: true });
    try {
      if (editingAracId) await aracService.aracGuncelle(editingAracId, payload);
      else await aracService.aracEkle(payload);

      toast.success(editingAracId ? 'Araç güncellendi.' : 'Araç eklendi.');
      closeModal();
      await fetchAraclar();
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'İşlem başarısız.');
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteVehicle: async (id) => {
    try {
      await api.delete(`/araclar/${id}`);
      set((state) => ({
        vehicles: state.vehicles.filter((v) => v.arac_id !== id && v.id !== id),
        araclar: state.araclar.filter((a) => a.arac_id !== id && a.id !== id),
        riskliAracIdler: {
          tehlike: state.riskliAracIdler.tehlike.filter((rid) => rid !== id),
          evrak: state.riskliAracIdler.evrak.filter((rid) => rid !== id),
        },
        seciliAracId: String(state.seciliAracId) === String(id) ? 'tum' : state.seciliAracId,
      }));
      toast.success('Araç silindi.');
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Araç silinemedi.');
      return false;
    }
  },

  deleteArac: async (aracId) => {
    return get().deleteVehicle(aracId);
  },

  // Çıkışta bir önceki kullanıcının araçları bellekte kalmasın.
  reset: () => {
    if (modalKapanmaTimer) clearTimeout(modalKapanmaTimer);
    modalKapanmaTimer = null;
    fetchInFlight = null;
    set({
      araclar: [],
      vehicles: [],
      loading: false,
      hasLoaded: false,
      error: null,
      riskliAracIdler: bosRisk,
      seciliAracId: 'tum',
      isModalOpen: false,
      isModalVisible: false,
      editingAracId: null,
      formData: bosForm,
      isSubmitting: false,
    });
  },
}));

export default useVehicleStore;
