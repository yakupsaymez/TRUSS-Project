import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import aracService from '../services/aracService';

const Dashboard = () => {
    const navigate = useNavigate();

    const [araclar, setAraclar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        plaka: '',
        marka: '',
        model: '',
        yil: ''
    });
    const [modalError, setModalError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchAraclar = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await aracService.getAraclar();
            const aracListesi = Array.isArray(data) ? data : (data?.araclar || []);
            setAraclar(aracListesi);
        } catch (err) {
            const hataMesaji =
                err?.response?.data?.message ||
                err?.message ||
                'Araçlar alınırken bir hata oluştu.';
            setError(hataMesaji);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        fetchAraclar();
    }, [navigate, fetchAraclar]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const openModal = () => {
        setModalError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalError(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddArac = async (e) => {
        e.preventDefault();
        setModalError(null);

        if (!formData.plaka || !formData.marka || !formData.model || !formData.yil) {
            setModalError('Lütfen tüm alanları doldurun.');
            return;
        }

        try {
            setIsSubmitting(true);

            await aracService.aracEkle({
                ...formData,
                yil: Number(formData.yil)
            });

            setFormData({
                plaka: '',
                marka: '',
                model: '',
                yil: ''
            });
            closeModal();
            await fetchAraclar();
        } catch (err) {
            const hataMesaji =
                err?.response?.data?.message ||
                err?.message ||
                'Araç eklenirken bir hata oluştu.';
            setModalError(hataMesaji);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteArac = async (aracId) => {
        // Kullanıcının yanlışlıkla silme yapmaması için önce onay alıyoruz.
        const onaylandiMi = window.confirm('Bu aracı silmek istediğinize emin misiniz?');
        if (!onaylandiMi) return;

        try {
            setError(null);
            await aracService.aracSil(aracId);
            // Silme başarılı olursa araç listesini tekrar çekip ekranı güncelliyoruz.
            await fetchAraclar();
        } catch (err) {
            const hataMesaji =
                err?.response?.data?.message ||
                err?.message ||
                'Araç silinirken bir hata oluştu.';
            setError(hataMesaji);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
                        ABTS - Araç Takip
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Araçlarım</h2>
                    <button
                        onClick={openModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200"
                    >
                        Yeni Araç Ekle
                    </button>
                </div>

                {loading && (
                    <div className="bg-white shadow-md rounded-lg p-8 text-center">
                        <p className="text-gray-700 text-lg font-medium">Araçlarınız yükleniyor...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 shadow-md rounded-lg p-4 text-center">
                        {error}
                    </div>
                )}

                {!loading && !error && araclar.length === 0 && (
                    <div className="bg-white shadow-md rounded-lg p-8 text-center">
                        <p className="text-gray-600">Henüz kayıtlı aracınız bulunmamaktadır.</p>
                    </div>
                )}

                {!loading && !error && araclar.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {araclar.map((arac) => (
                            <div
                                key={arac.arac_id || arac.id || arac.plaka}
                                className="relative bg-white shadow-md rounded-lg p-5 border border-gray-100"
                            >
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/arac/${arac.arac_id}`)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors duration-200"
                                    >
                                        Detayları Gör
                                    </button>
                                    <button
                                        onClick={() => handleDeleteArac(arac.arac_id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors duration-200"
                                    >
                                        Sil
                                    </button>
                                </div>

                                <p className="text-sm text-gray-500 mb-1">Plaka</p>
                                <p className="text-lg font-semibold text-gray-800 mb-3">
                                    {arac.plaka || '-'}
                                </p>

                                <p className="text-sm text-gray-500 mb-1">Marka</p>
                                <p className="text-gray-700 mb-3">{arac.marka || '-'}</p>

                                <p className="text-sm text-gray-500 mb-1">Model</p>
                                <p className="text-gray-700">{arac.model || '-'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Yeni Araç Ekle</h3>

                        {modalError && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleAddArac} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plaka</label>
                                <input
                                    type="text"
                                    name="plaka"
                                    value={formData.plaka}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="34 ABC 123"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                                <input
                                    type="text"
                                    name="marka"
                                    value={formData.marka}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Toyota"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Corolla"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
                                <input
                                    type="number"
                                    name="yil"
                                    value={formData.yil}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="2020"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors duration-200"
                                >
                                    {isSubmitting ? 'Ekleniyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
