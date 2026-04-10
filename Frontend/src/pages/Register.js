import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

const Register = () => {
    // 1. DÜZELTME: Backend'in beklediği gibi 'ad' yerine 'ad_soyad' yazıyoruz.
    const [formData, setFormData] = useState({ ad_soyad: '', email: '', sifre: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await authService.register(formData);
            alert('Kayıt başarıyla tamamlandı! Şimdi giriş yapabilirsiniz.');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Kayıt yapılamadı. Bilgilerinizi kontrol edin.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl rounded-2xl border border-gray-100">
                <h2 className="text-3xl font-extrabold text-center text-gray-800">Kayıt Ol</h2>
                <p className="text-sm text-center text-gray-500">ABTS sistemine katılın</p>

                {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Ad Soyad"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        // 2. DÜZELTME: Burayı da 'ad_soyad' olarak güncelledik.
                        onChange={(e) => setFormData({ ...formData, ad_soyad: e.target.value })}
                        required
                    />
                    <input
                        type="email"
                        placeholder="E-posta"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Şifre"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        onChange={(e) => setFormData({ ...formData, sifre: e.target.value })}
                        required
                    />
                    <button type="submit" className="w-full py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all">
                        Kayıt İşlemini Tamamla
                    </button>
                </form>

                <div className="text-center mt-4">
                    <span className="text-sm text-gray-600">Zaten bir hesabın var mı? </span>
                    <Link to="/login" className="text-sm font-bold text-blue-600 hover:underline">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;