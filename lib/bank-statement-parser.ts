/**
 * Bank Statement Parser
 * Dynamically maps CSV columns based on header names.
 * Validates and sanitizes input to prevent malicious content.
 */

export interface BankTransaction {
  id: string;
  date: string;       // YYYY-MM-DD
  description: string;
  amount: number;      // negative = debit/expense, positive = credit
  type: 'debit' | 'credit';
  classification: 'business' | 'personal' | 'partial' | 'unclassified';
  businessPercent: number;
  notes: string;
}

export interface ParseResult {
  success: boolean;
  transactions: BankTransaction[];
  errors: string[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

const MALICIOUS_PATTERNS = [
  /^=/, /^\+/, /^@/, /^-[A-Z]/i, /\|/, /<script/i, /javascript:/i, /on\w+\s*=/i,
];

function sanitizeCell(cell: string): string {
  const trimmed = cell.trim().replace(/^["']|["']$/g, '');
  if (/^-?\d/.test(trimmed)) return trimmed;
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) return '';
  }
  return trimmed;
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { cells.push(current); current = ''; continue; }
    current += ch;
  }
  cells.push(current);
  return cells.map(sanitizeCell);
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  // DD/MM/YYYY
  const dmy4 = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy4) return `${dmy4[3]}-${dmy4[2].padStart(2, '0')}-${dmy4[1].padStart(2, '0')}`;
  // DD/MM/YY
  const dmy2 = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (dmy2) {
    const yr = parseInt(dmy2[3]);
    return `${yr >= 80 ? '19' : '20'}${dmy2[3]}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Header pattern matchers — maps semantic role to regex patterns
const HEADER_ROLES = {
  date: /^(date|trans(action)?\s*date|posted\s*date|processed\s*date|value\s*date)$/i,
  amount: /^(amount|value|sum|total)$/i,
  debit: /^(debit|withdrawal|dr|money\s*out)$/i,
  credit: /^(credit|deposit|cr|money\s*in)$/i,
  description: /^(desc(ription)?|detail(s)?|narration|memo|narrative|transaction|statement\s*details?)$/i,
  payee: /^(payee|pay(ee)?\s*name|other\s*party|merchant|vendor|recipient|beneficiary)$/i,
  particulars: /^(particulars?|particular)$/i,
  code: /^(code)$/i,
  reference: /^(ref(erence)?|cheque|check)$/i,
  type: /^(type|tran(s(action)?)?\s*type|kind)$/i,
};

type Role = keyof typeof HEADER_ROLES;

function mapHeaders(headers: string[]): Map<Role, number[]> {
  const mapping = new Map<Role, number[]>();
  headers.forEach((h, i) => {
    const normalized = h.trim();
    for (const [role, pattern] of Object.entries(HEADER_ROLES)) {
      if (pattern.test(normalized)) {
        const existing = mapping.get(role as Role) || [];
        existing.push(i);
        mapping.set(role as Role, existing);
      }
    }
  });
  return mapping;
}

function extractDate(cols: string[], map: Map<Role, number[]>): string | null {
  // Try mapped date column first
  for (const idx of map.get('date') || []) {
    const d = parseDate(cols[idx] || '');
    if (d) return d;
  }
  // Fallback: scan all columns for a date-like value
  for (const col of cols) {
    const d = parseDate(col);
    if (d) return d;
  }
  return null;
}

function extractAmount(cols: string[], map: Map<Role, number[]>): number | null {
  // Single amount column
  for (const idx of map.get('amount') || []) {
    const a = parseAmount(cols[idx] || '');
    if (a != null) return a;
  }
  // Separate debit/credit columns
  const debitIdxs = map.get('debit') || [];
  const creditIdxs = map.get('credit') || [];
  if (debitIdxs.length || creditIdxs.length) {
    for (const idx of debitIdxs) {
      const a = parseAmount(cols[idx] || '');
      if (a != null && a !== 0) return -Math.abs(a);
    }
    for (const idx of creditIdxs) {
      const a = parseAmount(cols[idx] || '');
      if (a != null && a !== 0) return Math.abs(a);
    }
  }
  // Fallback: last column that looks like a number
  for (let i = cols.length - 1; i >= 0; i--) {
    const a = parseAmount(cols[i] || '');
    if (a != null && cols[i].match(/^-?[\d$.,()]+$/)) return a;
  }
  return null;
}

function extractDescription(cols: string[], map: Map<Role, number[]>, headers: string[]): string {
  // Collect from description-like columns in priority order
  const parts: string[] = [];
  for (const role of ['payee', 'description', 'particulars', 'code', 'reference'] as Role[]) {
    for (const idx of map.get(role) || []) {
      const val = cols[idx]?.trim();
      if (val && !/^\d+$/.test(val) && !parts.includes(val)) parts.push(val);
    }
  }
  if (parts.length) return parts.join(' ').substring(0, 200);

  // Fallback: grab non-date, non-amount text columns
  const dateIdxs = new Set(map.get('date') || []);
  const amountIdxs = new Set([...(map.get('amount') || []), ...(map.get('debit') || []), ...(map.get('credit') || [])]);
  for (let i = 0; i < cols.length; i++) {
    if (dateIdxs.has(i) || amountIdxs.has(i)) continue;
    const val = cols[i]?.trim();
    if (val && !/^-?[\d$.,()]+$/.test(val) && !parseDate(val)) parts.push(val);
  }
  return parts.join(' ').substring(0, 200) || 'Unknown transaction';
}

export function validateFile(file: File): string[] {
  const errors: string[] = [];
  if (file.size > MAX_FILE_SIZE) errors.push('File exceeds 5MB limit');
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'csv') errors.push('Only CSV files are supported');
  if (file.type && !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.type))
    errors.push('Invalid file type');
  return errors;
}

export function parseStatement(content: string): ParseResult {
  const errors: string[] = [];
  const lines = content.split(/\r?\n/).filter(l => l.trim());

  if (lines.length < 2) return { success: false, transactions: [], errors: ['File has no data rows'] };
  if (lines.length > MAX_ROWS + 1) return { success: false, transactions: [], errors: [`Too many rows (max ${MAX_ROWS})`] };

  const headers = parseCSVLine(lines[0]);
  const map = mapHeaders(headers);

  const transactions: BankTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.every(c => !c)) continue;

    const date = extractDate(cols, map);
    const amount = extractAmount(cols, map);
    const description = extractDescription(cols, map, headers);

    if (!date) { errors.push(`Row ${i + 1}: invalid date`); continue; }
    if (amount == null) { errors.push(`Row ${i + 1}: invalid amount`); continue; }

    transactions.push({
      id: `txn-${i}-${Date.now()}`,
      date,
      description,
      amount,
      type: amount < 0 ? 'debit' : 'credit',
      classification: 'unclassified',
      businessPercent: 100,
      notes: '',
    });
  }

  return { success: transactions.length > 0, transactions, errors };
}
