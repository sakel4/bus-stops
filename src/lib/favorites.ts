// Favourite stops, saved only in this browser's localStorage (never sent to the server).
// Everything but STAR_ICON_PATH is browser only.

/** Star outline (24×24 viewBox): stroke it for "not a favourite", fill it for "favourite". */
export const STAR_ICON_PATH =
  'M11.48 3.5a.56.56 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z';

const KEY = 'hopon:favorites';
const CHANGE = 'favorites:change';

interface Stored {
  v: 1;
  /** Stop codes, in the order they were added. */
  codes: string[];
}

/** Last known list, so a broken or blocked storage still works for the current page. */
let cache: string[] | null = null;

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    if (parsed?.v === 1 && Array.isArray(parsed.codes)) {
      return parsed.codes.filter((code): code is string => typeof code === 'string');
    }
  } catch {
    // Storage blocked (private mode, site data disabled) or the value is corrupt.
  }
  return cache ?? [];
}

function write(codes: string[]) {
  cache = codes;
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, codes } satisfies Stored));
  } catch {
    // Keep working for this page even if the browser refuses to save.
  }
  window.dispatchEvent(new CustomEvent(CHANGE));
}

export function getFavorites(): string[] {
  return (cache = read());
}

export function isFavorite(code: string): boolean {
  return getFavorites().includes(code);
}

/** Adds or removes a stop; returns whether it is now a favourite. */
export function toggleFavorite(code: string): boolean {
  const codes = getFavorites();
  const on = !codes.includes(code);
  write(on ? [...codes, code] : codes.filter((c) => c !== code));
  if (on) {
    // Ask the browser not to clear our storage under pressure (iOS Safari clears it after
    // about a week without a visit otherwise). Best effort: it may say no.
    navigator.storage?.persist?.().catch(() => {});
  }
  return on;
}

/** Calls `listener` when favourites change on this page or in another tab. */
export function onFavoritesChange(listener: () => void) {
  window.addEventListener(CHANGE, listener);
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) {
      cache = null;
      listener();
    }
  });
}

let buttonsReady = false;

/**
 * Wires every `button[data-favorite="<code>"]` on the page (now or added later): click toggles
 * the stop, and `aria-pressed` follows the saved state (styled by the fav-toggle utility).
 */
export function initFavoriteButtons() {
  if (buttonsReady) return;
  buttonsReady = true;

  const sync = () => {
    const codes = new Set(getFavorites());
    for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-favorite]')) {
      button.ariaPressed = String(codes.has(button.dataset.favorite!));
    }
  };

  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
      'button[data-favorite]',
    );
    if (button) toggleFavorite(button.dataset.favorite!);
  });
  onFavoritesChange(sync);
  sync();
}
