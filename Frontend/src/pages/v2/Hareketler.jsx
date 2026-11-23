import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Hareketler() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Yakıt & Bakım Hareketleri</CardTitle>
          <CardDescription>Yakıt ve periyodik bakım kayıtları (S5–S6)</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Hareketler tablosu sonraki adımlarda etkinleştirilecektir.
        </CardContent>
      </Card>
    </div>
  );
}
