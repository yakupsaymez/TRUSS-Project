import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/Layout';
import LandingPage from '@/pages/LandingPage';

// İnşa Ettiğimiz Sayfalar (Pages)
import Register from '@/pages/Register';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AracDetay from '@/pages/AracDetay.js';

function App() {
    return (
        <Router>
            <div className="min-h-screen">
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: 'var(--toast-bg)',
                            color: 'var(--toast-text)',
                            border: '1px solid var(--toast-border)',
                            backdropFilter: 'blur(8px)'
                        }
                    }}
                />
                <Routes>
                    <Route path="/" element={<LandingPage />} />

                    {/* Açık Rotalar (Herkes girebilir) */}
                    <Route path="/register" element={<Layout><Register /></Layout>} />
                    <Route path="/login" element={<Layout><Login /></Layout>} />

                    {/* Korumalı Rota (Sadece Token'ı olanlar Dashboard.js içindeki bekçiyi geçebilir) */}
                    <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />

                    {/* Araç detay sayfası rotası */}
                    <Route path="/arac/:id" element={<Layout><AracDetay /></Layout>} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;