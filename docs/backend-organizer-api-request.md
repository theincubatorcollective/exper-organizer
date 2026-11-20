# Organizer web app — backend API request

**Audience:** Backend  
**Product:** EXPER organizers dashboard  
**Auth:** Bearer access token (`Authorization: Bearer <accessToken>`), same as existing `/api/v1/organizer/*`  
**Base:** `/api/v1`  
**Out of scope for this request:** Reports / analytics (frontend deferred)  
**Updated:** 2026-11-19

This doc lists **everything the Figma-built organizer UI still needs**. Some routes already exist in Postman (`17 Organizer`); for those we need **confirmed response shapes** or **small extensions**. New routes are marked **NEW**.

### Screens still on Figma mocks (blocked on APIs in this doc)

| Screen | Route in app | Section |
|--------|--------------|---------|
| Event setup — **Change cover** | `/events/setup/basics` | §2.2 *(frontend wired)* |
| Experience Builder | `/experience-builder` | §7 |
| Moments gallery | `/moments` | §8 |
| Payouts | `/payouts` | §9 |
| Team / Roles | `/team` | §10 |

Please treat §§2.2, 7–10 as the **primary delivery ask** in this send. Confirm what already exists (OpenAPI / example JSON) and what you will add with ETA.

---

## 0. Conventions (please match existing organizer APIs)

| Topic | Expectation |
|--------|-------------|
| Success | `200` / `201` with JSON body, or `204` with empty body |
| Errors | `{ "message": string \| string[] }` + appropriate status (`400`, `401`, `403`, `404`, `409`, `429`) |
| Lists | Prefer `{ data, page, limit, total, hasMore }` (same as guests/orders) |
| Money | Document whether amounts are **major units** (e.g. NGN naira) or **minor** (kobo). Organizer ticket create currently treats `priceAmount` as major units in the web app. |
| IDs | UUID strings |
| Datetimes | ISO-8601 UTC |

---

## 1. Already consumed (keep stable)

Frontend already uses these. Do not break them.

| Area | Method | Path |
|------|--------|------|
| Auth | POST | `/organizer/auth/register`, `/verify`, `/login`, `/google`, `/forgot-password`, … |
| Auth | GET | `/organizer/me` |
| Workspace | GET | `/organizer/workspace` |
| Workspace | PATCH | `/organizer/workspace` (rename) |
| Events | GET | `/organizer/experiences` |
| Events | POST | `/organizer/experiences` |
| Events | GET | `/organizer/experiences/:experienceId` |
| Events | PATCH | `/organizer/experiences/:experienceId` |
| Events | POST | `/organizer/experiences/:experienceId/publish`, `/unpublish` |
| Tickets | POST | `/organizer/experiences/:experienceId/ticket-types` |
| Tickets | PATCH | `/organizer/experiences/:experienceId/ticket-types/:ticketTypeId` |
| Tickets | DELETE | `/organizer/experiences/:experienceId/ticket-types/:ticketTypeId` |
| Door | POST | `/organizer/experiences/:experienceId/check-in` body `{ code }` |
| Sales / Door | GET | `/organizer/experiences/:experienceId/guests?page&limit` |
| Sales / Door | GET | `/organizer/experiences/:experienceId/guests/export` |
| Sales | GET | `/organizer/experiences/:experienceId/orders?page&limit` |
| Sales | GET | `/organizer/experiences/:experienceId/sales/summary` |
| Sales | GET | `/organizer/experiences/:experienceId/sales/export` |
| Sales | GET | `/organizer/sales/ledgers` |
| Live | GET/POST | `/organizer/experiences/:experienceId/moments` |
| Live | POST | `/organizer/experiences/:experienceId/moments/:momentId/close` |
| Live | GET | `/organizer/experiences/:experienceId/moments/:momentId/submissions` |
| Live | POST | `/organizer/experiences/:experienceId/responses/:responseId/review` |
| Live | GET | `/organizer/experiences/:experienceId/reports` |
| Live | POST | `/organizer/experiences/:experienceId/responses/:responseId/restore` |
| Live | GET/POST | `/organizer/experiences/:experienceId/squads` (+ members) |
| Live | POST | `/organizer/experiences/:experienceId/updates` |

---

## 2. Events / event setup (extend existing)

### 2.1 Edit experience — **EXISTS in Postman; need full contract**

`PATCH /organizer/experiences/:experienceId`

**Request body** (all fields optional; send only changed):

```json
{
  "title": "Neon Solstice",
  "summary": "Short blurb",
  "description": "Long description",
  "category": "music|art|food|nightlife|outdoors|wellness|tech|film|sports|culture|other",
  "city": "Lagos",
  "country": "Nigeria",
  "venueName": "Landmark Beach",
  "address": "Water Corporation Road, Victoria Island",
  "startsAt": "2026-10-25T19:00:00Z",
  "endsAt": "2026-10-26T02:30:00Z",
  "timezone": "Africa/Lagos",
  "capacity": 1600,
  "showVenueBeforePurchase": true,
  "currency": "NGN",
  "refundPolicy": "Refunds available until 48 hours before doors."
}
```

**Response:** full experience object (same shape as `GET .../experiences/:id`).

**Category enum (blocking):** today API accepts  
`music | art | food | nightlife | outdoors | wellness | tech | film | sports | culture`  
and **rejects** `other` with 400. Organizer Basics has an **Other** option for events that do not fit those buckets — please **add `other`** to create + PATCH validation (same list on both).

**UI:** Event setup Basics + Date/Venue save.

---

### 2.2 Cover image upload — **EXISTS (frontend wired)**

Basics **Change cover** is wired to this route. Keep the contract stable.

`POST /organizer/experiences/:experienceId/cover`

- Content-Type: `multipart/form-data`
- Field: `file` (required) — accept `image/jpeg`, `image/png`, `image/webp`
- Optional: `crop` / aspect hint if you support server-side crop (UI is ~16:9 / 21:9 hero)
- Max size: please document (frontend will enforce the same; suggest ≤ 5–8 MB)

**Response (preferred):**

```json
{
  "coverImageUrl": "https://cdn.example.com/…",
  "coverImageMeta": {
    "width": 2400,
    "height": 1350,
    "contentType": "image/jpeg",
    "bytes": 482193
  }
}
```

**Also acceptable:** return the full experience object with `coverImageUrl` set (same as `GET .../experiences/:id`).

**Alternate (if you prefer JSON):**

`PATCH /organizer/experiences/:experienceId` with `{ "coverImageUrl": "https://…" }` after a generic upload endpoint — only if upload lives elsewhere. Prefer the dedicated `POST .../cover` so the organizer app does not need a separate media service.

**Create-flow note:** Cover upload requires an `experienceId`. Frontend already creates a draft via `POST /organizer/experiences` before Basics save. Please allow cover upload on **`draft`**, **`pending_review`**, and **`published`**.

**Optional:**

`DELETE /organizer/experiences/:experienceId/cover` → clear cover / revert to default.

**UI:** Event setup Basics — “Change cover” button + attendee preview / Events / Overview heroes that read `coverImageUrl`.

---

### 2.3 Publish / unpublish — **moderation-aware (updated 2026-11-19)**

`POST /organizer/experiences/:experienceId/publish`  
`POST /organizer/experiences/:experienceId/unpublish`

- Body: `{}`
- **Accepted publish outcomes:**
  - `status: "published"` → listed (Upcoming / Live / Past by dates)
  - `status: "pending_review"` → moderation queue (stays under Drafts with “Pending review”; not listed yet)
- **Unpublish:** `status: "draft"`

Frontend treats both `published` and `pending_review` as a successful Publish click. Only a stuck plain `draft` after publish is an error.

**UI:** Review “Publish event” + Drafts row “Publish” (hidden while pending review).

---

### 2.4 Get experience — **extend response**

`GET /organizer/experiences/:experienceId`

Please always include (needed by Sales + Access + Live):

```json
{
  "id": "…",
  "title": "…",
  "status": "draft|published",
  "timezone": "Africa/Lagos",
  "capacity": 1600,
  "coverImageUrl": "https://…",
  "startsAt": "…",
  "endsAt": "…",
  "venue": { "name": "…", "address": "…", "city": "…" },
  "ticketTypes": [
    {
      "id": "…",
      "name": "General Access",
      "price": { "amount": 25000, "currency": "NGN" },
      "quantityTotal": 1000,
      "quantitySold": 0,
      "guestsPerTicket": 1,
      "description": "…"
    }
  ]
}
```

---

## 3. Tickets (extend existing)

### 3.1 Edit ticket type — **EXISTS; confirm body**

`PATCH /organizer/experiences/:experienceId/ticket-types/:ticketTypeId`

```json
{
  "name": "VIP · Soundscape",
  "priceAmount": 65000,
  "quantityTotal": 200,
  "guestsPerTicket": 1,
  "description": "Elevated mezzanine"
}
```

**Response:** ticket type object (same fields as create).

### 3.2 Create ticket type — **extend**

`POST .../ticket-types` currently: `{ name, priceAmount, quantityTotal }`

Please also accept optional:

```json
{
  "guestsPerTicket": 4,
  "description": "One QR per guest"
}
```

---

## 4. Door / Attendees (extend existing)

### 4.1 Guests list — **extend query + fields**

`GET /organizer/experiences/:experienceId/guests`

**Query:**

| Param | Notes |
|-------|--------|
| `page`, `limit` | existing (`limit` max 50) |
| `q` | **NEW** — search name, email, ticket ref, pass code |
| `status` | **NEW** — `all` \| `pending` \| `checked_in` |

**Each row must include:**

```json
{
  "id": "…",
  "passId": "…",
  "code": "3F9A-C21B-77D0-4E8E",
  "number": "NS-0428",
  "fullName": "Ada Okafor",
  "email": "ada@example.com",
  "checkedInAt": "2026-10-25T20:38:00Z",
  "ticketType": { "id": "…", "name": "General Access" }
}
```

`code` is required for row **Check in →**.

### 4.2 Export guest list — **NEW**

`GET /organizer/experiences/:experienceId/guests/export`

- Query: same filters as list (`q`, `status`)
- Response: `text/csv` **or** `{ "url": "https://…signed…" }`

**UI:** Attendees “Export guest list”.

### 4.3 Check-in — **confirm response**

`POST /organizer/experiences/:experienceId/check-in`

```json
{ "code": "3F9A-C21B-77D0-4E8E" }
```

Preferred response:

```json
{
  "outcome": "admitted|already_used|cancelled|wrong_experience|not_found",
  "guest": {
    "fullName": "Ada Okafor",
    "ticketTypeName": "General Access",
    "number": "NS-0428"
  }
}
```

---

## 5. Sales (extend + new)

### 5.1 Orders list — **confirm row shape**

`GET /organizer/experiences/:experienceId/orders?page&limit`

Needed fields per order:

```json
{
  "id": "…",
  "number": "NS-1048",
  "status": "pending|paid|failed|cancelled|expired|refunded",
  "createdAt": "…",
  "paidAt": "…",
  "currency": "NGN",
  "totalAmount": 25000,
  "buyer": { "fullName": "Tolu James", "email": "…" },
  "lines": [
    {
      "ticketType": { "id": "…", "name": "General Access" },
      "quantity": 1,
      "unitAmount": 25000
    }
  ]
}
```

### 5.2 Sales summary — **NEW**

`GET /organizer/experiences/:experienceId/sales/summary`

**Query (optional):** `from`, `to` (ISO dates), `currency`

```json
{
  "currency": "NGN",
  "grossTicketSales": 35300000,
  "grossOrderCount": 1012,
  "refundsAmount": 425000,
  "refundsGuestPlaces": 17,
  "feesAmount": 1046250,
  "netAfterFees": 33828750,
  "guestPlaces": 1240,
  "accessSold": [
    {
      "ticketTypeId": "…",
      "name": "General Access",
      "unitAmount": 25000,
      "ticketsSold": 756,
      "guestPlaces": 756,
      "grossAmount": 18900000
    }
  ],
  "refundedAccess": {
    "amount": 425000,
    "tickets": 17,
    "guestPlaces": -17
  },
  "complimentaryAccess": {
    "amount": 0,
    "guestPlaces": 17
  },
  "footerNote": "optional human-readable breakdown"
}
```

**UI:** Sales top metrics + Access sold + footer.

### 5.3 Workspace ledgers (other events) — **NEW**

`GET /organizer/sales/ledgers`

```json
{
  "data": [
    {
      "experienceId": "…",
      "title": "Rooftop Sessions",
      "city": "London",
      "currency": "GBP",
      "grossAmount": 6545,
      "status": "published|draft"
    }
  ]
}
```

### 5.4 Export statement — **NEW**

`GET /organizer/experiences/:experienceId/sales/export`

- Query: `from`, `to`, `currency`
- Response: CSV or signed URL

---

## 6. Live games / Live Control (extend + new)

**Frontend status:** Response stream, poll results, presence, and leaderboard are consumed on Live Control. Pause/end, incidents, and update history are still open.

### 6.1 List moments — **confirm shape**

`GET /organizer/experiences/:experienceId/moments`

Optional query: `status=live|scheduled|closed`

```json
{
  "data": [
    {
      "id": "…",
      "type": "wrong_answers|room_vote|squad_vote|photo_prompt|squad_mission",
      "status": "live|scheduled|closed",
      "title": "…",
      "subtitle": "…",
      "startsAt": "…",
      "endsAt": "…",
      "closedAt": null,
      "durationSeconds": 180,
      "responseCount": 38,
      "content": {}
    }
  ]
}
```

### 6.2 Moment responses / stream — **NEW (critical)**

`GET /organizer/experiences/:experienceId/moments/:momentId/responses`

**Query:** `page`, `limit`, `sort=newest|laughs`, `flagged=true|false`

```json
{
  "data": [
    {
      "id": "…",
      "text": "Updating Windows. We're at 97%.",
      "author": "Kemi",
      "createdAt": "2026-10-25T20:41:08Z",
      "laughs": 24,
      "flagged": false
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 38,
  "hasMore": false
}
```

**UI:** Live Control “Response stream”.

### 6.3 Poll results on moment — **extend moment or NEW**

Either embed on moment:

```json
{
  "results": {
    "respondents": 240,
    "options": [
      { "id": "opt_1", "label": "We should hang soon", "votes": 132, "percent": 55 }
    ]
  }
}
```

Or:

`GET /organizer/experiences/:experienceId/moments/:momentId/results`

### 6.4 Presence / active participants — **NEW**

`GET /organizer/experiences/:experienceId/live/presence`

```json
{
  "activeLast5Minutes": 876,
  "checkedIn": 1216,
  "registered": 1240
}
```

### 6.5 Organizer leaderboard — **NEW**

`GET /organizer/experiences/:experienceId/leaderboard?limit=20`

```json
{
  "data": [
    { "userId": "…", "displayName": "Femisola", "points": 2480 }
  ]
}
```

### 6.6 Pause / end event — **NEW**

`POST /organizer/experiences/:experienceId/live/pause`  
`POST /organizer/experiences/:experienceId/live/resume`  
`POST /organizer/experiences/:experienceId/live/end`

- Body: `{}` (end may require `{ "confirm": true }`)
- Effect: pause/close live moments; mark experience live phase ended

### 6.7 Incidents / safety — **NEW**

`GET /organizer/experiences/:experienceId/incidents`  
`POST /organizer/experiences/:experienceId/incidents`

```json
{
  "title": "North entrance queue",
  "detail": "Extra steward requested; no injury reported.",
  "status": "open|resolved"
}
```

`PATCH /organizer/experiences/:experienceId/incidents/:incidentId`

### 6.8 Live updates history — **NEW**

`GET /organizer/experiences/:experienceId/updates?page&limit`

(POST updates already exists.)

### 6.9 Photo review — **confirm**

Existing:

- `GET .../moments/:momentId/submissions`
- `POST .../responses/:responseId/review` `{ "approved": true|false }`

Please return on each submission:

```json
{
  "id": "…",
  "responseId": "…",
  "imageUrl": "https://…",
  "author": "Ada Okafor",
  "createdAt": "…",
  "consent": true,
  "status": "pending|approved|rejected",
  "caption": "optional"
}
```

---

## 7. Experience Builder — **NEW module**

**UI status:** `/experience-builder` consumes run-of-show GET/PUT (Add + Save). Import / named versions still 404. Live Control still starts moments via `POST .../moments`.

Needed to schedule / edit prompts before the night (not only start/close live moments).

### 7.1 List / replace run of show

`GET /organizer/experiences/:experienceId/run-of-show`  
`PUT /organizer/experiences/:experienceId/run-of-show`  
(or `PATCH` with partial prompt updates — document which)

```json
{
  "timezone": "Africa/Lagos",
  "savedAt": "2026-10-25T20:35:00Z",
  "prompts": [
    {
      "id": "optional-client-id",
      "type": "room_vote|wrong_answers|photo_prompt|squad_mission|squad_vote",
      "title": "One has to go",
      "supportingText": "Pick the act that has to leave the stage.",
      "scheduledAt": "2026-10-25T20:30:00Z",
      "durationSeconds": 120,
      "audience": "everyone|checked_in|squad|squad_captains",
      "format": "multiple_choice|wrong_answers|photo|squad_text",
      "responseLimit": "one_per_person",
      "moderation": "none|required",
      "scoring": {
        "participationPoints": 5,
        "bonusPoints": 10
      },
      "ctaLabel": "Send my pick",
      "answerPlaceholder": "Choose one · Be honest.",
      "content": {},
      "status": "draft|ready|sent|closed"
    }
  ]
}
```

**UI fields to round-trip:** title, supporting text, scheduled time, duration, audience, format, response limit, moderation on/off, scoring copy, CTA / placeholder, status (Ready / Sent).

### 7.2 Save version (optional but in Figma)

`POST /organizer/experiences/:experienceId/run-of-show/versions`

```json
{ "label": "Doors open v3" }
```

`GET /organizer/experiences/:experienceId/run-of-show/versions` — list labels + timestamps for restore.

### 7.3 Import / duplicate (optional but in Figma)

`POST /organizer/experiences/:experienceId/run-of-show/import`

```json
{ "fromExperienceId": "…" }
```

**UI:** `/experience-builder` — prompt list, edit selected prompt, **Save version**, **Import**, reorder if you support it.

---

## 8. Moments gallery (`/moments`) — **NEW or extend submissions**

**UI status:** `/moments` consumes gallery list + `responses/:id/review` for approve/reject. Rejection-reason note is still UI-only.

Photo memory moderation across the event (not only one live mission).

### 8.1 List submissions

`GET /organizer/experiences/:experienceId/moments-gallery`

**Query:** `status=pending|approved|rejected`, `page`, `limit`, optional `experienceId` already in path

```json
{
  "data": [
    {
      "id": "…",
      "responseId": "…",
      "caption": "The room feels like it's breathing.",
      "imageUrl": "https://…",
      "submitterName": "Ada Okafor",
      "ticketNumber": "NS-0428",
      "ticketTypeName": "General Access",
      "checkedIn": true,
      "consent": true,
      "consentNote": "Attendee agreed to share in event memory.",
      "screening": "No issue detected · Human review required.",
      "status": "pending",
      "momentTitle": "Find Something Blue",
      "createdAt": "2026-10-25T20:39:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 13,
  "counts": { "pending": 13, "approved": 157, "rejected": 4 }
}
```

**UI:** Pending / Approved / Rejected counts; current submission (image, caption, submitter, ticket meta, consent, screening); side queue of other pending items.

### 8.2 Moderate

Reuse `POST .../responses/:responseId/review` `{ "approved": true|false }`  
**or** gallery-specific:

`POST /organizer/experiences/:experienceId/moments-gallery/:id/review`

```json
{ "approved": true }
```

**UI:** Approve / Reject on the gallery detail card. Approval → shared event memory; rejection stays private to moderators + submitter.

---

## 9. Payouts — **NEW module**

**UI status:** `/payouts` consumes summary (with `from`/`to`/`experienceId`), balances, banks catalog, bank-accounts (resolve/add/default), transfers list + create. Currency / event / date filters use query params. **Export statement still missing** (`GET .../payouts/export` 404).

### 9.1 Summary

`GET /organizer/payouts/summary?currency=NGN&from=&to=&experienceId=`

```json
{
  "currency": "NGN",
  "available": 8275000,
  "pendingSettlement": 25553750,
  "pendingDetail": "Neon Solstice · 28 Oct",
  "transferredInPeriod": 12640000,
  "transferredCount": 3
}
```

**UI cards:** Available · Pending settlement · Transferred in period.

### 9.2 Balances by currency

`GET /organizer/payouts/balances`

```json
{
  "data": [
    {
      "currency": "NGN",
      "country": "Nigeria",
      "available": 8275000,
      "pending": 25553750,
      "bankLabel": "GTBank · Verified",
      "needsAttention": false
    }
  ]
}
```

### 9.3 Bank accounts

`GET /organizer/payouts/bank-accounts`  
`POST /organizer/payouts/bank-accounts` (add / verify — if in scope)  
`PATCH /organizer/payouts/bank-accounts/:id` (set default)

```json
{
  "data": [
    {
      "id": "…",
      "label": "Afterhours Studio Ltd · GTBank · •••• 4829",
      "currency": "NGN",
      "isDefault": true,
      "status": "verified|needs_attention"
    }
  ]
}
```

### 9.4 Create transfer

`POST /organizer/payouts/transfers`

```json
{
  "currency": "NGN",
  "amount": 8275000,
  "bankAccountId": "…",
  "experienceId": null
}
```

**UI:** Transfer panel — from balance, bank account, amount, confirmation before funds leave. No FX.

### 9.5 Transfer history

`GET /organizer/payouts/transfers?currency=NGN&page&limit`

```json
{
  "data": [
    {
      "id": "…",
      "reference": "NGN-0823",
      "status": "completed|pending|failed",
      "amount": 5815000,
      "currency": "NGN",
      "bankLabel": "GTBank •••• 4829",
      "createdAt": "2026-10-21T00:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 3
}
```

**Please clarify:** amount units (major vs minor) for all payout money fields — same ask as tickets/orders.

### 9.6 Export statement — **NEW / missing**

`GET /organizer/payouts/export?currency=NGN&from=&to=&experienceId=`

Same pattern as sales export (CSV or `{ "url": "…" }`). Currently 404.

---

## 10. Team / Roles — **NEW module**

**UI status:** `/team` consumes members list, roles catalog, invite, resend, and active-member PATCH. Pending invites cannot be PATCH’d (API 404); cancel is `DELETE .../invites/:id` (not in Figma). Audit log still disabled.

### 10.1 List members

`GET /organizer/workspace/members`

```json
{
  "data": [
    {
      "id": "…",
      "fullName": "Kemi Adeyemi",
      "email": "kemi@afterhours.studio",
      "roles": ["Moderator"],
      "eventAccess": "all|selected",
      "experienceIds": ["…"],
      "experienceLabels": ["Neon Solstice"],
      "status": "active|pending",
      "isYou": false,
      "isOwner": false
    }
  ],
  "total": 6
}
```

**UI rows:** name, role badges (Owner / Moderator / Check-in / Finance / Live operator / Editor / Invite pending), email · event access, Resend for pending.

### 10.2 Invite

`POST /organizer/workspace/members/invites`

```json
{
  "email": "nia@afterhours.studio",
  "role": "editor|moderator|check_in|finance|live_operator|owner",
  "eventAccess": "all|selected",
  "experienceIds": ["…"]
}
```

### 10.3 Resend invite

`POST /organizer/workspace/members/invites/:inviteId/resend`

### 10.4 Update member

`PATCH /organizer/workspace/members/:memberId`

```json
{
  "role": "live_operator",
  "eventAccess": "selected",
  "experienceIds": ["…"],
  "permissions": {
    "runPrompts": true,
    "pauseEndLive": true,
    "viewPrivateSquadScores": true,
    "managePayouts": false,
    "manageTeam": false,
    "editEvents": false
  }
}
```

**UI permission toggles (Figma):** Run prompts & reminders · Pause / end live event · View private squad scores · Manage sales & payouts · Manage team permissions.

### 10.5 Remove member

`DELETE /organizer/workspace/members/:memberId`

### 10.6 Role permission catalog (optional)

`GET /organizer/workspace/roles`

Returns default permission matrix for each role key (Owner / Editor / Moderator / Check-in / Finance / Live operator).

---

## 11. Settings / Workspace — **extend + new**

### 11.1 Rename workspace — **EXISTS**

`PATCH /organizer/workspace`

```json
{ "name": "Afterhours studio" }
```

### 11.2 Organisation profile — **NEW / extend workspace**

`GET /organizer/workspace/settings`  
`PATCH /organizer/workspace/settings`

```json
{
  "name": "Afterhours studio",
  "legalName": "Afterhours Studio Ltd",
  "contactEmail": "hello@afterhours.studio",
  "supportWebsite": "https://afterhours.studio/support"
}
```

### 11.3 Security

`GET /organizer/workspace/security`  
`PATCH /organizer/workspace/security`

```json
{
  "twoFactorEnabled": true,
  "signInAlerts": true,
  "sessions": [
    {
      "id": "…",
      "label": "MacBook · Lagos",
      "current": true,
      "lastActiveAt": "…"
    }
  ]
}
```

`DELETE /organizer/workspace/security/sessions/:sessionId`

### 11.4 Notifications

`GET /organizer/workspace/notifications`  
`PATCH /organizer/workspace/notifications`

```json
{
  "liveIncidentAlerts": true,
  "payoutUpdates": true,
  "dailySummary": false,
  "dailySummaryHourLocal": 9
}
```

### 11.5 Event defaults

`GET /organizer/workspace/event-defaults`  
`PATCH /organizer/workspace/event-defaults`

```json
{
  "suggestedCountry": null,
  "defaultTimezone": "Africa/Lagos",
  "defaultCurrency": "NGN",
  "photoReviewRequired": true
}
```

---

## 12. Priority for delivery

| Priority | Deliver |
|----------|---------|
| ~~P0~~ | ~~Cover image upload~~ — **wired** on Basics (`POST .../cover`) |
| P0 | Guests: confirm `code` on rows; server-side `q` / `status` on list |
| P0 | Confirm sales summary / ledger / payout amount units (major vs minor) |
| **P1** | **Experience Builder** run-of-show GET/PUT (+ versions / import) |
| **P1** | **Moments gallery** list + review (Approve / Reject) |
| **P1** | **Payouts** summary, balances, bank accounts, transfers |
| **P1** | **Team / Roles** members, invite, resend, update, remove |
| P2 | Live: response stream, poll results, presence, pause/end, leaderboard, incidents |
| P2 | Settings: org profile, security, notifications, event defaults (beyond workspace rename) |
| P3 | Cover DELETE / replace edge cases; run-of-show version restore UX |

Frontend already wired (keep stable): experience PATCH + publish/unpublish, ticket PATCH, sales summary/ledgers/export, guests export.

---

## 13. What we are **not** asking for now

- Reports / analytics dashboards  
- Consumer/player-only routes (unless you prefer we BFF them — we would rather have organizer-scoped mirrors)

---

## 14. Contact / next step

Please reply with:

1. Which items already exist (with OpenAPI or example JSON) — especially **cover upload**, **Experience Builder**, **Moments gallery**, **Payouts**, **Team / Roles**  
2. Which you will add, with ETA  
3. Amount unit clarification (major vs minor) for tickets / orders / sales summary / payouts  
4. Whether Moments gallery reuses `.../responses/:id/review` or needs a dedicated gallery review route
