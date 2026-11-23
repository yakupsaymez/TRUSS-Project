import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';
import HomePage from '@/pages/HomePage';
import Register from '@/pages/Register';
import Login from '@/pages/Login';
import ChronoApp from '@/pages/ChronoBeta/ChronoApp';
import useAuthStore from '@/store/useAuthStore';
import AppShell from '@/components/v2/AppShell';
import ChannelGuard from '@/components/v2/ChannelGuard';
import GenelBakis from '@/pages/v2/GenelBakis';
import Filo from '@/pages/v2/Filo';
import Hareketler from '@/pages/v2/Hareketler';
import Parcalar from '@/pages/v2/Parcalar';
import Ekip from '@/pages/v2/Ekip';
import Ayarlar from '@/pages/v2/Ayarlar';

function ProtectedRoute({ children }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const token = useAuthStore((s) => s.token) || localStorage.getItem('token');

    if (!isAuthenticated && !token) {
        return <Navigate to="/login" replace />;
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
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/app"
                        element={
                            <ProtectedRoute>
                                <AppShell />
                            </ProtectedRoute>
                        }
                    >
                        <Route
                            index
                            element={
                                <ChannelGuard channel="horizon">
                                    <GenelBakis />
                                </ChannelGuard>
                            }
                        />
                        <Route
                            path="filo"
                            element={
                                <ChannelGuard channel="horizon">
                                    <Filo />
                                </ChannelGuard>
                            }
                        />
                        <Route
                            path="hareketler"
                            element={
                                <ChannelGuard channel="ledger">
                                    <Hareketler />
                                </ChannelGuard>
                            }
                        />
                        <Route
                            path="parcalar"
                            element={
                                <ChannelGuard channel="components">
                                    <Parcalar />
                                </ChannelGuard>
                            }
                        />
                        <Route
                            path="ekip"
                            element={
                                <ChannelGuard channel="crew">
                                    <Ekip />
                                </ChannelGuard>
                            }
                        />
                        <Route path="ayarlar" element={<Ayarlar />} />
                        <Route path="*" element={<Navigate to="/app" replace />} />
                    </Route>
                    <Route
                        path="*"
                        element={
                            <ProtectedRoute>
                                <ChronoApp />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;