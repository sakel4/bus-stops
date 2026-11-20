// Server-only: the bearer token for rest.citybus.gr. Never import this from browser code.
//
// citybus hands its own site a short-lived token, embedded in its stops page. We keep the current
// one in Vercel Global Config (key "citybusToken"), so every function instance shares it, and fetch
// a new one from that page when citybus rejects ours (401). CITYBUS_TOKEN is only a fallback.
//
// In local development (`astro dev`) none of this runs: only CITYBUS_TOKEN from .env is used,
// and a 401 is reported as is.
//
//   read:  memory (1 min) → Global Config → CITYBUS_TOKEN
//   401:   Global Config again (another instance may have refreshed it already) → scrape → save

import { createClient, parseConnectionString } from "@vercel/global-config";
import {
  CITYBUS_TOKEN,
  GLOBAL_CONFIG,
  VERCEL_API_TOKEN,
  VERCEL_TEAM_ID,
} from "astro:env/server";

const TOKEN_KEY = "citybusToken";
const TOKEN_PAGE_URL = "https://irakleio.citybus.gr/el/stops";
// Keeps Global Config reads to about one a minute per function instance.
const MEMORY_TTL_MS = 60_000;
// After a failed refresh, don't scrape again for a while: if citybus changed the page, every
// request would otherwise fetch it.
const RETRY_REFRESH_AFTER_MS = 60_000;
const TIMEOUT_MS = 8_000;

const store = GLOBAL_CONFIG ? createClient(GLOBAL_CONFIG) : null;
const storeId = GLOBAL_CONFIG ? parseConnectionString(GLOBAL_CONFIG)?.id : undefined;

// The token this function instance uses, kept in memory between requests while it stays warm.
let cachedToken: { value: string | undefined; at: number } | undefined;
// Concurrent 401s share one refresh.
let refreshing: Promise<string | undefined> | undefined;
let lastFailedRefreshAt = 0;

/** The token to use now; undefined if none is stored anywhere yet. */
export async function getToken(): Promise<string | undefined> {
  if (import.meta.env.DEV) return CITYBUS_TOKEN;
  if (cachedToken && Date.now() - cachedToken.at < MEMORY_TTL_MS) return cachedToken.value;
  const value = (await readStored()) ?? CITYBUS_TOKEN;
  cachedToken = { value, at: Date.now() };
  return value;
}

/**
 * Gets a new token after citybus rejected `rejected` (or there was none). Resolves to undefined
 * if no new one could be found; the caller then reports the 401.
 */
export function refreshToken(rejected: string | undefined): Promise<string | undefined> {
  if (import.meta.env.DEV) return Promise.resolve(undefined);
  refreshing ??= refresh(rejected).finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}

async function refresh(rejected: string | undefined): Promise<string | undefined> {
  // Another instance may have saved a new token already: no need to scrape.
  const stored = await readStored({ consistentRead: true });
  if (stored && stored !== rejected) return remember(stored);

  if (Date.now() - lastFailedRefreshAt < RETRY_REFRESH_AFTER_MS) return undefined;

  const scraped = await scrapeToken().catch((err) => {
    console.error("[citybus token] couldn't get a new token:", err);
    return undefined;
  });
  if (!scraped || scraped === rejected) {
    lastFailedRefreshAt = Date.now();
    return undefined;
  }

  console.info("[citybus token] got a new token from the citybus site");
  remember(scraped);
  await saveStored(scraped).catch((err) =>
    console.error("[citybus token] couldn't save the new token to Global Config:", err),
  );
  return scraped;
}

/** Stores `value` as this instance's cached token and returns it. */
function remember(value: string): string {
  cachedToken = { value, at: Date.now() };
  return value;
}

async function scrapeToken(): Promise<string> {
  const res = await fetch(TOKEN_PAGE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${TOKEN_PAGE_URL} responded with ${res.status}`);
  const token = (await res.text()).match(/const token = '([^']+)'/)?.[1];
  if (!token) throw new Error(`no token found in ${TOKEN_PAGE_URL}; the page may have changed`);
  return token;
}

async function readStored(options?: { consistentRead: boolean }): Promise<string | undefined> {
  if (!store) return undefined;
  try {
    const value = await store.get<string>(TOKEN_KEY, options);
    return typeof value === "string" && value ? value : undefined;
  } catch (err) {
    console.error("[citybus token] couldn't read Global Config:", err);
    return undefined;
  }
}

// Global Config is read-only from the SDK; writes go through the Vercel REST API.
async function saveStored(value: string): Promise<void> {
  if (!storeId || !VERCEL_API_TOKEN) {
    console.warn(
      "[citybus token] GLOBAL_CONFIG or VERCEL_API_TOKEN not set; the new token is kept in memory only",
    );
    return;
  }
  const url = new URL(`https://api.vercel.com/v1/global-config/${storeId}/items`);
  if (VERCEL_TEAM_ID) url.searchParams.set("teamId", VERCEL_TEAM_ID);
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items: [{ operation: "upsert", key: TOKEN_KEY, value }] }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Vercel API responded with ${res.status}: ${await res.text()}`);
}
