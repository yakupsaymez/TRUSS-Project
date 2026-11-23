import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Ekip() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ekip & Yetki</CardTitle>
          <CardDescription>Kullanıcı rolleri, yetki anahtarları ve araç zimmetleri (S10–S11)</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ekip & Yetki yönetimi sonraki adımlarda etkinleştirilecektir.
        </CardContent>
      </Card>
    </div>
  );
}
