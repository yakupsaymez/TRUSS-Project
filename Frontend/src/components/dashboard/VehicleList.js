import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportToCSV, sortByKey } from '@/utils/exporter';
import useVehicleStore from '@/store/useVehicleStore';
import ConfirmAlertDialog from '@/components/ConfirmAlertDialog';

const VehicleList = ({
  aktifFiltre = 'tum',
  setAktifFiltre = () => {},
  listMotionSeed = 0,
  openQuickFuelModal
}) => {
  const navigate = useNavigate();
  const araclar = useVehicleStore((s) => s.araclar);
  const loading = useVehicleStore((s) => s.loading);
  const error = useVehicleStore((s) => s.error);
  const riskliAracIdler = useVehicleStore((s) => s.riskliAracIdler);
  const fetchAraclar = useVehicleStore((s) => s.fetchAraclar);
  const openModal = useVehicleStore((s) => s.openModal);
  const openEditModal = useVehicleStore((s) => s.openEditModal);
  const deleteArac = useVehicleStore((s) => s.deleteArac);

  const [sortConfig, setSortConfig] = useState({ key: 'plaka', order: 'asc' });
  const [aramaMetni, setAramaMetni] = useState('');
  const [deleteAracId, setDeleteAracId] = useState(null);

  useEffect(() => {
    const { hasLoaded: yuklendi, loading: yukleniyor } = useVehicleStore.getState();
    if (!yuklendi && !yukleniyor) fetchAraclar();
  }, [fetchAraclar]);

  const handleDeleteArac = async () => {
    await deleteArac(deleteAracId);
    setDeleteAracId(null);
  };

  const gosterilenAraclar = useMemo(() => {
    let liste = araclar;
    if (aktifFiltre === 'tehlike') {
      const ids = new Set(riskliAracIdler.tehlike);
      liste = liste.filter((arac) => ids.has(arac.arac_id));
    } else if (aktifFiltre === 'evrak') {
      const ids = new Set(riskliAracIdler.evrak);
      liste = liste.filter((arac) => ids.has(arac.arac_id));
    }
    const q = aramaMetni.trim().toLowerCase();
    if (q) {
      liste = liste.filter((a) =>
        [a.plaka, a.marka, a.model].some((v) => (v || '').toLowerCase().includes(q))
      );
    }
    return liste;
  }, [aktifFiltre, araclar, aramaMetni, riskliAracIdler.evrak, riskliAracIdler.tehlike]);

  const sortedAraclar = useMemo(() => {
    return sortByKey(gosterilenAraclar, sortConfig.key, sortConfig.order === 'asc');
  }, [gosterilenAraclar, sortConfig]);

  const handleSortClick = (key) => {
    setSortConfig((prev) => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <>
      <ConfirmAlertDialog
        open={deleteAracId !== null}
        onOpenChange={(open) => !open && setDeleteAracId(null)}
        title="Aracı sil?"
        description="Bu araç ve ilişkili kayıtları silinecek. Bu işlem geri alınamaz."
        onConfirm={handleDeleteArac}
      />
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-truss-text">Araçlarım</h2>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Araç ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-44 border-truss-border bg-truss-surface text-truss-text placeholder:text-truss-muted focus-visible:ring-truss-purple sm:w-56"
          />
          {openQuickFuelModal && (
            <Button
              type="button"
              onClick={openQuickFuelModal}
              variant="outline"
            >
              Hızlı Kayıt
            </Button>
          )}
          <Button
            type="button"
            onClick={openModal}
            className="bg-truss-purple font-bold text-truss-text shadow-md hover:bg-truss-purple-hover"
          >
            Yeni Araç Ekle
          </Button>
        </div>
      </div>

      {aktifFiltre !== 'tum' && (
        <div className="glass-card mb-4 flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium text-truss-muted">
            {aktifFiltre === 'tehlike' ? 'Bakımı geçen araçlar filtreleniyor.' : 'Evrak sorunu olan araçlar filtreleniyor.'}
          </p>
          <Button type="button" variant="ghost" onClick={() => setAktifFiltre('tum')} className="text-sm font-semibold">
            Filtreyi Temizle
          </Button>
        </div>
      )}

      {loading && (
        <div className="glass-card p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`dash-skel-card-${i}`} className="rounded-xl border border-truss-border p-4">
                <div className="skeleton-block mb-3 h-4 w-2/3 rounded" />
                <div className="skeleton-block h-8 w-1/2 rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-truss-border p-4">
            <div className="skeleton-block mb-4 h-5 w-40 rounded" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`dash-skel-item-${i}`} className="rounded-lg border border-truss-border p-4">
                  <div className="skeleton-block mb-2 h-4 w-20 rounded" />
                  <div className="skeleton-block mb-3 h-5 w-32 rounded" />
                  <div className="skeleton-block h-4 w-28 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive shadow-md">
          {error}
        </div>
      )}

       {!loading && !error && gosterilenAraclar.length === 0 && (
         <div className="glass-card p-8 text-center sm:p-12">
           <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-truss-surface">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-truss-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
           </div>
           <p className="mb-2 text-lg font-semibold text-truss-text">Henüz araç bulunmuyor</p>
           <p className="mx-auto max-w-sm text-sm text-truss-muted">Bu görünüm için araç kaydı bulunamadı. Yeni bir araç ekleyerek başlayın.</p>
         </div>
       )}

      {!loading && !error && gosterilenAraclar.length > 0 && (
        <div className="glass-card p-5 sm:p-6">
           <div className="mb-4 flex items-center justify-between border-b border-truss-border pb-3">
             <div>
               <p className="text-sm font-semibold uppercase tracking-wide text-truss-text">Araç Listesi</p>
               <p className="mt-1 text-xs text-truss-muted">Plaka, Marka ve Model bilgileri</p>
             </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const exportData = sortedAraclar.map((arac) => ({
                    Plaka: arac.plaka || '-',
                    Marka: arac.marka || '-',
                    Model: arac.model || '-',
                    Yıl: arac.yil || '-'
                  }));
                  exportToCSV(exportData, `araçlar_${new Date().toISOString().split('T')[0]}`);
                }}
              >
                📥 CSV İndir
              </Button>
            </div>
          </div>

           <div className="mb-4 hidden grid-cols-3 gap-6 border-b border-truss-border px-2 py-2 text-xs font-semibold text-truss-muted sm:grid">
             <button
               onClick={() => handleSortClick('plaka')}
               className="flex cursor-pointer items-center gap-1.5 text-left transition-colors duration-200 hover:text-truss-text"
             >
               Plaka
               {sortConfig.key === 'plaka' && <span className="text-truss-purple">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>}
             </button>
             <button
               onClick={() => handleSortClick('marka')}
               className="flex cursor-pointer items-center gap-1.5 text-left transition-colors duration-200 hover:text-truss-text"
             >
               Marka
               {sortConfig.key === 'marka' && <span className="text-truss-purple">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>}
             </button>
             <button
               onClick={() => handleSortClick('model')}
               className="flex cursor-pointer items-center gap-1.5 text-left transition-colors duration-200 hover:text-truss-text"
             >
               Model
               {sortConfig.key === 'model' && <span className="text-truss-purple">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>}
             </button>
           </div>

          <div key={`arac-list-${listMotionSeed}`} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedAraclar.map((arac, index) => (
              <div
                key={arac.arac_id || arac.id || arac.plaka}
                className="stagger-fade-in relative rounded-xl border border-truss-border bg-truss-surface p-5"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                 <div className="absolute right-3 top-3 flex items-center gap-2">
                   <Button
                     type="button"
                     onClick={() => navigate(`/arac/${arac.arac_id}`)}
                     variant="outline"
                     size="sm"
                   >
                     Detayları Gör
                   </Button>
                   <Button
                     type="button"
                     onClick={() => openEditModal(arac)}
                     variant="secondary"
                     size="sm"
                   >
                     Düzenle
                   </Button>
                   <Button
                     type="button"
                     variant="destructive"
                     size="sm"
                     onClick={() => setDeleteAracId(arac.arac_id)}
                   >
                     Sil
                   </Button>
                 </div>

                 <p className="mb-1 text-sm text-muted-foreground">Plaka</p>
                 <p className="mb-3 text-lg font-semibold text-foreground tabular-nums">{arac.plaka || '-'}</p>

                 <p className="mb-1 text-sm text-muted-foreground">Marka</p>
                 <p className="mb-3 text-foreground">{arac.marka || '-'}</p>

                 <p className="mb-1 text-sm text-muted-foreground">Model</p>
                 <p className="text-foreground">{arac.model || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default VehicleList;
