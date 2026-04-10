import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../services/authService';

const Register = () => {
    const [formData, setFormData] = useState({ ad_soyad: '', email: '', sifre: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await authService.register(formData);
            toast.success('Kayıt tamamlandı. Şimdi giriş yapabilirsiniz.');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Kayıt yapılamadı. Bilgilerinizi kontrol edin.');
        }
    };

    return (
        <div className="auth-stage animate-fade-in rounded-2xl px-4 py-10 sm:px-8 min-h-[calc(100vh-10rem)] flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-6 glass-card animate-scale-in">
                <h2 className="text-3xl font-extrabold text-center text-white">Kayıt Ol</h2>
                <p className="text-sm text-center text-slate-200">ABTS sistemine katılın</p>

                {error && <div className="p-3 text-sm text-white bg-rose-500/85 border border-rose-300/70 rounded-lg shadow-md">{error}</div>}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Ad Soyad"
                        className="neon-focus w-full px-4 py-3 border rounded-lg border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={(e) => setFormData({ ...formData, ad_soyad: e.target.value })}
                        required
                    />
                    <input
                        type="email"
                        placeholder="E-posta"
                        className="neon-focus w-full px-4 py-3 border rounded-lg border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Şifre"
                        className="neon-focus w-full px-4 py-3 border rounded-lg border-slate-400/60 dark:border-white/25 bg-white/95 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={(e) => setFormData({ ...formData, sifre: e.target.value })}
                        required
                    />
                    <button type="submit" className="w-full py-3 neo-btn font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md">
                        Kayıt İşlemini Tamamla
                    </button>
                </form>

                <div className="text-center mt-4">
                    <span className="text-sm text-slate-200">Zaten bir hesabın var mı? </span>
                    <Link to="/login" className="text-sm font-bold text-indigo-300 hover:text-indigo-200 hover:underline">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;