export type MomentTab = "pending" | "approved" | "rejected";

export type MomentQueueItem = {
  id: string;
  name: string;
  action: string;
  detail: string;
};

export type MomentSubmission = {
  id: string;
  responseId: string;
  caption: string;
  authorMeta: string;
  imageUrl: string;
  submitter: string;
  ticketMeta: string;
  consent: string;
  consentNote: string;
  screening: string;
  actionNote: string;
  momentTitle: string;
};

export type MomentsData = {
  eventMeta: string;
  counts: {
    pending: number;
    approved: number;
    rejected: number;
  };
  /** Submissions for the active tab (oldest first). */
  items: MomentSubmission[];
  queueFooter: string;
};
