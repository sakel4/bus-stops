// Timetable PDFs published by Astiko KTEL Irakleiou on https://astiko-irakleiou.gr/dromologia/.
// We don't scrape that page: the PDF names follow a fixed pattern, so we only check which files exist.

import type { Lang } from '../i18n/ui';

const PDF_BASE = 'https://astiko-irakleiou.gr/wp-content/uploads/irakleio/dromologia/';

/** File name prefix per service day: k3.pdf (Mon–Fri), s3.pdf (Sat), kur3.pdf (Sun). */
const DAY_PREFIX = { weekday: 'k', saturday: 's', sunday: 'kur' } as const;

export type Day = keyof typeof DAY_PREFIX;
export const DAYS = Object.keys(DAY_PREFIX) as Day[];

/** "Line" 0 is the operator's combined timetable of all lines, not a real line. */
export const ALL_LINES = '0';

export interface ScheduleLine {
  /** Same two-digit codes as the rest of the site ('02'), so chips and line links match. */
  code: string;
  name: Record<Lang, string>;
}

/**
 * Lines listed on the operator's timetable page. Lines that currently have no PDFs
 * (e.g. 50, 69, 87) stay here so they reappear by themselves if service resumes.
 * Only a brand-new line number needs an edit here.
 */
export const SCHEDULE_LINES: ScheduleLine[] = [
  { code: '02', name: { el: 'Κνωσσός - Σκαλάνι', en: 'Knossos - Skalani' } },
  { code: '03', name: { el: 'Φορτέτσα', en: 'Fortetsa' } },
  { code: '04', name: { el: 'Μασταμπάς - Μεσαμπελιές', en: 'Mastampas - Mesampelies' } },
  { code: '05', name: { el: 'Δημ. Θερισσός', en: 'Dim. Therissos' } },
  { code: '06', name: { el: 'Αμμουδάρα', en: 'Ammoudara' } },
  { code: '07', name: { el: 'Αμνισσός', en: 'Amnissos' } },
  { code: '08', name: { el: 'Ι.Τ.Ε. - FORTH', en: 'FORTH' } },
  { code: '09', name: { el: 'Άγιος Σύλλας', en: 'Agios Syllas' } },
  { code: '10', name: { el: 'Γάζι - Γάζι Καβροχώρι', en: 'Gazi - Gazi Kavrochori' } },
  { code: '11', name: { el: 'ΠΑΓΝΗ - Πανεπιστήμιο', en: 'PAGNI - University' } },
  { code: '12', name: { el: 'ΕΛ.ΜΕ.ΠΑ', en: 'Hellenic Mediterranean University' } },
  { code: '14', name: { el: 'ΒΙΠΕΗ Καλλιθέα', en: 'Industrial Area - Kallithea' } },
  { code: '15', name: { el: 'Φοινικιά - Μαλάδες', en: 'Foinikia - Malades' } },
  { code: '16', name: { el: 'Αγία Αικατερίνη', en: 'Agia Aikaterini' } },
  { code: '19', name: { el: 'Γούρνες', en: 'Gournes' } },
  { code: '21', name: { el: 'Κνωσσός - ΠΑΓΝΗ', en: 'Knossos - PAGNI' } },
  { code: '23', name: { el: 'Νέο Κοιμητήριο', en: 'New Cemetery' } },
  { code: '31', name: { el: 'Ι.Κ.Α.', en: 'IKA' } },
  { code: '50', name: { el: 'Γραμμή 50', en: 'Line 50' } },
  { code: '69', name: { el: 'Αμμουδάρα - Ξηροπόταμος - Γάζι - ΠΑΓΝΗ', en: 'Ammoudara - Xiropotamos - Gazi - PAGNI' } },
  { code: '87', name: { el: 'Knossos Express', en: 'Knossos Express' } },
  { code: '90', name: { el: 'Δημοτική Συγκοινωνία', en: 'Municipal Bus' } },
];

/** URL of a line's timetable PDF for a service day (whether or not it exists). */
export function getPdfUrl(line: string, day: Day): string {
  let file = String(Number(line)); // '02' -> '2'
  if (file === '90') file = 'DIMOTIKI';
  else if (file === ALL_LINES && day === 'weekday') file = '00';
  return `${PDF_BASE}${DAY_PREFIX[day]}${file}.pdf`;
}

/** Response of /api/schedules: the service days that have a PDF, per line code. */
export interface SchedulesResponse {
  checkedAt: string;
  lines: Record<string, Day[]>;
}

/** Today's service day in Heraklion, regardless of the visitor's time zone. */
export function getToday(now = new Date()): Day {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Athens' }).format(now);
  return weekday === 'Sat' ? 'saturday' : weekday === 'Sun' ? 'sunday' : 'weekday';
}
