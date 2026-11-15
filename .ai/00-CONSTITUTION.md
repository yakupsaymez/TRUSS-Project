# TRUSS AI Anayasası
- Projenin adı TRUSS'tır. Eski isimler (ABTS) kullanılamaz.
- Kod yazarken "Zero-Yapping" (Sıfır Gevezelik) kuralı geçerlidir. Sadece talep edilen değişen kod verilir, açıklama yapılmaz.
- İlkel tarayıcı uyarıları (`window.confirm`, `alert`) kesinlikle yasaktır, yerine Shadcn `AlertDialog` kullanılacaktır.
- Backend'de N+1 sorgu katliamı yapılamaz; her zaman tek alt sorgu veya JOIN kullanılacaktır.
