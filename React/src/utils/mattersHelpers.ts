// Shared helpers used by the Matters / Invoices tabs.

export function statusClass(status: string): string {
  return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

export function fmtMoney(value: number, currency = 'USD'): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}