# TRUSS Tasarım Dili (Design System)
- Tema: Dinamik Açık/Koyu Tema Kararlılığı (Theme Stability) — `:root` (Light) ve `.dark` (Dark) modları `index.css` içindeki `--truss-*` CSS değişkenleriyle otomatik yönetilir.
- Ana Renk: SS Mor (`var(--truss-purple)` / `#8B5CF6`).
- DİKKAT: Standart Tailwind renk sınıfları (`bg-gray-900`, `text-white`, `purple-600` vb.), manuel `dark:` renk sınıfları ve sabit HEX kodları KESİNLİKLE YASAKTIR. Sadece `tailwind.config.js` içinde `var(--truss-*)` değişkenlerine bağlı olan `truss-*` token'ları (`bg-truss-bg`, `bg-truss-surface`, `text-truss-text`, `text-truss-muted`, `border-truss-border`, `bg-truss-purple`, `hover:bg-truss-purple-hover`) kullanılacaktır.
- Yoğunluk: Linear App tarzı kompakt tasarım zorunludur. `p-3.5`, `py-2.5`, `tabular-nums` class'ları standarttır.
- Yapı: Çift H1 başlıkları yasaktır. Üst barda (AppLayout) sayfa adı yazdığı için içerikte sadece aksiyon butonları (Toolbar) bulunur.
