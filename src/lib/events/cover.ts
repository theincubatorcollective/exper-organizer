/** Local covers used when the API has no `coverImageUrl` yet (upload not wired). */
const FALLBACK_COVERS = [
  "/events/sound-scape.jpg",
  "/events/rooftop-sessions.jpg",
  "/events/accra-after-dark.jpg",
  "/events/nairobi-frequency.jpg",
  "/overview/neon-solstice.jpg",
] as const;

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Stable decorative cover so list rows aren't blank grey squares. */
export function fallbackEventCover(eventId: string): string {
  return FALLBACK_COVERS[hashId(eventId) % FALLBACK_COVERS.length]!;
}

export function eventCoverSrc(
  coverImageUrl: string | null | undefined,
  eventId: string,
): string {
  const url = typeof coverImageUrl === "string" ? coverImageUrl.trim() : "";
  return url || fallbackEventCover(eventId);
}

/** Pull a cover URL out of whatever shape GET experience returns. */
export function coverFromExperiencePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const obj =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root.experience && typeof root.experience === "object"
        ? (root.experience as Record<string, unknown>)
        : root;

  for (const key of ["coverImageUrl", "coverUrl", "imageUrl", "posterUrl"] as const) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const cover = obj.cover;
  if (cover && typeof cover === "object") {
    const nested = cover as Record<string, unknown>;
    for (const key of ["url", "src", "imageUrl"] as const) {
      const value = nested[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return null;
}
