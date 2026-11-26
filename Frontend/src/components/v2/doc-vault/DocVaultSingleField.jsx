import React, { useRef } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ACCEPT_ATTR = 'application/pdf,image/jpeg,image/png,image/webp';

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileLabel(value, draft) {
  if (draft?.orijinal_ad) return draft.orijinal_ad;
  if (!value) return '';
  const raw = String(value).trim();
  const parts = raw.split('/');
  return parts[parts.length - 1] || raw;
}

export default function DocVaultSingleField({
  id = 'doc-vault-single',
  label = 'Belge / Fatura Görseli',
  hint = 'PDF, JPG, PNG veya WebP · Maks. 10 MB',
  value = '',
  draft = null,
  uploading = false,
  error = null,
  disabled = false,
  canOpen = false,
  onSelectFile,
  onRemove,
  onOpen,
  className,
}) {
  const inputRef = useRef(null);
  const hasDoc = Boolean(draft || value);
  const isImage = draft?.mime_tipi?.startsWith('image/');
  const FileIcon = isImage ? ImageIcon : FileText;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onSelectFile?.(file);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </Label>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT_ATTR}
        disabled={disabled || uploading}
        onChange={handleFileChange}
        className="sr-only"
      />

      {uploading ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
          <span>Belge kasaya yükleniyor...</span>
        </div>
      ) : hasDoc ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground" title={getFileLabel(value, draft)}>
                {getFileLabel(value, draft)}
              </p>
              {draft ? (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="h-4 px-1 font-mono text-[10px]">
                    {draft.mime_tipi?.split('/')[1]?.toUpperCase() || 'DOSYA'}
                  </Badge>
                  <span className="font-mono tabular-nums">{formatBytes(draft.boyut_bayt)}</span>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Kayıtlı belge eki</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!draft && canOpen && onOpen && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onOpen}
                className="h-7 gap-1 px-2 text-[11px]"
              >
                <ExternalLink className="size-3" />
                <span>Aç</span>
              </Button>
            )}
            {!disabled && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => inputRef.current?.click()}
                  className="h-7 gap-1 px-2 text-[11px]"
                >
                  <Paperclip className="size-3" />
                  <span>Değiştir</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={onRemove}
                  aria-label="Belgeyi kaldır"
                  className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="h-9 w-full justify-start gap-2 border-dashed bg-background text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          <Upload className="size-3.5 text-primary" aria-hidden="true" />
          <span>Fatura / Belge Ekle (PDF, JPG, PNG, WebP)</span>
        </Button>
      )}

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
