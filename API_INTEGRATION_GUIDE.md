# ABTS - API & Integration Guide
## Faz 2 & Faz 3 Backend Integration

**Last Updated**: 2026-04-12  
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Required Backend Endpoints](#required-backend-endpoints)
2. [Frontend API Calls](#frontend-api-calls)
3. [Data Format Specifications](#data-format-specifications)
4. [Error Handling](#error-handling)
5. [Examples & Workflows](#examples--workflows)

---

## Required Backend Endpoints

### 1. User Preferences Endpoint

**Endpoint**: `GET /users/settings/preferences`

**Response Format**:
```json
{
    "success": true,
    "preferences": {
        "dil": "tr",
        "para_birimi": "TRY",
        "olcu_birimi": "km"
    }
}
```

**Usage**: Fetched by Layout.js to display preference summary card

**Error Handling**:
```javascript
try {
    const res = await api.get('/users/settings/preferences');
    const preferences = res.data?.preferences || {};
    // Use preferences for display
} catch (err) {
    // Keep defaults on error
    console.warn('Failed to load preferences:', err);
}
```

### 2. Vehicles Endpoint

**Endpoint**: `GET /arac` or `GET /araçlar`

**Response Format**:
```json
{
    "araclar": [
        {
            "arac_id": 1,
            "plaka": "34ABC1234",
            "marka": "Toyota",
            "model": "Corolla",
            "yil": 2020,
            "muayene_tarihi": "2026-05-15",
            "kasko_tarihi": "2026-06-20",
            "sigorta_tarihi": "2026-07-10"
        }
    ]
}
```

**Usage**: Dashboard.js uses this to populate vehicle list with sorting/export

**Expected Data Types**:
- `arac_id`: number (unique identifier)
- `plaka`: string (max 8 chars, no spaces - formatting done in frontend)
- `marka`: string (max 50 chars)
- `model`: string (max 50 chars)
- `yil`: number (4 digits)
- `*_tarihi`: ISO date string (YYYY-MM-DD)

### 3. Maintenance Records Endpoint

**Endpoint**: `GET /bakim/:arac_id` or similar

**Response Format**:
```json
{
    "bakimlar": [
        {
            "bakim_id": 1,
            "arac_id": 1,
            "bakim_tipi": "Periyodik Bakım",
            "tarih": "2025-12-01",
            "km": 125000,
            "maliyet": 1500,
            "notlar": "Yağ ve filtre değişimi yapıldı"
        }
    ]
}
```

**Usage**: AracDetay.js displays these in sortable table with export

**Expected Data Types**:
- `bakim_id`: number
- `arac_id`: number
- `bakim_tipi`: string (enum: Periyodik Bakım, Yağ Değişimi, etc.)
- `tarih`: ISO date string
- `km`: number (can be float)
- `maliyet`: number (currency in TRY)
- `notlar`: string (optional)

### 4. Fuel Records Endpoint

**Endpoint**: `GET /yakit/:arac_id` or similar

**Response Format**:
```json
{
    "yakitlar": [
        {
            "yakit_id": 1,
            "arac_id": 1,
            "yakit_tipi": "Benzin",
            "tarih": "2026-04-10",
            "litre": 45.5,
            "tutar": 2275,
            "km": 125500,
            "notlar": "Shell benzin istasyonu"
        }
    ]
}
```

**Usage**: AracDetay.js displays these in sortable table with export

**Expected Data Types**:
- `yakit_id`: number
- `arac_id`: number
- `yakit_tipi`: string (enum: Benzin, Dizel, LPG, Elektrik, etc.)
- `tarih`: ISO date string
- `litre`: number (float, decimal separator varies)
- `tutar`: number (currency in TRY)
- `km`: number
- `notlar`: string (optional)

---

## Frontend API Calls

### Service Layer (`Frontend/src/services/`)

All API calls should go through service files for consistency and error handling.

#### Example: aracService.js

```javascript
import api from './api';

const aracService = {
    // Get all vehicles
    getAraclar: async () => {
        const response = await api.get('/arac');
        return response.data.araclar || [];
    },

    // Add new vehicle
    aracEkle: async (data) => {
        // Data comes with formatted plaka, raw year
        const response = await api.post('/arac', {
            plaka: data.plaka, // Already formatted by frontend
            marka: data.marka,
            model: data.model,
            yil: Number(data.yil),
            muayene_tarihi: data.muayene_tarihi,
            kasko_tarihi: data.kasko_tarihi,
            sigorta_tarihi: data.sigorta_tarihi
        });
        return response.data;
    },

    // Update vehicle
    aracGuncelle: async (id, data) => {
        const response = await api.put(`/arac/${id}`, {
            plaka: data.plaka,
            marka: data.marka,
            model: data.model,
            yil: Number(data.yil),
            muayene_tarihi: data.muayene_tarihi,
            kasko_tarihi: data.kasko_tarihi,
            sigorta_tarihi: data.sigorta_tarihi
        });
        return response.data;
    },

    // Delete vehicle
    aracSil: async (id) => {
        const response = await api.delete(`/arac/${id}`);
        return response.data;
    }
};

export default aracService;
```

#### Example: yakitService.js

```javascript
import api from './api';

const yakitService = {
    // Get fuel records for vehicle
    getYakitlarByArac: async (aracId) => {
        const response = await api.get(`/yakit/${aracId}`);
        return response.data.yakitlar || [];
    },

    // Add fuel record
    yakitEkle: async (data) => {
        // Data comes with raw numbers (parsed by frontend)
        const response = await api.post('/yakit', {
            arac_id: Number(data.arac_id),
            yakit_tipi: data.yakit_tipi,
            tarih: data.tarih,
            litre: Number(data.litre),
            tutar: Number(data.tutar), // Raw number, not formatted
            km: Number(data.km),
            notlar: data.notlar || ''
        });
        return response.data;
    },

    // Delete fuel record
    yakitSil: async (yakitId) => {
        const response = await api.delete(`/yakit/${yakitId}`);
        return response.data;
    }
};

export default yakitService;
```

---

## Data Format Specifications

### Frontend Display vs API Communication

**Important Pattern**: Frontend stores formatted strings in UI, sends raw values to API

```javascript
// In form state
formData = {
    tutar: "2.275 TL",  // Display format
    km: "125.500"        // Display format
}

// On blur (formatting)
formData.tutar = formatLocaleNumber(parseLocaleNumber("2275"), 2);
// Result: "2.275"

// On submit (parsing back)
const parsed = parseLocaleNumber(formData.tutar);
// Result: 2275 (raw number for API)

// API receives
{
    tutar: 2275,  // Raw number
    km: 125500    // Raw number
}
```

### Turkish Locale Number Formatting

**Input Variants That Should Work**:
- `"15000"` → parsed to 15000, formatted to "15.000"
- `"15.000"` → parsed to 15000, formatted to "15.000"
- `"15,000"` → parsed to 15000, formatted to "15.000"
- `"15000.50"` → parsed to 15000.5, formatted to "15.000,50"
- `"15.000,50"` → parsed to 15000.5, formatted to "15.000,50"

**Implementation**:
```javascript
// parseLocaleNumber handles all variants
export const parseLocaleNumber = (value) => {
    const normalized = String(value ?? '')
        .trim()
        .replace(/\s/g, '')        // Remove spaces
        .replace(/\./g, '')        // Remove thousands separator
        .replace(',', '.')         // Convert comma to dot
        .replace(/[^0-9.-]/g, ''); // Keep only digits and signs

    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};
```

### Date Format Specifications

**API Format**: ISO 8601 (YYYY-MM-DD)
```
2026-04-12 ✅
2026-4-12 ❌
04/12/2026 ❌
12.04.2026 ❌
```

**HTML Input Format**: Uses native date input
```javascript
<input type="date" value={formData.tarih} />
// HTML date input handles local formatting
// Sends as: 2026-04-12 to JavaScript
```

**CSV Export Format**: Uses locale-aware `formatTarih()`
```javascript
const formatTarih = (date) => {
    return new Date(date).toLocaleDateString('tr-TR');
    // Result: "12 Nisan 2026"
};
```

---

## Error Handling

### Frontend Error Handling Strategy

```javascript
try {
    setLoading(true);
    setError(null);
    
    const data = await aracService.getAraclar();
    setAraclar(data);
    
} catch (err) {
    // Priority: API message > Generic message
    const errorMessage = 
        err?.response?.data?.message ||
        err?.message ||
        'Araçlar alınırken bir hata oluştu.';
    
    setError(errorMessage);
    toast.error(errorMessage);
    
} finally {
    setLoading(false);
}
```

### Common Error Scenarios

**Scenario 1: Unauthorized (401)**
```javascript
if (err?.response?.status === 401) {
    // Redirect to login
    navigate('/login');
}
```

**Scenario 2: Validation Error (400)**
```javascript
if (err?.response?.status === 400) {
    // Show validation errors
    const errors = err?.response?.data?.errors || {};
    Object.entries(errors).forEach(([field, message]) => {
        toast.error(`${field}: ${message}`);
    });
}
```

**Scenario 3: Server Error (500)**
```javascript
if (err?.response?.status >= 500) {
    toast.error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
}
```

---

## Examples & Workflows

### Workflow 1: Adding Vehicle with Auto-Formatted Plaka

```javascript
// 1. User enters plaka
<input 
    name="plaka"
    value={formData.plaka}
    onChange={(e) => {
        setFormData(prev => ({
            ...prev,
            plaka: formatTurkishPlate(e.target.value)
        }));
    }}
/>

// 2. Frontend displays formatted: "34 ABC 1234"
// 3. User submits form
const handleSubmit = async () => {
    // formData.plaka is "34 ABC 1234" (formatted)
    // But we need to check if API expects spaces or not
    
    await aracService.aracEkle({
        ...formData,
        // Some APIs might want: "34ABC1234" (no spaces)
        plaka: formData.plaka.replace(/\s/g, ''),
        yil: Number(formData.yil)
    });
};

// 4. API receives plaka without spaces (if needed)
// 5. On fetch, frontend re-formats it for display
// {arac_id: 1, plaka: "34ABC1234", ...}
// Displays as: "34 ABC 1234" (via formatTurkishPlate on render)
```

### Workflow 2: Exporting Sorted & Filtered Data

```javascript
// 1. User filters to "Bakımı Geçen Araçlar" (tehlike)
const gosterilenAraclar = useMemo(() => {
    if (aktifFiltre === 'tehlike') {
        return araclar.filter(a => riskliAracIdler.tehlike.includes(a.arac_id));
    }
    return araclar;
}, [aktifFiltre, araclar, riskliAracIdler]);

// 2. User clicks column header to sort by "Marka"
const handleSortClick = (key) => {
    setSortConfig(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
};

// 3. Data is sorted
const sortedAraclar = useMemo(() => {
    return sortByKey(gosterilenAraclar, sortConfig.key, sortConfig.order === 'asc');
}, [gosterilenAraclar, sortConfig]);

// 4. User clicks "CSV İndir"
const handleExport = () => {
    const exportData = sortedAraclar.map(arac => ({
        Plaka: arac.plaka || '-',
        Marka: arac.marka || '-',
        Model: arac.model || '-',
        Yıl: arac.yil || '-'
    }));
    exportToCSV(exportData, `araçlar_${new Date().toISOString().split('T')[0]}`);
};

// 5. Result: CSV file with only filtered (tehlike) vehicles, sorted by Marka
// File: araçlar_2026-04-12.csv
// Contains: Only risk vehicles, sorted alphabetically by brand
```

### Workflow 3: Number Formatting in Fuel Records

```javascript
// 1. Quick Fuel modal opens
const [quickFuelData, setQuickFuelData] = useState({
    tutar: '',
    km: ''
});

// 2. User types "2275" in Tutar field
const handleChange = (e) => {
    setQuickFuelData(prev => ({
        ...prev,
        [e.target.name]: e.target.value  // "2275"
    }));
};

// 3. User leaves field (onBlur)
const handleNumberBlur = (e) => {
    const { name, value } = e.target;  // "2275"
    if (!['tutar', 'km'].includes(name)) return;
    
    const parsed = parseLocaleNumber(value);  // → 2275
    if (parsed === null) return;
    
    const formatted = formatLocaleNumber(parsed, name === 'tutar' ? 2 : 0);
    // tutar: formatLocaleNumber(2275, 2) → "2.275"
    // km: formatLocaleNumber(2275, 0) → "2.275"
    
    setQuickFuelData(prev => ({
        ...prev,
        [name]: formatted  // "2.275"
    }));
};

// 4. User submits form
const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Parse back to raw numbers before sending to API
    const parsedTutar = parseLocaleNumber(quickFuelData.tutar);  // "2.275" → 2275
    const parsedKm = parseLocaleNumber(quickFuelData.km);      // "2.275" → 2275
    
    await yakitService.yakitEkle({
        arac_id: Number(quickFuelData.arac_id),
        tarih: quickFuelData.tarih,
        litre: parseLocaleNumber(quickFuelData.litre),
        tutar: parsedTutar,  // Raw: 2275
        km: parsedKm         // Raw: 2275
    });
};

// 5. API receives raw numbers
// 6. Data is persisted in database
// 7. On next fetch, backend returns same raw numbers
// 8. Frontend displays formatted: "2.275"
```

### Workflow 4: Sorting Bakım Table by KM

```javascript
// 1. AracDetay loads bakım records
const [bakimSortConfig, setBakimSortConfig] = useState({ 
    key: 'tarih', 
    order: 'desc' 
});

// 2. User clicks "KM" header
const handleKmClick = () => {
    setBakimSortConfig(prev => ({
        key: 'km',
        order: prev.key === 'km' && prev.order === 'asc' ? 'desc' : 'asc'
    }));
};

// 3. Data is sorted (sortByKey detects number type)
const sortedBakimlar = useMemo(() => {
    return sortByKey(bakimlar, bakimSortConfig.key, bakimSortConfig.order);
}, [bakimlar, bakimSortConfig]);

// 4. Display sorted data
{sortedBakimlar.map(bakim => (
    <div key={bakim.bakim_id}>
        <p>{bakim.km} KM - {formatPara(bakim.maliyet)}</p>
    </div>
))}

// 5. Optional: Export sorted data
const handleExport = () => {
    const exportData = sortedBakimlar.map(bakim => ({
        Tarih: formatTarih(bakim.tarih),
        KM: bakim.km,
        Maliyet_TL: bakim.maliyet
    }));
    exportToCSV(exportData, `bakimlar_${new Date().toISOString().split('T')[0]}`);
};
// Result: bakimlar_2026-04-12.csv (KM sorted ascending/descending)
```

---

## CSV Export Column Specifications

### Dashboard - Araç Listesi
| Column | Source | Format | Example |
|--------|--------|--------|---------|
| Plaka | arac.plaka | Raw | 34ABC1234 |
| Marka | arac.marka | Raw | Toyota |
| Model | arac.model | Raw | Corolla |
| Yıl | arac.yil | Raw | 2020 |

### AracDetay - Geçmiş Bakımlar
| Column | Source | Format | Example |
|--------|--------|--------|---------|
| Tarih | bakim.tarih | formatTarih() | 12 Nisan 2025 |
| Tip | bakim.bakim_tipi | Raw | Periyodik Bakım |
| KM | bakim.km | Raw | 125000 |
| Maliyet_TL | bakim.maliyet | Raw | 1500 |
| Notlar | bakim.notlar | Raw | Yağ değişimi |

### AracDetay - Geçmiş Yakıt Kayıtları
| Column | Source | Format | Example |
|--------|--------|--------|---------|
| Tarih | yakit.tarih | formatTarih() | 12 Nisan 2026 |
| Tip | yakit.yakit_tipi | Raw | Benzin |
| Litre | yakit.litre | Raw | 45.5 |
| Tutar_TL | yakit.tutar | Raw | 2275 |
| KM | yakit.km | Raw | 125500 |
| Notlar | yakit.notlar | Raw | Shell istasyonu |

---

## Integration Checklist

### Before Going Live

- [ ] All endpoints return correct status codes (200, 400, 401, 500)
- [ ] All endpoints return data in specified JSON format
- [ ] Date fields are ISO format (YYYY-MM-DD)
- [ ] Number fields are actual numbers (not strings)
- [ ] Foreign keys are properly validated
- [ ] CORS is configured for frontend domain
- [ ] Authorization headers are required and validated
- [ ] Rate limiting is in place
- [ ] Logging is configured for debugging
- [ ] Database migrations are applied
- [ ] CSV export UTF-8 BOM is handled on frontend ✅
- [ ] Error responses have consistent format

### Performance Checklist

- [ ] Database queries are indexed on sort columns (tarih, km, plaka, etc.)
- [ ] API responses are paginated if > 1000 records
- [ ] Response times < 500ms for typical data sizes
- [ ] No N+1 queries in vehicle list endpoint
- [ ] Compression is enabled (gzip)

---

## Troubleshooting

### Issue: "Invalid plaka format"
**Check**: API validation for plaka field
- Should accept with or without spaces
- Should normalize to uppercase
- Should validate pattern: digits(1-2) + letters(1-3) + digits(1-4)

### Issue: "Numbers showing as strings in export"
**Check**: Ensure API returns numbers, not strings
```javascript
// API response should be:
{ km: 125000 }  // number

// NOT:
{ km: "125000" } // string
```

### Issue: "CSV file corrupt or unreadable"
**Check**: UTF-8 BOM is included
```javascript
const bom = '\uFEFF'; // Must be first byte
const fullContent = bom + csvContent;
```

---

## Version Compatibility

| Component | Supported Version | Notes |
|-----------|-------------------|-------|
| React | 18+ | Uses useMemo, useCallback |
| React Router | 6+ | useNavigate, useParams |
| Tailwind | 3+ | Utility classes used |
| Node.js | 14+ | Frontend build |
| Browser Support | Modern | ES6+ features |

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-12  
**Next Review**: 2026-05-12


