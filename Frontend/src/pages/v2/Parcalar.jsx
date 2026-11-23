import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Parcalar() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Parça Ömür Matrisi</CardTitle>
          <CardDescription>Bileşen değişim aralıkları ve kalan ömür takibi (S7–S9)</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Parça Ömür Matrisi sonraki adımlarda etkinleştirilecektir.
        </CardContent>
      </Card>
    </div>
  );
}
