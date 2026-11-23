import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function GenelBakis() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Genel Bakış</CardTitle>
          <CardDescription>Filo özet metrikleri ve maliyet analitiği (S12–S14)</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Genel Bakış ekranı sonraki adımlarda etkinleştirilecektir.
        </CardContent>
      </Card>
    </div>
  );
}
