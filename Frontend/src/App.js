import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';
import HomePage from '@/pages/HomePage';
import Register from '@/pages/Register';
import Login from '@/pages/Login';
import ChronoApp from '@/pages/ChronoBeta/ChronoApp';
import useAuthStore from '@/store/useAuthStore';

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