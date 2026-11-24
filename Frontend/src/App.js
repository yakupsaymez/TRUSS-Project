import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';
import { Skeleton } from '@/components/ui/skeleton';
import useAuthStore from '@/store/useAuthStore';
import ChannelGuard from '@/components/v2/ChannelGuard';

const HomePage = lazy(() => import('@/pages/HomePage'));
const AppShell = lazy(() => import('@/components/v2/AppShell'));
const GenelBakis = lazy(() => import('@/pages/v2/GenelBakis'));
const Filo = lazy(() => import('@/pages/v2/Filo'));
const Harita = lazy(() => import('@/pages/v2/Harita'));
const Hareketler = lazy(() => import('@/pages/v2/Hareketler'));
const Parcalar = lazy(() => import('@/pages/v2/Parcalar'));
const Takvim = lazy(() => import('@/pages/v2/Takvim'));
const Ekip = lazy(() => import('@/pages/v2/Ekip'));
const Ayarlar = lazy(() => import('@/pages/v2/Ayarlar'));
const LoginV2 = lazy(() => import('@/pages/v2/LoginV2'));
const RegisterV2 = lazy(() => import('@/pages/v2/RegisterV2'));
const ForgotPasswordV2 = lazy(() => import('@/pages/v2/ForgotPasswordV2'));

function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="Sayfa yükleniyor"
      className="flex min-h-screen w-full flex-col gap-6 bg-background p-6 text-foreground"
    >
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

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
              backdropFilter: 'blur(8px)',
            },
          }}
        />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginV2 />} />
            <Route path="/register" element={<RegisterV2 />} />
            <Route path="/forgot-password" element={<ForgotPasswordV2 />} />
            <Route path="/v2/login" element={<Navigate to="/login" replace />} />
            <Route path="/v2/register" element={<Navigate to="/register" replace />} />
            <Route path="/v2/forgot-password" element={<Navigate to="/forgot-password" replace />} />
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
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
                path="harita"
                element={
                  <ChannelGuard channel="horizon">
                    <Harita />
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
                path="takvim"
                element={
                  <ChannelGuard channel="horizon">
                    <Takvim />
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
                  <Navigate to="/app" replace />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;