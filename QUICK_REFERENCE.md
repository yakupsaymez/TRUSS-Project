# truss - Quick Reference Guide
## Faz 2 & 3 Features

**Print this guide for quick access!**

---

## 📋 File Locations

### Core Implementation Files
```
Frontend/src/
├── utils/
│   ├── formatters.js ................. Number/Text formatting utilities
│   └── exporter.js ................... CSV export & smart sorting
├── pages/
│   ├── Dashboard.js .................. Araç list with sorting & export
│   └── AracDetay.js .................. Bakım/Yakıt tables with sorting
└── components/
    └── Layout.js ..................... User preference summary card
```

### Documentation Files (in Project Root)
```
truss/
├── IMPLEMENTATION_GUIDE.md ........... Detailed feature guide (380 lines)
├── API_INTEGRATION_GUIDE.md .......... API specs & examples (400 lines)
├── FAZ_2_3_COMPLETION_REPORT.md ..... Completion report
└── QUICK_REFERENCE.md ............... This file
```

---

## 🎨 Feature Quick Links

### Faz 2: Form Ergonomics

| Feature | File | Function | Usage |
|---------|------|----------|-------|
| **Plate Masking** | formatters.js | `formatTurkishPlate()` | `<input onChange={e => formatTurkishPlate(e.target.value)}/>` |
| **Number Formatting** | formatters.js | `formatLocaleNumber()` | Format: `15000` → `15.000` |
| **Number Parsing** | formatters.js | `parseLocaleNumber()` | Parse: `15.000` → `15000` |
| **Currency Format** | formatters.js | `formatCurrency()` | `15000` → `15.000 TL` |
| **Preference Card** | Layout.js | useEffect + api.get() | Displays Dil/Para Birimi/Ölçü Birimi |
| **Modal Autofocus** | Dashboard/AracDetay | useRef + useEffect | First input auto-focused |
| **Enter Guard** | Dashboard/AracDetay | `handleFormEnterKeyDown()` | Enter submits, except textareas |

### Faz 3: Data Mastery

| Feature | File | Function | Usage |
|---------|------|----------|-------|
| **CSV Export** | exporter.js | `exportToCSV(data, filename)` | Click button → Download CSV |
| **Smart Sorting** | exporter.js | `sortByKey(data, key, order)` | Auto-detects number/date/string |
| **Dashboard Sort** | Dashboard.js | `handleSortClick()` + state | Click header → Toggle asc/desc |
| **Bakım/Yakıt Sort** | AracDetay.js | `sortByKey()` integration | Click button → Resort table |
| **Empty States** | Dashboard/AracDetay | Glass-card + icon + text | Shows when data.length === 0 |

---

## 💻 Common Code Snippets

### Import Formatters
```javascript
import { 
    formatLocaleNumber, 
    parseLocaleNumber, 
    formatCurrency, 
    formatTurkishPlate 
} from '../utils/formatters';
```

### Import Exporter
```javascript
import { exportToCSV, sortByKey } from '../utils/exporter';
```

### Format on Blur
```javascript
const handleBlur = (e) => {
    const parsed = parseLocaleNumber(e.target.value);
    if (parsed !== null) {
        setFormData(prev => ({
            ...prev,
            [name]: formatLocaleNumber(parsed, 2)
        }));
    }
};
```

### Parse on Submit
```javascript
const parsedValue = parseLocaleNumber(formData.tutar);
// Send to API: parsedValue (raw number)
```

### Export CSV
```javascript
const exportData = sortedList.map(item => ({
    Tarih: formatTarih(item.tarih),
    Tutar: item.tutar,
    KM: item.km
}));
exportToCSV(exportData, `export_${new Date().toISOString().split('T')[0]}`);
```

### Add Sorting to Component
```javascript
// 1. State
const [sortConfig, setSortConfig] = useState({ key: 'plaka', order: 'asc' });

// 2. Handler
const handleSort = (key) => {
    setSortConfig(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
};

// 3. Memoized data
const sorted = useMemo(() => {
    return sortByKey(data, sortConfig.key, sortConfig.order === 'asc');
}, [data, sortConfig]);

// 4. Clickable header
<button onClick={() => handleSort('plaka')}>
    Plaka {sortConfig.key === 'plaka' && (
        <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
    )}
</button>
```

---

## 🎯 Usage Examples

### Example 1: Add New Sortable Field
```javascript
// In Dashboard.js:
// 1. Add field to sortConfig (already has key: 'plaka', order: 'asc')
// 2. Add button in UI:
<button onClick={() => handleSortClick('yil')}>
    Yıl
    {sortConfig.key === 'yil' && (
        <span className="text-indigo-400">
            {sortConfig.order === 'asc' ? '↑' : '↓'}
        </span>
    )}
</button>
// Done! sortByKey() auto-detects type and sorts correctly
```

### Example 2: Export Custom Columns
```javascript
const handleExport = () => {
    const exportData = sortedAraclar.map(arac => ({
        Plaka: arac.plaka || '-',
        Marka: arac.marka || '-',
        Model: arac.model || '-',
        Yıl: arac.yil || '-',
        'Muayene Tarihi': arac.muayene_tarihi || '-'  // New column
    }));
    exportToCSV(exportData, `araçlar_${new Date().toISOString().split('T')[0]}`);
};
```

### Example 3: Auto-Mask Input Field
```javascript
<input
    type="text"
    placeholder="34 ABC 1234"
    value={formData.plaka}
    onChange={(e) => setFormData({
        ...formData,
        plaka: formatTurkishPlate(e.target.value)
    })}
/>
```

### Example 4: Format on Submit
```javascript
const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Parse formatted values back to raw numbers
    const parsedTutar = parseLocaleNumber(formData.tutar);
    const parsedKm = parseLocaleNumber(formData.km);
    
    // Send raw numbers to API
    await yakitService.yakitEkle({
        arac_id: Number(formData.arac_id),
        tutar: parsedTutar,  // e.g., 2275 (raw)
        km: parsedKm,        // e.g., 125500 (raw)
        tarih: formData.tarih
    });
};
```

---

## 🧪 Test Cases

### Plate Masking Test
```javascript
// Input → Expected Output
"34abc123" → "34 ABC 123" ✅
"34 ABC 1234" → "34 ABC 1234" ✅
"34ABC1234" → "34 ABC 1234" ✅
"34 a b c 1 2 3 4" → "34 ABC 1234" ✅
```

### Number Formatting Test
```javascript
// Input (on blur) → State Value → Displayed
"2275" → "2.275" → "2.275" ✅
"2,275" → "2.275" → "2.275" ✅
"2.275" → "2.275" → "2.275" ✅
"2275.50" → "2.275,50" → "2.275,50" ✅
```

### Sorting Test
```javascript
// Data type detection
[{km: 100}, {km: 1000}, {km: 10000}]
  → sortByKey(data, 'km', 'asc')
  → [100, 1000, 10000] ✅ (numeric, not lexicographic)

[{plaka: "35 ABC"}, {plaka: "34 ABC"}]
  → sortByKey(data, 'plaka', 'asc')
  → [34 ABC, 35 ABC] ✅ (Turkish collation)
```

### CSV Export Test
```javascript
exportToCSV(
    [{Plaka: "34 ABC", Maliyet: 1500}],
    "test"
)
// Result: test.csv with UTF-8 BOM
// Opening in Excel shows: Türkçe characters correctly ✅
```

---

## 🔴 Common Mistakes to Avoid

### ❌ Mistake 1: Sending Formatted Numbers to API
```javascript
// WRONG:
await api.post('/yakit', {
    tutar: "2.275"  // String, formatted
});

// CORRECT:
const parsed = parseLocaleNumber("2.275");  // → 2275
await api.post('/yakit', {
    tutar: parsed  // Number, raw
});
```

### ❌ Mistake 2: Forgetting useMemo Dependencies
```javascript
// WRONG:
const sorted = useMemo(() => {
    return sortByKey(data, sortConfig.key, order);
}, [data]); // Missing sortConfig!

// CORRECT:
const sorted = useMemo(() => {
    return sortByKey(data, sortConfig.key, order);
}, [data, sortConfig]);
```

### ❌ Mistake 3: Missing UTF-8 BOM in CSV
```javascript
// WRONG:
const csvContent = `${headers}\n${rows}`;
const blob = new Blob([csvContent], ...);

// CORRECT:
const bom = '\uFEFF';  // Don't forget!
const csvContent = `${headers}\n${rows}`;
const blob = new Blob([bom + csvContent], ...);
```

### ❌ Mistake 4: Not Handling Null Values
```javascript
// WRONG:
const sorted = sortByKey(data, key, order);
// Crashes if data has null values

// CORRECT:
// sortByKey() already handles null/undefined ✅
const sorted = sortByKey(data, key, order);
```

### ❌ Mistake 5: Formatting in onChange Instead of onBlur
```javascript
// WRONG (performance issue):
<input onChange={e => setData({
    ...data,
    tutar: formatLocaleNumber(e.target.value)  // Formats every keystroke
})}/>

// CORRECT:
<input 
    value={data.tutar}
    onChange={e => setData({...data, tutar: e.target.value})}
    onBlur={handleBlur}  // Format only when leaving field
/>
```

---

## 📊 Performance Tips

### Optimize with useMemo
```javascript
// Recalculates only when gosterilenAraclar or sortConfig changes
const sortedAraclar = useMemo(() => {
    return sortByKey(gosterilenAraclar, sortConfig.key, sortConfig.order === 'asc');
}, [gosterilenAraclar, sortConfig]);
```

### Don't Format on Every Keystroke
```javascript
// Bad: formatLocaleNumber called 10x per second
<input onChange={e => format(e.target.value)} />

// Good: Format only on blur
<input onBlur={handleBlur} />
```

### Use Memoized Handlers
```javascript
const handleSortClick = useCallback((key) => {
    setSortConfig(prev => ({...}));
}, []);  // No re-creation on every render
```

---

## 🌐 Supported Locales

**Turkish (tr-TR)**: ✅ Primary
- Collation: Correct Turkish alphabet order
- Number format: `15.000` (dot as thousands separator)
- Currency: `15.000 TL`
- Dates: DD Mmmm YYYY

**Other locales**: Custom implementation needed

---

## 🔗 Internal Dependencies

### No External Libraries Added ✅
- React 18+ (existing)
- React Router (existing)
- Tailwind CSS (existing)
- Recharts (existing, for charts)
- Toast notifications (existing)

### No New Dependencies Required
All Faz 2 & 3 features use only standard JavaScript and existing libraries.

---

## 📞 Troubleshooting

### Q: CSV export shows garbage characters
**A**: Check UTF-8 BOM is included: `const bom = '\uFEFF';`

### Q: Sorting not working
**A**: Check sortConfig is in dependencies: `}, [data, sortConfig])`

### Q: Number formatting showing [object Object]
**A**: Use `parseLocaleNumber()` then `formatLocaleNumber()`, not direct number

### Q: Plaka not masking
**A**: Check onChange calls `formatTurkishPlate()` on input

### Q: Modal not auto-focusing
**A**: Check `useRef` is applied to input and `useEffect` is implemented

### Q: Modal doesn't submit on Enter
**A**: Check `handleFormEnterKeyDown` is on form element, not button

---

## ✅ Pre-Deployment Checklist

- [ ] Run `npm run build` → 0 warnings ✅
- [ ] Test CSV export with Turkish characters
- [ ] Test sorting on all tables
- [ ] Test plate masking with edge cases
- [ ] Test number formatting with decimals
- [ ] Test modal Enter key behavior
- [ ] Test empty states visibility
- [ ] Test on mobile browsers
- [ ] Check build bundle size < 400kB

---

## 📚 Related Files

- **Detailed Guide**: `IMPLEMENTATION_GUIDE.md`
- **API Specs**: `API_INTEGRATION_GUIDE.md`
- **Completion Report**: `FAZ_2_3_COMPLETION_REPORT.md`

---

**Version**: 1.0  
**Updated**: 2026-04-12  
**Status**: ✅ Production Ready

Save this file and print it for quick reference!

