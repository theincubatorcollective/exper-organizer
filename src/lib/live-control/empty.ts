import type { LiveControlData } from "./types";

/** Neutral Live Control shell when APIs return nothing useful. */
export function emptyLiveControl(
  patch: Partial<LiveControlData> &
    Pick<LiveControlData, "eventTitle" | "eventMeta">,
): LiveControlData {
  return {
    syncLabel: "Synced just now",
    metrics: [
      { label: "Attendees", value: "0", detail: "registered people" },
      { label: "Checked in", value: "0", detail: "0 pending arrival" },
      { label: "Active participants", value: "—", detail: "not available yet" },
      { label: "Prompt respondents", value: "—", detail: "not available yet" },
    ],
    livePrompt: {
      indexLabel: "—",
      title: "No live prompt",
      detail: "Start a moment when the room is ready",
      remaining: "--:--",
      totalLabel: "no active timer",
      answered: 0,
      active: 0,
      answeredPercent: "0%",
      remainingToAnswer: 0,
      footerNote: "No answers yet.",
      sendNextNote:
        "Sending next closes this prompt first. Attendees keep their submitted answers.",
    },
    activeMomentId: null,
    responses: [],
    queue: [],
    poll: {
      title: "No poll yet",
      closedLabel: "—",
      respondents: 0,
      options: [],
    },
    photo: {
      pending: 0,
      title: "No photo waiting",
      author: "—",
      consent: "—",
      imageUrl: "",
      approved: 0,
      pendingCount: 0,
      rejected: 0,
      submitted: 0,
    },
    participation: {
      active: 0,
      checkedIn: 0,
      activePercent: "0%",
      inactiveCheckedIn: 0,
      registered: 0,
      pendingArrival: 0,
      promptRespondents: 0,
      quizCorrectPercent: "—",
      quizDetail: "Quiz tallies are not available from the organizer API yet.",
    },
    roomFeel: { people: 0, series: [], moods: [] },
    leaderboard: [],
    squads: [],
    arrivals: {
      checkedIn: 0,
      checkedInPercent: "0%",
      registered: 0,
      pending: 0,
      recent: [],
    },
    reminders: [],
    incidents: [],
    ...patch,
  };
}
