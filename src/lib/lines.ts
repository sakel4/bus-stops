// Line colors, shared by server-rendered chips and the browser (live arrivals).

/**
 * One color per line code. Chosen so lines that share a stop look clearly different,
 * and every color keeps white text at WCAG AA contrast (at least 4.5:1).
 */
const LINE_COLORS: Record<string, string> = {
  '01': '#0c4a6e',
  '02': '#1e3a8a',
  '03': '#3f6212',
  '04': '#2563eb',
  '05': '#6b7280',
  '06': '#854d0e',
  '07': '#b45309',
  '09': '#7c3aed',
  '10': '#a21caf',
  '11': '#581c87',
  '12': '#db2777',
  '14': '#b91c1c',
  '15': '#c2410c',
  '16': '#0f766e',
  '17': '#047857',
  '19': '#be123c',
  '20': '#0f172a',
  '21': '#57534e',
  '23': '#7c2d12',
  '31': '#7f1d1d',
  '50': '#831843',
  '91': '#0369a1',
  '92': '#4338ca',
  '93': '#134e4a',
};

/** Used for lines missing from LINE_COLORS (e.g. new lines from the live API). */
const FALLBACK_COLOR = '#334155';

/** Background color for a line's chip; always paired with white text. */
export function getLineColor(line: string): string {
  return LINE_COLORS[line] ?? FALLBACK_COLOR;
}
