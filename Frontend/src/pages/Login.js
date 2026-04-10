import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../services/authService';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', sifre: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await authService.login(formData);
            toast.success('Giris basarili.');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Giris yapilamadi. Bilgilerinizi kontrol edin.');
        }
    };

    return (
        <div className="auth-stage animate-fade-in rounded-2xl px-4 py-10 sm:px-8 min-h-[calc(100vh-10rem)] flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-6 glass-card animate-scale-in">
                <h2 className="text-3xl font-extrabold text-center text-white">Giriş Yap</h2>
                <p className="text-sm text-center text-slate-200">ABTS sistemine hoş geldiniz</p>

                <form className="space-y-4" onSubmit={handleSubmit}>
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
                    <button type="submit" className="w-full py-3 neo-btn text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md">
                        Giriş Yap
                    </button>
                </form>

                <div className="text-center mt-4">
                    <span className="text-sm text-slate-200">Henüz hesabın yok mu? </span>
                    <Link to="/register" className="text-sm font-bold text-indigo-300 hover:text-indigo-200 hover:underline">
                        Kayıt Ol
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;