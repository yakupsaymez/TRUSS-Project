/**
 * Converts JSON array to CSV format with UTF-8 BOM for proper Turkish character handling
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Output filename (without extension)
 * @param {Array} headers - Optional custom headers; if not provided, uses object keys
 */
export const exportToCSV = (data, filename = 'export', headers = null) => {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn('exportToCSV: No data to export');
        return;
    }

    // Determine headers from data keys if not provided
    const columnHeaders = headers || Object.keys(data[0]);

    // Convert header row
    const headerRow = columnHeaders
        .map((h) => `"${String(h).replace(/"/g, '""')}"`)
        .join(',');

    // Convert data rows
    const dataRows = data.map((row) =>
        columnHeaders
            .map((header) => {
                const value = row[header];
                const strValue = String(value ?? '');
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const escaped = strValue.replace(/"/g, '""');
                return /[,"\n]/.test(escaped) ? `"${escaped}"` : escaped;
            })
            .join(',')
    );

    // UTF-8 BOM for Excel/Turkish character support
    const bom = '\uFEFF';
    const csvContent = [headerRow, ...dataRows].join('\n');
    const fullContent = bom + csvContent;

    // Create Blob and trigger download
    const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = `${filename}.csv`;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
};

/**
 * Sorts an array of objects by a given key in ascending or descending order
 * @param {Array} data - Array of objects
 * @param {string} key - Property key to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export const sortByKey = (data, key, order = 'asc') => {
    if (!Array.isArray(data)) return data;

    const sorted = [...data].sort((a, b) => {
        let aVal = a[key];
        let bVal = b[key];

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return order === 'asc' ? 1 : -1;
        if (bVal == null) return order === 'asc' ? -1 : 1;

        // Number comparison
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return order === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Date string comparison (ISO format or standard date)
        if (aVal instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(aVal))) {
            const aDate = new Date(aVal);
            const bDate = new Date(bVal);
            if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
                return order === 'asc' ? aDate - bDate : bDate - aDate;
            }
        }

        // String comparison (case-insensitive)
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (order === 'asc') {
            return aStr.localeCompare(bStr, 'tr-TR');
        } else {
            return bStr.localeCompare(aStr, 'tr-TR');
        }
    });

    return sorted;
};

