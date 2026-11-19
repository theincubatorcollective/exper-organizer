export type AttendeeMetric = {
  label: string;
  value: string;
  detail: string;
};

export type GuestStatus = "checked-in" | "pending";

/** Door `POST .../check-in` outcomes (always HTTP 200 when the call succeeds). */
export type CheckInOutcome =
  | "admitted"
  | "already_used"
  | "cancelled"
  | "wrong_experience"
  | "not_found";

export type Guest = {
  id: string;
  name: string;
  status: GuestStatus;
  checkedInAt?: string;
  ticket: string;
  /** Pass code for door check-in when the guests API provides one. */
  code?: string | null;
};

export type AttendeesData = {
  eventMeta: string;
  metrics: AttendeeMetric[];
  totals: {
    all: number;
    pending: number;
    checkedIn: number;
  };
  guests: Guest[];
  page: number;
  pageCount: number;
  showing: number;
  footnote: string;
};
