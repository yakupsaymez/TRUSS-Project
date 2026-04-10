import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// İnşa Ettiğimiz Sayfalar (Pages)
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AracDetay from './pages/AracDetay.js';

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-50">
                <Routes>
                    {/* Kullanıcı ana siteye (/) girdiğinde onu kapıda bekletmeyip doğrudan Login'e yönlendiriyoruz */}
                    <Route path="/" element={<Navigate to="/login" />} />

                    {/* Açık Rotalar (Herkes girebilir) */}
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />

                    {/* Korumalı Rota (Sadece Token'ı olanlar Dashboard.js içindeki bekçiyi geçebilir) */}
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Araç detay sayfası rotası */}
                    <Route path="/arac/:id" element={<AracDetay />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;