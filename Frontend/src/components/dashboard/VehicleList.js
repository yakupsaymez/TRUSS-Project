import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportToCSV, sortByKey } from '@/utils/exporter';

const VehicleList = ({
  araclar,
  loading,
  error,
  aktifFiltre,
  setAktifFiltre,
  riskliAracIdler,
  listMotionSeed,
  navigate,
  openQuickFuelModal,
  openModal,
  openEditModal,
  handleDeleteArac
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'plaka', order: 'asc' });

  const gosterilenAraclar = useMemo(() => {
    if (aktifFiltre === 'tehlike') {
      const ids = new Set(riskliAracIdler.tehlike);
      return araclar.filter((arac) => ids.has(arac.arac_id));
    }
    if (aktifFiltre === 'evrak') {
      const ids = new Set(riskliAracIdler.evrak);
      return araclar.filter((arac) => ids.has(arac.arac_id));
    }
    return araclar;
  }, [aktifFiltre, araclar, riskliAracIdler.evrak, riskliAracIdler.tehlike]);

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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Araçlarım</h2>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Araç ara..."
            className="w-44 border-slate-400/60 bg-white/95 text-slate-900 placeholder:text-slate-600 focus-visible:ring-blue-500 sm:w-56 dark:border-white/25 dark:bg-slate-950/80 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          <Button
            type="button"
            onClick={openQuickFuelModal}
            variant="outline"
          >
            Hızlı Kayıt
          </Button>
          <Button
            type="button"
            onClick={openModal}
            className="bg-blue-600 font-bold text-white shadow-md hover:bg-blue-700"
          >
            Yeni Araç Ekle
          </Button>
        </div>
      </div>

      {aktifFiltre !== 'tum' && (
        <div className="glass-card mb-4 flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
              <div key={`dash-skel-card-${i}`} className="rounded-xl border border-white/15 p-4">
                <div className="skeleton-block mb-3 h-4 w-2/3 rounded" />
                <div className="skeleton-block h-8 w-1/2 rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/15 p-4">
            <div className="skeleton-block mb-4 h-5 w-40 rounded" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`dash-skel-item-${i}`} className="rounded-lg border border-white/15 p-4">
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
        <div className="rounded-lg border border-red-300/50 bg-red-950/40 p-4 text-center text-red-200 shadow-md">
          {error}
        </div>
      )}

       {!loading && !error && gosterilenAraclar.length === 0 && (
         <div className="glass-card p-8 text-center sm:p-12">
           <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-700/40">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
           </div>
           <p className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Henüz araç bulunmuyor</p>
           <p className="mx-auto max-w-sm text-sm text-slate-600 dark:text-slate-400">Bu görünüm için araç kaydı bulunamadı. Yeni bir araç ekleyerek başlayın.</p>
         </div>
       )}

      {!loading && !error && gosterilenAraclar.length > 0 && (
        <div className="glass-card p-5 sm:p-6">
           <div className="mb-4 flex items-center justify-between border-b border-white/20 pb-3">
             <div>
               <p className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">Araç Listesi</p>
               <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Plaka, Marka ve Model bilgileri</p>
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
                className="border-slate-400/60 bg-white/95 text-sm text-slate-900 shadow-md hover:bg-slate-100 dark:border-white/25 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                📥 CSV İndir
              </Button>
            </div>
          </div>

           <div className="mb-4 hidden grid-cols-3 gap-6 border-b border-white/10 px-2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 sm:grid">
             <button
               onClick={() => handleSortClick('plaka')}
               className="flex cursor-pointer items-center gap-1.5 text-left transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-200"
             >
               Plaka
               {sortConfig.key === 'plaka' && <span className="text-slate-700 dark:text-slate-300">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>}
             </button>
             <button
               onClick={() => handleSortClick('marka')}
               className="flex cursor-pointer items-center gap-1.5 text-left transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-200"
             >
               Marka
               {sortConfig.key === 'marka' && <span className="text-slate-700 dark:text-slate-300">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>}
             </button>
             <button
               onClick={() => handleSortClick('model')}
               className="flex cursor-pointer items-center gap-1.5 text-left transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-200"
             >
               Model
               {sortConfig.key === 'model' && <span className="text-slate-700 dark:text-slate-300">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>}
             </button>
           </div>

          <div key={`arac-list-${listMotionSeed}`} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedAraclar.map((arac, index) => (
              <div
                key={arac.arac_id || arac.id || arac.plaka}
                className="stagger-fade-in relative rounded-xl border border-slate-400/50 bg-white/95 p-5 dark:border-white/25 dark:bg-slate-900/80"
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
                     onClick={() => handleDeleteArac(arac.arac_id)}
                   >
                     Sil
                   </Button>
                 </div>

                 <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">Plaka</p>
                 <p className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{arac.plaka || '-'}</p>

                 <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">Marka</p>
                 <p className="mb-3 text-slate-700 dark:text-slate-300">{arac.marka || '-'}</p>

                 <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">Model</p>
                 <p className="text-slate-700 dark:text-slate-300">{arac.model || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default VehicleList;

