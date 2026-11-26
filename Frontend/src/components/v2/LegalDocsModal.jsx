import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSupportConfig } from '@/utils/supportConfig';

export default function LegalDocsModal({ open, onOpenChange, defaultTab = 'kvkk' }) {
  const { companyLegalName, email, companyAddress } = getSupportConfig();
  const controllerName = companyLegalName || 'TRUSS Kurumsal Filo Platformu İşletmecisi';
  const contactText = email
    ? `${email}${companyAddress ? ` (${companyAddress})` : ''}`
    : 'kurumsal sistem yöneticiniz veya yetkili destek kanalı';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border border-border bg-card text-foreground sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <span>
              <span className="text-foreground">TRU</span>
              <span className="text-primary">SS</span>
            </span>
            <span>Yasal Metinler ve Politikalar</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            6698 sayılı KVKK aydınlatma metni, veri güvenliği ilkeleri ve kurumsal hizmet koşulları.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kvkk" className="text-xs">KVKK (6698)</TabsTrigger>
            <TabsTrigger value="gizlilik" className="text-xs">Gizlilik & Güvenlik</TabsTrigger>
            <TabsTrigger value="kosullar" className="text-xs">Hizmet & SLA</TabsTrigger>
          </TabsList>

          <TabsContent value="kvkk" className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Veri Sorumlusu: {controllerName}</p>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) uyarınca; ad-soyad, kurumsal
              e-posta, rol/yetki bilgisi, araç zimmet ve operasyon kayıtları ile erişim logları yalnızca filo
              yönetimi, bilgi güvenliği ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir.
            </p>
            <p>
              Kişisel verileriniz; kiracı izolasyonu ilkesi gereği yalnızca yetkili organizasyonunuz bünyesinde
              erişilebilir olup üçüncü taraflarla hukuki zorunluluklar dışında paylaşılmaz.
            </p>
            <p>
              KVKK Madde 11 kapsamındaki bilgi talep, düzeltme ve silme başvurularınızı {contactText} üzerinden
              iletebilirsiniz.
            </p>
          </TabsContent>

          <TabsContent value="gizlilik" className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Veri Güvenliği ve Kiracı İzolasyonu</p>
            <p>
              TRUSS üzerinde tüm aktarım katmanları TLS ile şifrelenir; oturum anahtarları imzalı token ve
              sürüm denetimiyle korunur. Her kurumun filo, yakıt, bakım ve belge kayıtları mantıksal kiracı
              sınırlarıyla ayrıştırılır.
            </p>
            <p>
              Kritik mutasyonlar değiştirilemez denetim izine (audit log) kaydedilir. Destek taleplerinizde
              yalnızca hata teşhisi için gerekli sayfa yolu ve istek kimliği (Request-Id) işlenir.
            </p>
          </TabsContent>

          <TabsContent value="kosullar" className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Kurumsal Kullanım ve SLA Koşulları</p>
            <p>
              Platform erişimi yalnızca organizasyon yöneticisi tarafından yetkilendirilmiş aktif kullanıcılara
              açıktır. Yetkisiz erişim girişimleri ve otomatik tarama istekleri hız sınırlama politikalarıyla
              engellenir.
            </p>
            <p>
              Planlı bakım pencereleri dışında yüksek erişilebilirlik hedeflenir; kritik operasyon aksaklıkları
              uygulama içi Destek & Geri Bildirim paneli veya {contactText} üzerinden öncelikli olarak ele alınır.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
