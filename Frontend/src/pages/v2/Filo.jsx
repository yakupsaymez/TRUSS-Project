import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Filo() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filo</CardTitle>
          <CardDescription>Araç envanteri, sayaç ve evrak takibi (S3–S4)</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Filo tablosu sonraki adımlarda etkinleştirilecektir.
        </CardContent>
      </Card>
    </div>
  );
}
