import React from 'react';
import { AlertTriangle, Check, Copy, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLastRequestId } from '@/services/api';
import { getSupportConfig } from '@/utils/supportConfig';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, copied: false };
    this.copyTimer = null;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Sessiz yakalama; hassas stack trace kullanıcıya gösterilmez.
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, copied: false });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.copyTimer);
  }

  handleCopyRequestId = async (requestId) => {
    if (!requestId) return;
    try {
      await navigator.clipboard?.writeText(requestId);
      this.setState({ copied: true });
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      this.setState({ copied: false });
    }
  };

  handleRecover = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const requestId = getLastRequestId();
    const { email, phone } = getSupportConfig();

    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10 text-foreground">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold tracking-tight">
              <span className="text-foreground">TRU</span>
              <span className="text-primary">SS</span>
            </span>
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">Beklenmeyen bir görünüm hatası oluştu</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Verileriniz güvende. Sayfayı kurtarmayı deneyebilir veya ana ekrana dönebilirsiniz.
            </p>
          </div>

          {requestId && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
              <span className="truncate font-mono text-muted-foreground tabular-nums">
                İstek Kodu: <strong className="text-foreground">{requestId}</strong>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => this.handleCopyRequestId(requestId)}
                className="h-6 shrink-0 gap-1 px-2"
              >
                {this.state.copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                <span>{this.state.copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </Button>
            </div>
          )}

          {(email || phone) && (
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              Destek: {[email, phone].filter(Boolean).join(' · ')}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={this.handleRecover} className="flex-1 gap-1.5">
              <RefreshCw className="size-3.5" aria-hidden="true" />
              <span>Sayfayı Kurtar</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.assign('/app')}
              className="gap-1.5"
            >
              <Home className="size-3.5" aria-hidden="true" />
              <span>Panele Dön</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
