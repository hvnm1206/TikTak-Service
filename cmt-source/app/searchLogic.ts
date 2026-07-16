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

const STOP_WORDS = new Set([
  "co", "nao", "cho", "o", "gan", "day", "duoc", "khong", "gi", "mot",
  "toi", "minh", "can", "tim", "hay", "la", "voi", "va", "cua", "nhung",
  "noi", "chỗ", "chỗ nào", "quan", "quán", "nào",
]);

export const normalizeSearchText = (value: string) =>
  value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const LOCATION_HINTS = [
  "ha noi", "hai phong", "thanh hoa", "da nang", "ho chi minh", "sai gon",
  "cau giay", "thanh xuan", "ngo quyen", "lach tray",
];

const ITEM_HINTS = [
  "pho", "cafe", "ca phe", "makeup", "trang diem", "dieu hoa", "tu lanh",
  "may giat", "quan an", "nha hang", "spa", "toc", "chup anh",
];

const QUALITY_HINTS = [
  "ngon", "tot", "dep", "yen tinh", "can than", "nhanh", "dung hen",
  "gia hop ly", "bao gia", "tan tam", "sach", "niem no",
];

function extractPhraseHits(query: string, dictionary: string[]) {
  return dictionary.filter((phrase) => query.includes(phrase));
}

function queryTokens(query: string) {
  return query
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function containsAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

/**
 * Prototype-safe retrieval:
 * - Never falls back to all entities when nothing matches.
 * - Location, item/service and quality terms are treated as separate intents.
 * - When the user explicitly states one of these intents, a result must satisfy it.
 * - Signals are part of the evidence used for matching; ENTITY metadata alone is not enough.
 */
export function searchCmtEntities(
  rawQuery: string,
  entities: SearchableEntity[],
  signals: SearchableSignal[],
): SearchMatch[] {
  const query = normalizeSearchText(rawQuery);
  if (!query) return [];

  const tokens = queryTokens(query);
  const locationHints = extractPhraseHits(query, LOCATION_HINTS);
  const itemHints = extractPhraseHits(query, ITEM_HINTS);
  const qualityHints = extractPhraseHits(query, QUALITY_HINTS);

  return entities
    .map((entity) => {
      const related = signals.filter((signal) => signal.entity_id === entity.entity_id);
      const locationText = normalizeSearchText([entity.address, entity.location].join(" "));
      const itemText = normalizeSearchText([
        ...entity.categories_seen,
        ...entity.items_seen,
        ...related.flatMap((signal) => [signal.category, signal.item_mentioned]),
      ].join(" "));
      const evidenceText = normalizeSearchText([
        ...entity.good_points,
        ...related.flatMap((signal) => [signal.raw_text, ...signal.good_points]),
      ].join(" "));
      const allText = normalizeSearchText([
        entity.entity_name,
        locationText,
        itemText,
        evidenceText,
      ].join(" "));

      const locationOk = locationHints.length === 0 || containsAny(locationText, locationHints);
      const itemOk = itemHints.length === 0 || containsAny(itemText + " " + evidenceText, itemHints);
      const qualityOk = qualityHints.length === 0 || containsAny(evidenceText, qualityHints);

      if (!locationOk || !itemOk || !qualityOk) return null;

      const tokenHits = tokens.filter((token) => allText.includes(token));
      if (tokenHits.length === 0) return null;

      const reasons: string[] = [];
      if (locationHints.length && locationOk) reasons.push("Đúng khu vực");
      if (itemHints.length && itemOk) reasons.push("Đúng món / dịch vụ");
      if (qualityHints.length && qualityOk) reasons.push("Có trải nghiệm phù hợp");

      const score =
        tokenHits.length +
        (locationHints.length && locationOk ? 5 : 0) +
        (itemHints.length && itemOk ? 4 : 0) +
        (qualityHints.length && qualityOk ? 3 : 0) +
        Math.min(related.length, 3);

      return { id: entity.entity_id, score, reasons };
    })
    .filter((item): item is SearchMatch => Boolean(item))
    .sort((a, b) => b.score - a.score);
}
