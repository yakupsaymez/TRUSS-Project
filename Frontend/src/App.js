import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';
import AppLayout from '@/components/layout/AppLayout';
import HomePage from '@/pages/HomePage';
import Register from '@/pages/Register';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AracDetay from '@/pages/AracDetay.js';
import Settings from '@/pages/Settings.jsx';
import Vehicles from '@/pages/Vehicles.jsx';

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Router>
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
                    {/* Tam ekran rotalar — layout yok */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Uygulama içi rotalar — AppLayout (Sidebar + Header) */}
                    <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
                    <Route path="/arac/:id"    element={<AppLayout><AracDetay /></AppLayout>} />
                    <Route path="/vehicle/:id" element={<AppLayout><AracDetay /></AppLayout>} />
                    <Route path="/settings"    element={<AppLayout><Settings /></AppLayout>} />
                    <Route path="/vehicles"   element={<AppLayout><Vehicles /></AppLayout>} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;