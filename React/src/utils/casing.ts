// Title-case labels while keeping legal acronyms uppercase.

/** Acronyms that stay uppercase. */
const UPPERCASE_TOKENS = new Set<string>([
  'NDA',
  'MSA',
  'SOW',
  'MOU',
  'DPA',
  'IP',
  'SaaS',
  'LEDES',
  'UTBMS',
  'SLA',
  'T&CS',
  'TCS',
  'EULA',
  'GDPR',
  'HIPAA',
  'CCPA',
  'API',
  'PDF',
  'DOCX',
  'XLSX',
  'IT',
  'HR',
  'CEO',
  'CFO',
  'CIO',
  'KPI',
  'WIP',
  'SOL',
]);

/** Title-case one word, keeping known acronyms. */
function normaliseToken(token: string): string {
  if (!token) return token;
  if (!/[a-zA-Z]/.test(token)) return token;

  const noAmp = token.replace(/&/g, '').toUpperCase();
  const upper = token.toUpperCase();
  if (UPPERCASE_TOKENS.has(upper) || UPPERCASE_TOKENS.has(noAmp)) {
    const canonical = [...UPPERCASE_TOKENS].find(
      (t) => t.replace(/&/g, '').toUpperCase() === noAmp,
    );
    return canonical ?? upper;
  }

  return token
    .split('-')
    .map((part) =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('-');
}

/** Title-case a label, keeping acronyms such as NDA and MSA. */
export function toTitleCase(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .trim()
    .split(/\s+/)
    .map(normaliseToken)
    .join(' ');
}
