import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DURUM_LABELS = { ACIK: 'Açık', INCELENIYOR: 'İnceleniyor', COZULDU: 'Çözüldü' };
const KATEGORI_LABELS = { HATA: 'Hata', ONERI: 'Öneri', DESTEK: 'Destek' };

function FeedbackRow({ item, isAdmin, isUpdating, onUpdateStatus }) {
  const [durum, setDurum] = useState(item.durum || 'ACIK');
  const [note, setNote] = useState(item.yonetici_notu || '');

  useEffect(() => {
    setDurum(item.durum || 'ACIK');
    setNote(item.yonetici_notu || '');
  }, [item.durum, item.yonetici_notu]);

  const createdLabel = item.olusturulma_tarihi ? String(item.olusturulma_tarihi).slice(0, 10) : '';

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-background p-3.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{KATEGORI_LABELS[item.kategori] || item.kategori}</Badge>
          <Badge variant={item.durum === 'COZULDU' ? 'secondary' : 'default'}>
            {DURUM_LABELS[item.durum] || item.durum}
          </Badge>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          #{item.id} · {createdLabel}
        </span>
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{item.baslik}</p>
        <p className="leading-relaxed text-muted-foreground">{item.mesaj}</p>
      </div>
      {(item.ad_soyad || item.org_ad || item.son_istek_id) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {item.ad_soyad && <span>Gönderen: {item.ad_soyad}</span>}
          {item.org_ad && <span>Kurum: {item.org_ad}</span>}
          {item.son_istek_id && <span className="font-mono tabular-nums">Req: {item.son_istek_id}</span>}
        </div>
      )}
      {!isAdmin && item.yonetici_notu && (
        <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-foreground">
          <span className="font-semibold">Yönetici Notu: </span>
          <span>{item.yonetici_notu}</span>
        </div>
      )}
      {isAdmin && (
        <div className="flex items-center gap-2 border-t border-border pt-2.5">
          <Select value={durum} onValueChange={setDurum} disabled={isUpdating}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACIK">Açık</SelectItem>
              <SelectItem value="INCELENIYOR">İnceleniyor</SelectItem>
              <SelectItem value="COZULDU">Çözüldü</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Yönetici notu"
            maxLength={500}
            disabled={isUpdating}
            className="h-8 flex-1 text-xs"
          />
          <Button
            type="button"
            size="sm"
            disabled={isUpdating}
            onClick={() => onUpdateStatus(item.id, durum, note)}
            className="h-8 shrink-0 px-3 text-xs"
          >
            {isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : 'Kaydet'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SupportAdminList({
  items, loading, error, isAdmin, filterDurum, filterKategori,
  onFilterDurumChange, onFilterKategoriChange, updatingId, onUpdateStatus, onRetry,
}) {
  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="grid grid-cols-2 gap-2">
          <Select value={filterDurum} onValueChange={onFilterDurumChange}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Durum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Durumlar</SelectItem>
              <SelectItem value="ACIK">Açık</SelectItem>
              <SelectItem value="INCELENIYOR">İnceleniyor</SelectItem>
              <SelectItem value="COZULDU">Çözüldü</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterKategori} onValueChange={onFilterKategoriChange}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Kategoriler</SelectItem>
              <SelectItem value="DESTEK">Destek</SelectItem>
              <SelectItem value="HATA">Hata</SelectItem>
              <SelectItem value="ONERI">Öneri</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Bildirimler yükleniyor...</span>
        </div>
      )}
      {!loading && error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span>{error}</span>
          <Button type="button" variant="ghost" size="xs" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-6 text-center text-xs text-muted-foreground">
          Henüz kayıtlı geri bildirim bulunmuyor.
        </p>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((item) => (
            <FeedbackRow
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              isUpdating={updatingId === item.id}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
