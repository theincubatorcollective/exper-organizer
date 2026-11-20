/**
 * Organizer experience categories.
 * Slugs must match `PATCH/POST /organizer/experiences` validation.
 * Backend currently accepts the list below except `other` — we still expose
 * Other in the UI and send `other`; backend should add it to the enum.
 */
export const EVENT_CATEGORIES = [
  { slug: "music", label: "Music" },
  { slug: "nightlife", label: "Nightlife" },
  { slug: "art", label: "Art" },
  { slug: "culture", label: "Culture" },
  { slug: "food", label: "Food & drink" },
  { slug: "outdoors", label: "Outdoors" },
  { slug: "wellness", label: "Wellness" },
  { slug: "tech", label: "Tech" },
  { slug: "film", label: "Film" },
  { slug: "sports", label: "Sports" },
  { slug: "other", label: "Other" },
] as const;

export type EventCategorySlug = (typeof EVENT_CATEGORIES)[number]["slug"];

const BY_SLUG = Object.fromEntries(
  EVENT_CATEGORIES.map((row) => [row.slug, row.label]),
) as Record<string, string>;

const BY_LABEL = Object.fromEntries(
  EVENT_CATEGORIES.map((row) => [row.label.toLowerCase(), row.slug]),
) as Record<string, EventCategorySlug>;

/** Map a Basics select label (or legacy label) to an API slug. */
export function toApiCategory(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "other";

  const lower = trimmed.toLowerCase();
  if (BY_LABEL[lower]) return BY_LABEL[lower];
  if (BY_SLUG[lower]) return lower;

  // Legacy Figma labels
  if (lower.includes("music") && lower.includes("nightlife")) return "music";
  if (lower.includes("nightlife")) return "nightlife";
  if (lower.includes("music")) return "music";
  if (lower.includes("sport")) return "sports";
  if (lower.includes("art") && !lower.includes("culture")) return "art";
  if (lower.includes("culture")) return "culture";
  if (lower.includes("food") || lower.includes("drink")) return "food";
  if (lower.includes("wellness")) return "wellness";
  if (lower.includes("outdoor")) return "outdoors";
  if (lower.includes("tech")) return "tech";
  if (lower.includes("film")) return "film";
  if (lower === "other" || lower.includes("other")) return "other";

  return "other";
}

/** Map an API slug back to the Basics select label. */
export function fromApiCategory(value: string | null | undefined): string {
  if (!value) return EVENT_CATEGORIES[0].label;
  const key = value.trim().toLowerCase();
  if (BY_SLUG[key]) return BY_SLUG[key];
  // Legacy API values
  if (key === "arts") return "Art";
  return value;
}

export function categoryLabels(): string[] {
  return EVENT_CATEGORIES.map((row) => row.label);
}
