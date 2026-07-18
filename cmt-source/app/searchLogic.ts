export type SearchableEntity = {
  entity_id: string;
  entity_name: string;
  address: string;
  location: string;
  categories_seen: string[];
  items_seen: string[];
  good_points: string[];
};

export type SearchableSignal = {
  entity_id: string;
  raw_text: string;
  category: string;
  item_mentioned: string;
  good_points: string[];
};

export type SearchMatch = {
  id: string;
  score: number;
  reasons: string[];
};

/**
 * Optional structured understanding supplied by an external NLU/LLM layer.
 * Retrieval remains deterministic: the parser may explain the query, but it
 * never chooses records or invents evidence.
 */
export type SearchQueryUnderstanding = {
  intent?: "find_place" | "browse" | "unknown";
  target_raw?: string | null;
  target_type?: "item" | "service" | "category" | "unknown";
  location_raw?: string | null;
  location_scope_hint?: string | null;
  qualifiers?: string[];
};

type ItemCandidate = {
  raw: string;
  normalized: string;
  accent: string;
};

const STOP_WORDS = new Set([
  "co", "nao", "cho", "o", "tai", "gan", "quanh", "day", "duoc", "khong", "gi", "mot",
  "toi", "minh", "can", "tim", "hay", "la", "voi", "va", "cua", "nhung",
  "noi", "quan", "khu", "vuc", "moi", "nguoi", "khen", "muon", "xin",
  "lam", "dich", "vu", "trai", "nghiem",
]);

const QUALITY_HINTS = [
  "ngon", "tot", "dep", "yen tinh", "can than", "nhanh", "dung hen",
  "gia hop ly", "bao gia", "tan tam", "sach", "niem no", "uy tin", "re",
  "chuyen nghiep", "nhiet tinh", "thoai mai", "tu nhien", "de chiu",
];

const AMBIGUOUS_UNACCENTED_TOKENS = new Set(["sua", "may", "bo", "ca", "ga"]);
const GENERIC_LOCATION_WORDS = new Set(["day", "gan day", "quanh day", "khu vuc nay"]);

export const normalizeSearchText = (value: string) =>
  value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\bca phe\b/g, "cafe")
    .replace(/\s+/g, " ")
    .trim();

function normalizeAccentText(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFC")
    .replace(/[^a-z0-9à-ỹđ\s]/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasVietnameseDiacritics(value: string) {
  return normalizeAccentText(value) !== normalizeSearchText(value);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function tokensOf(value: string) {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function accentTokensOf(value: string) {
  return normalizeAccentText(value).split(" ").filter(Boolean);
}

function queryTokens(query: string) {
  return query.split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function stripLocationPrefix(value: string) {
  return value
    .replace(/^\d+\s+/, "")
    .replace(/^(tp|thanh pho|quan|q|huyen|tinh|phuong|p|xa|thi tran|tt)\s+/, "")
    .trim();
}

/**
 * Build a location vocabulary dynamically from current entity data.
 * Every administrative component is indexed independently, so a query may use
 * a short locality (for example a district) without having to repeat its parent.
 * No city/district mapping is hard-coded here.
 */
function buildLocationCandidates(entities: SearchableEntity[]) {
  const values = entities.flatMap((entity) => {
    const parts = [entity.location, ...entity.address.split(",")];
    return parts.flatMap((part) => {
      const normalized = normalizeSearchText(part);
      const stripped = stripLocationPrefix(normalized);
      return [normalized, stripped];
    });
  });

  return unique(values)
    .filter((value) => value.length >= 3 && !/^\d+$/.test(value))
    .sort((a, b) => b.length - a.length);
}

function buildItemCandidates(entities: SearchableEntity[], signals: SearchableSignal[]): ItemCandidate[] {
  const rawValues = unique([
    ...entities.flatMap((entity) => [...entity.categories_seen, ...entity.items_seen]),
    ...signals.flatMap((signal) => [signal.category, signal.item_mentioned]),
  ]);

  const byAccent = new Map<string, ItemCandidate>();
  rawValues.forEach((raw) => {
    const accent = normalizeAccentText(raw);
    const normalized = normalizeSearchText(raw);
    if (normalized.length < 3 || byAccent.has(accent)) return;
    byAccent.set(accent, { raw, normalized, accent });
  });
  return Array.from(byAccent.values());
}

function extractKnownLocationHints(query: string, candidates: string[]) {
  return candidates.filter((candidate) => query.includes(candidate));
}

function extractFallbackLocation(query: string) {
  const patterns = [
    /\b(?:o|tai|quanh)\s+(.+?)(?=\s+(?:co|tim|can|muon|cho|quan|nao)\b|$)/,
    /\bgan\s+(.+?)(?=\s+(?:co|tim|can|muon|cho|quan|nao)\b|$)/,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    const value = match?.[1]?.trim();
    if (value && value.length >= 3 && !GENERIC_LOCATION_WORDS.has(value)) return value;
  }
  return "";
}

function itemCandidateMatchesQuery(rawQuery: string, normalizedQuery: string, candidate: ItemCandidate) {
  const accentQuery = normalizeAccentText(rawQuery);
  if (accentQuery.includes(candidate.accent)) return true;

  const accentQueryTokens = new Set(accentTokensOf(rawQuery));
  const accentCandidateTokens = accentTokensOf(candidate.raw).filter((token) => {
    const normalizedToken = normalizeSearchText(token);
    return token.length >= 3 && !STOP_WORDS.has(normalizedToken);
  });
  if (accentCandidateTokens.some((token) => accentQueryTokens.has(token))) return true;

  if (hasVietnameseDiacritics(rawQuery)) return false;
  if (normalizedQuery.includes(candidate.normalized)) return true;

  const normalizedQueryTokens = new Set(queryTokens(normalizedQuery));
  const candidateTokens = tokensOf(candidate.normalized).filter(
    (token) => token.length >= 3 && !STOP_WORDS.has(token) && !AMBIGUOUS_UNACCENTED_TOKENS.has(token),
  );
  return candidateTokens.some((token) => normalizedQueryTokens.has(token));
}

function removePhraseTokens(tokens: string[], phrases: string[]) {
  const ignored = new Set(phrases.flatMap(tokensOf));
  return tokens.filter((token) => !ignored.has(token));
}

function signalText(signal: SearchableSignal) {
  return normalizeSearchText([
    signal.category,
    signal.item_mentioned,
    signal.raw_text,
    ...signal.good_points,
  ].join(" "));
}

function signalMatchesItem(signal: SearchableSignal, hints: ItemCandidate[]) {
  if (hints.length === 0) return true;
  const text = signalText(signal);
  return hints.some((hint) => {
    if (text.includes(hint.normalized)) return true;
    const meaningfulTokens = tokensOf(hint.normalized).filter(
      (token) => token.length >= 3 && !STOP_WORDS.has(token) && !AMBIGUOUS_UNACCENTED_TOKENS.has(token),
    );
    return meaningfulTokens.length > 0 && meaningfulTokens.some((token) => text.includes(token));
  });
}

/**
 * Evidence-first CMT retrieval.
 *
 * Safety principles:
 * - The optional GPT/NLU result only structures intent; it never selects data.
 * - Locations are resolved from current ENTITY geography, never a one-by-one map.
 * - A requested item/service must be evidenced by at least one individual SIGNAL.
 * - ENTITY aggregation happens only after SIGNAL qualification, preventing one
 *   unrelated item at the same place from leaking into another query.
 * - No-match stays no-match; unrelated entities are never used as filler.
 */
export function searchCmtEntities(
  rawQuery: string,
  entities: SearchableEntity[],
  signals: SearchableSignal[],
  understanding?: SearchQueryUnderstanding,
): SearchMatch[] {
  const structuredQueryInput = [
    understanding?.target_raw ?? "",
    understanding?.location_raw ?? "",
    ...(understanding?.qualifiers ?? []),
  ].join(" ").trim();
  const query = normalizeSearchText(structuredQueryInput || rawQuery);
  if (!query) return [];

  const locationCandidates = buildLocationCandidates(entities);
  const explicitLocation = normalizeSearchText(understanding?.location_raw ?? "");
  const knownLocationHints = explicitLocation
    ? extractKnownLocationHints(explicitLocation, locationCandidates)
    : extractKnownLocationHints(query, locationCandidates);
  const fallbackLocation = knownLocationHints.length === 0
    ? (explicitLocation || extractFallbackLocation(query))
    : "";
  const requestedLocations = knownLocationHints.length > 0
    ? knownLocationHints
    : fallbackLocation
      ? [fallbackLocation]
      : [];

  const itemCandidates = buildItemCandidates(entities, signals);
  const targetQuery = understanding?.target_raw?.trim() || rawQuery;
  const normalizedTargetQuery = normalizeSearchText(targetQuery);
  const itemHints = itemCandidates.filter((candidate) =>
    itemCandidateMatchesQuery(targetQuery, normalizedTargetQuery, candidate),
  );
  const qualityHints = QUALITY_HINTS.filter((phrase) => query.includes(phrase));

  const baseTokens = queryTokens(query);
  const nonLocationTokens = removePhraseTokens(baseTokens, requestedLocations);
  const nonQualityTokens = removePhraseTokens(nonLocationTokens, qualityHints);
  const requiredTokens = removePhraseTokens(nonQualityTokens, itemHints.map((hint) => hint.normalized));

  return entities
    .map((entity) => {
      const related = signals.filter((signal) => signal.entity_id === entity.entity_id);
      const locationText = normalizeSearchText([entity.address, entity.location].join(" "));
      const locationOk = requestedLocations.length === 0
        || requestedLocations.every((phrase) => locationText.includes(phrase));
      if (!locationOk) return null;

      const qualifyingSignals = related.filter((signal) => {
        const evidence = signalText(signal);
        const itemOk = signalMatchesItem(signal, itemHints);
        const qualityOk = qualityHints.length === 0 || qualityHints.every((phrase) => evidence.includes(phrase));
        const requiredTokensOk = requiredTokens.length === 0
          || requiredTokens.every((token) => evidence.includes(token));
        return itemOk && qualityOk && requiredTokensOk;
      });

      // Specific item/service intent requires direct SIGNAL evidence.
      if (itemHints.length > 0 && qualifyingSignals.length === 0) return null;

      const entityText = normalizeSearchText([
        entity.entity_name,
        entity.address,
        entity.location,
        ...entity.categories_seen,
        ...entity.items_seen,
        ...entity.good_points,
      ].join(" "));

      const evidencePool = qualifyingSignals.length > 0 ? qualifyingSignals : related;
      const allEvidenceText = normalizeSearchText([
        entityText,
        ...evidencePool.map(signalText),
      ].join(" "));
      const tokenHits = baseTokens.filter((token) => allEvidenceText.includes(token));
      if (tokenHits.length === 0) return null;

      const reasons: string[] = [];
      if (requestedLocations.length > 0) reasons.push("Đúng khu vực");
      if (itemHints.length > 0) reasons.push("Có SIGNAL đúng món / dịch vụ");
      if (qualityHints.length > 0) reasons.push("Có trải nghiệm phù hợp");

      const score =
        tokenHits.length
        + requestedLocations.length * 6
        + qualifyingSignals.length * 5
        + itemHints.length * 4
        + qualityHints.length * 3;

      return { id: entity.entity_id, score, reasons };
    })
    .filter((item): item is SearchMatch => Boolean(item))
    .sort((a, b) => b.score - a.score);
}
