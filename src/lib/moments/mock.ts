import type { MomentsData } from "./types";

/** Figma Moments moderation state for Neon Solstice (tests / fallback). */
export function designMoments(): MomentsData {
  return {
    eventMeta:
      "Neon Solstice · Review submissions before they appear in the room or event memory.",
    counts: {
      pending: 13,
      approved: 157,
      rejected: 4,
    },
    items: [
      {
        id: "current",
        responseId: "current",
        caption: "The room feels like it's breathing.",
        authorMeta: "Ada Okafor · Neon Solstice · 21:39 WAT",
        imageUrl: "/overview/neon-solstice.jpg",
        submitter: "Ada Okafor",
        ticketMeta: "NS-0428 · Checked in · General Access",
        consent: "Granted",
        consentNote: "Attendee agreed to share in event memory.",
        screening: "No issue detected · Human review required.",
        actionNote:
          "Approval adds this photo to the shared event memory. Rejection stays private to moderators and the submitter.",
        momentTitle: "Find Something Blue",
      },
      {
        id: "q1",
        responseId: "q1",
        caption: "Blue light",
        authorMeta: "Kunle Bello · Neon Solstice · 21:39 WAT",
        imageUrl: "/overview/neon-solstice.jpg",
        submitter: "Kunle Bello",
        ticketMeta: "NS-0429 · Checked in · General Access",
        consent: "Granted",
        consentNote: "Attendee agreed to share in event memory.",
        screening: "No issue detected · Human review required.",
        actionNote:
          "Approval adds this photo to the shared event memory. Rejection stays private to moderators and the submitter.",
        momentTitle: "Find Something Blue",
      },
      {
        id: "q2",
        responseId: "q2",
        caption: "Room moment",
        authorMeta: "Kemi Adeyemi · Neon Solstice · 21:40 WAT",
        imageUrl: "/overview/neon-solstice.jpg",
        submitter: "Kemi Adeyemi",
        ticketMeta: "NS-0430 · Checked in · General Access",
        consent: "Granted",
        consentNote: "Attendee agreed to share in event memory.",
        screening: "No issue detected · Human review required.",
        actionNote:
          "Approval adds this photo to the shared event memory. Rejection stays private to moderators and the submitter.",
        momentTitle: "Room moment",
      },
      {
        id: "q3",
        responseId: "q3",
        caption: "Blue again",
        authorMeta: "Bola Akande · Neon Solstice · 21:40 WAT",
        imageUrl: "/overview/neon-solstice.jpg",
        submitter: "Bola Akande",
        ticketMeta: "NS-0431 · Checked in · General Access",
        consent: "Granted",
        consentNote: "Attendee agreed to share in event memory.",
        screening: "No issue detected · Human review required.",
        actionNote:
          "Approval adds this photo to the shared event memory. Rejection stays private to moderators and the submitter.",
        momentTitle: "Find Something Blue",
      },
    ],
    queueFooter: "Showing 3 of 12 other pending submissions",
  };
}
