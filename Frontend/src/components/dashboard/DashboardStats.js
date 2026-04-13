import React from 'react';

const DashboardStats = ({ filoOzeti, setAktifFiltre, formatTahminTL }) => {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <button
        type="button"
        onClick={() => setAktifFiltre('tehlike')}
        className="interactive-card glass-card p-4 text-left shadow-md transition-transform duration-300 hover:scale-[1.01]"
      >
        <p className="text-sm font-medium text-slate-50">Bakımı Geçen Araçlar</p>
        <p className="mt-2 text-3xl font-bold text-rose-400">{filoOzeti.tehlike}</p>
      </button>

      <div className="glass-card p-4 shadow-md">
        <p className="text-sm font-medium text-slate-50">Bakımı Yaklaşan Araçlar</p>
        <p className="mt-2 text-3xl font-bold text-amber-400">{filoOzeti.uyari}</p>
      </div>

      <div className="glass-card p-4 shadow-md">
        <p className="text-sm font-medium text-slate-50">Sorunsuz Araçlar</p>
        <p className="mt-2 text-3xl font-bold text-emerald-400">{filoOzeti.sorunsuz}</p>
      </div>

      <button
        type="button"
        onClick={() => setAktifFiltre('evrak')}
        className="interactive-card glass-card p-4 text-left shadow-md transition-transform duration-300 hover:scale-[1.01]"
      >
        <p className="text-sm font-medium text-slate-50">Evrakları Yaklaşan/Biten</p>
        <p className="mt-2 text-3xl font-bold text-amber-400">{filoOzeti.evrakSorunu}</p>
      </button>

      <div className="glass-card p-4">
        <p className="text-sm font-medium text-slate-50">Tahmini Gelecek Ay Gideri</p>
        <p className="mt-2 text-2xl font-bold text-indigo-300">{formatTahminTL(filoOzeti.gelecekAyTahmin)}</p>
      </div>
    </section>
  );
};

export default DashboardStats;

