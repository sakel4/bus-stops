// Small helpers shared by the page scripts (browser only).

/** Finds the elements marked `data-{name}` inside `root`, e.g. `part('retry')`. */
export function partOf(root: HTMLElement) {
  return <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
}

/**
 * Window event fired when an endpoint answers `{ error: 'service_issue' }` (citybus rejected our
 * token and refreshing it failed), with `detail: true`; fired with `detail: false` on the next successful response.
 * ServiceNotice.astro shows a banner while it is true.
 */
export const SERVICE_ISSUE = 'app:service-issue';

const reportServiceIssue = (issue: boolean) =>
  window.dispatchEvent(new CustomEvent<boolean>(SERVICE_ISSUE, { detail: issue }));

/** GETs a JSON response from one of our endpoints; throws on HTTP errors. */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (body?.error === 'service_issue') reportServiceIssue(true);
    throw new Error(`HTTP ${res.status}`);
  }
  reportServiceIssue(false);
  return (await res.json()) as T;
}

/**
 * Runs `load` every `intervalMs` while the tab is visible, and right away when it becomes
 * visible again. Returns a function that starts polling (or refreshes now, e.g. "Try again").
 * Overlapping runs are skipped; `load` should handle its own errors.
 */
export function poll(load: () => Promise<void>, intervalMs: number): () => void {
  let timer: number | undefined;
  let running = false;
  let started = false;

  const run = async () => {
    if (running) return;
    running = true;
    clearTimeout(timer);
    try {
      await load();
    } finally {
      running = false;
      if (!document.hidden) timer = window.setTimeout(run, intervalMs);
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else if (started) run();
  });

  return () => {
    started = true;
    run();
  };
}
