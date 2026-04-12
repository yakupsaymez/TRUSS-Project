export const parseLocaleNumber = (value) => {
    const normalized = String(value ?? '')
        .trim()
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '');

    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatLocaleNumber = (value, maximumFractionDigits = 0) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '';

    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 0,
        maximumFractionDigits
    }).format(numericValue);
};

export const formatCurrency = (value, options = {}) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '-';

    const { locale = 'tr-TR', maximumFractionDigits = 0, suffix = 'TL' } = options;
    const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits
    }).format(numericValue);

    return `${formatted} ${suffix}`;
};

export const formatTurkishPlate = (value) => {
    const normalized = String(value ?? '')
        .toLocaleUpperCase('tr-TR')
        .replace(/\s+/g, '')
        .replace(/[^0-9A-Z]/g, '');

    if (!normalized) return '';

    const cityMatch = normalized.match(/^\d{1,2}/);
    if (!cityMatch) {
        // Graceful fallback for non-standard entries without city code.
        return normalized.slice(0, 8);
    }

    const cityCode = cityMatch[0];
    const afterCity = normalized.slice(cityCode.length);

    const lettersMatch = afterCity.match(/^[A-Z]{1,3}/);
    const letters = lettersMatch ? lettersMatch[0] : '';

    const numbers = afterCity
        .slice(letters.length)
        .replace(/\D/g, '')
        .slice(0, 4);

    const segments = [cityCode];
    if (letters) segments.push(letters);
    if (numbers) segments.push(numbers);

    return segments.join(' ').trim();
};

