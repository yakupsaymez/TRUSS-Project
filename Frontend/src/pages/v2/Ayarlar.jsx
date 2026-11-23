import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Ayarlar() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ayarlar</CardTitle>
          <CardDescription>Genel tercihler, profil, güvenlik ve bildirimler (S19)</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ayarlar ekranı S19 adımında etkinleştirilecektir.
        </CardContent>
      </Card>
    </div>
  );
}
