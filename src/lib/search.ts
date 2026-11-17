// Search helpers shared by server (index building) and client (query normalizing).

const GREEK_TO_LATIN: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th',
  ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
  ρ: 'r', σ: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

/** Lowercase, strip accents/diacritics (ά -> α), and unify final sigma. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ς/g, 'σ')
    .trim();
}

/** Very simple Greek -> Latin transliteration, so "averof" matches "ΑΒΕΡΩΦ". */
export function transliterate(normalized: string): string {
  return normalized
    .replace(/ου/g, 'ou')
    .replace(/./g, (ch) => GREEK_TO_LATIN[ch] ?? ch);
}

/** Text that a stop is matched against: normalized name, Latin form and code. */
export function buildSearchText(...parts: string[]): string {
  const n = normalize(parts.join(' '));
  return `${n} ${transliterate(n)}`;
}
