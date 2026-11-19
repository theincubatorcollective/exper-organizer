import { backendFetch, type BackendResult } from "./backend";

/** `GET /organizer/experiences/:id` */
export function getExperience(
  bearer: string,
  experienceId: string,
  userAgent?: string | null,
): Promise<BackendResult<unknown>> {
  return backendFetch(`/organizer/experiences/${experienceId}`, {
    bearer,
    userAgent,
  });
}

/** `PATCH /organizer/experiences/:id` — partial update. */
export type UpdateExperienceBody = {
  title?: string;
  summary?: string;
  description?: string;
  category?: string;
  city?: string;
  country?: string;
  venueName?: string;
  address?: string;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  currency?: string;
  capacity?: number;
  showVenueBeforePurchase?: boolean;
  refundPolicy?: string;
  /** Fallback when POST /publish is a no-op on some backends. */
  status?: string;
};

export function updateExperience(
  bearer: string,
  experienceId: string,
  body: UpdateExperienceBody,
  userAgent?: string | null,
): Promise<BackendResult<unknown>> {
  return backendFetch(`/organizer/experiences/${experienceId}`, {
    method: "PATCH",
    body,
    bearer,
    userAgent,
  });
}

export function publishExperience(
  bearer: string,
  experienceId: string,
  userAgent?: string | null,
): Promise<BackendResult<unknown>> {
  return backendFetch(`/organizer/experiences/${experienceId}/publish`, {
    method: "POST",
    body: {},
    bearer,
    userAgent,
  });
}

export function unpublishExperience(
  bearer: string,
  experienceId: string,
  userAgent?: string | null,
): Promise<BackendResult<unknown>> {
  return backendFetch(`/organizer/experiences/${experienceId}/unpublish`, {
    method: "POST",
    body: {},
    bearer,
    userAgent,
  });
}
