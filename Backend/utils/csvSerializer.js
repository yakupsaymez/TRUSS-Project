const FORMULA_LEAD_RE = /^[\t\r\n ]*[=+\-@]/;
const CONTROL_LEAD_RE = /^[\t\r]/;
const NEEDS_QUOTE_RE = /[",\r\n]/;

function formatStringCell(val) {
  let s = val == null ? '' : String(val);
  if (FORMULA_LEAD_RE.test(s) || CONTROL_LEAD_RE.test(s)) {
    s = `'${s}`;
  }
  if (NEEDS_QUOTE_RE.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatNumberCell(val) {
  if (val == null || val === '') return '';
  const n = Number(val);
  return Number.isFinite(n) ? String(n) : '';
}

function serializeCsv(columns, rows = []) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new TypeError('CSV columns must be a non-empty array');
  }
  for (const col of columns) {
    if (!col || typeof col.key !== 'string' || typeof col.header !== 'string') {
      throw new TypeError('Each CSV column requires string header and key');
    }
    if (col.type !== 'string' && col.type !== 'number') {
      throw new TypeError(`Invalid CSV column type for "${col.key}": ${col.type}`);
    }
  }

  const headerLine = columns.map((col) => formatStringCell(col.header)).join(',');
  const dataLines = (Array.isArray(rows) ? rows : []).map((row) =>
    columns
      .map((col) => {
        const val = row ? row[col.key] : undefined;
        return col.type === 'number' ? formatNumberCell(val) : formatStringCell(val);
      })
      .join(',')
  );

  return `\uFEFF${[headerLine, ...dataLines].join('\r\n')}`;
}

module.exports = {
  serializeCsv,
  formatStringCell,
  formatNumberCell,
};
