import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Bakimlar from '@/pages/Bakimlar.jsx';
import ParcaTakip from '@/pages/ParcaTakip.jsx';
import Yakitlar from '@/pages/Yakitlar.jsx';
import Raporlar from '@/pages/Raporlar.jsx';
import EkipYonetimi from '@/pages/EkipYonetimi.jsx';
import useAuthStore from '@/store/useAuthStore';

const resolveUserRole = (user) => {
    if (user?.role) return user.role;
    try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser?.role) return storedUser.role;
    } catch { /* ignore */ }
    return 'FLEET_MANAGER';
};

function ProtectedRoute({ allowedRoles, children }) {
    const user = useAuthStore((s) => s.user);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const token = useAuthStore((s) => s.token) || localStorage.getItem('token');

    if (!isAuthenticated && !token) {
        return <Navigate to="/login" replace />;
    }

    const userRole = resolveUserRole(user);
    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

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
                    <Route path="/arac/:id"  element={<AppLayout><AracDetay /></AppLayout>} />
                    <Route path="/settings"  element={<AppLayout><Settings /></AppLayout>} />
                    <Route path="/vehicles"  element={<AppLayout><Vehicles /></AppLayout>} />
                    <Route path="/bakim"      element={<AppLayout><Bakimlar /></AppLayout>} />
                    <Route path="/bakimlar"   element={<AppLayout><Bakimlar /></AppLayout>} />
                    <Route path="/parcalar"   element={<AppLayout><ParcaTakip /></AppLayout>} />
                    <Route path="/parts"      element={<AppLayout><ParcaTakip /></AppLayout>} />
                    <Route path="/yakitlar"   element={<AppLayout><Yakitlar /></AppLayout>} />
                    <Route path="/yakit"      element={<AppLayout><Yakitlar /></AppLayout>} />

                    {/* Yalnızca FLEET_MANAGER ve SYSTEM_ADMIN erişimine açık rotalar */}
                    <Route
                        path="/raporlar"
                        element={
                            <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'SYSTEM_ADMIN']}>
                                <AppLayout><Raporlar /></AppLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/reports"
                        element={
                            <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'SYSTEM_ADMIN']}>
                                <AppLayout><Raporlar /></AppLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/ekip"
                        element={
                            <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'SYSTEM_ADMIN']}>
                                <AppLayout><EkipYonetimi /></AppLayout>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;