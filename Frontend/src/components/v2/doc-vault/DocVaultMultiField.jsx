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

export default function DocVaultMultiField({
  id = 'doc-vault-multi',
  label = 'Ek Belgeler',
  hint = 'En fazla 5 dosya · PDF, JPG, PNG veya WebP (maks. 10 MB)',
  accept = ACCEPT_ATTR,
  maxFiles = 5,
  items = [],
  uploading = false,
  error = null,
  disabled = false,
  readOnly = false,
  onSelectFile,
  onRemoveItem,
  onOpenItem,
  className,
}) {
  const inputRef = useRef(null);
  const canAddMore = !readOnly && items.length < maxFiles;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onSelectFile?.(file);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </Label>
        <Badge variant="outline" className="h-5 gap-1 px-1.5 font-mono text-[10px] tabular-nums">
          <Paperclip className="size-2.5 text-muted-foreground" aria-hidden="true" />
          <span>{items.length} / {maxFiles}</span>
        </Badge>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled || uploading || !canAddMore}
        onChange={handleFileChange}
        className="sr-only"
      />

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const isImage = item.mime_tipi?.startsWith('image/');
            const Icon = isImage ? ImageIcon : FileText;
            const itemKey = item.key || item.belge_id || item.nesne_anahtari;
            return (
              <li
                key={itemKey}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground" title={item.orijinal_ad}>
                      {item.orijinal_ad}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="font-mono tabular-nums">{formatBytes(item.boyut_bayt)}</span>
                      {item.isDraft && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                          Taslak
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!item.isDraft && item.canOpen !== false && onOpenItem && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onOpenItem(item)}
                      title="Belgeyi aç"
                      aria-label={`${item.orijinal_ad} belgesini aç`}
                      className="size-6 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="size-3" />
                    </Button>
                  )}
                  {!readOnly && item.canDelete !== false && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onRemoveItem?.(item)}
                      title="Belgeyi kaldır"
                      aria-label={`${item.orijinal_ad} belgesini kaldır`}
                      className="size-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canAddMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="h-9 w-full justify-start gap-2 border-dashed bg-background text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          {uploading ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
              <span>Dosya yükleniyor...</span>
            </>
          ) : (
            <>
              <Upload className="size-3.5 text-primary" aria-hidden="true" />
              <span>Belge Ekle ({items.length}/{maxFiles})</span>
            </>
          )}
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
