# Organizer web app — backend API request

**Audience:** Backend  
**Product:** EXPER organizers dashboard  
**Auth:** Bearer access token (`Authorization: Bearer <accessToken>`), same as existing `/api/v1/organizer/*`  
**Base:** `/api/v1`  
**Out of scope for this request:** Reports / analytics (frontend deferred)

This doc lists **everything the Figma-built organizer UI still needs**. Some routes already exist in Postman (`17 Organizer`); for those we need **confirmed response shapes** or **small extensions**. New routes are marked **NEW**.

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
| Events | GET | `/organizer/experiences` |
| Events | POST | `/organizer/experiences` |
| Events | GET | `/organizer/experiences/:experienceId` |
| Tickets | POST | `/organizer/experiences/:experienceId/ticket-types` |
| Tickets | DELETE | `/organizer/experiences/:experienceId/ticket-types/:ticketTypeId` |
| Door | POST | `/organizer/experiences/:experienceId/check-in` body `{ code }` |
| Sales / Door | GET | `/organizer/experiences/:experienceId/guests?page&limit` |
| Sales | GET | `/organizer/experiences/:experienceId/orders?page&limit` |
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
  "category": "music",
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

**UI:** Event setup Basics + Date/Venue save.

---

### 2.2 Cover image upload — **NEW**

`POST /organizer/experiences/:experienceId/cover`

- `multipart/form-data` field `file` (jpg/png/webp)
- **Response:**

```json
{
  "coverImageUrl": "https://cdn.example.com/…"
}
```

**UI:** Basics “Change cover”.

---

### 2.3 Publish / unpublish — **BROKEN on current backend (2026-11-17)**

`POST /organizer/experiences/:experienceId/publish`  
`POST /organizer/experiences/:experienceId/unpublish`

- Body: `{}`
- **Required response:** full experience with `status: "published"` (publish) or `status: "draft"` (unpublish)

**Confirmed frontend repro:**
1. Organizer creates a draft via `POST /organizer/experiences` (or saves setup).
2. UI calls `POST /organizer/experiences/:id/publish` with `{}` (200 OK).
3. Immediate `GET /organizer/experiences/:id` still returns `status: "draft"` (or equivalent unpublished).
4. Fallback `PATCH` with `{ "status": "published" }` also does not flip status (rejected or ignored).

**Please fix so publish is durable:** after a successful publish POST, both `GET /organizer/experiences` and `GET /organizer/experiences/:id` must return `status: "published"` (case-insensitive is fine). Until this works, Events → Upcoming stays empty and Drafts keep a Publish error.

**UI:** Review “Publish event” + Drafts row “Publish”.

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

Needed to persist the run-of-show (not only fire-and-forget `POST moments`).

### 7.1 List / replace run of show

`GET /organizer/experiences/:experienceId/run-of-show`  
`PUT /organizer/experiences/:experienceId/run-of-show`

```json
{
  "prompts": [
    {
      "id": "optional-client-id",
      "type": "room_vote|wrong_answers|photo_prompt|squad_mission|squad_vote",
      "title": "One has to go",
      "supportingText": "…",
      "scheduledAt": "2026-10-25T20:30:00Z",
      "durationSeconds": 120,
      "audience": "everyone|checked_in|squad",
      "rewardPoints": 50,
      "content": {},
      "moderation": "none|required",
      "responseLimit": "one_per_person"
    }
  ]
}
```

### 7.2 Save version (optional)

`POST /organizer/experiences/:experienceId/run-of-show/versions`

```json
{ "label": "Doors open v3" }
```

### 7.3 Import / duplicate (optional)

`POST /organizer/experiences/:experienceId/run-of-show/import`

```json
{ "fromExperienceId": "…" }
```

**UI:** `/experience-builder` — edit prompts, times, Save version, Import.

---

## 8. Moments gallery (`/moments`) — **NEW or extend submissions**

Photo memory moderation across the event (not only one live mission).

### 8.1 List submissions

`GET /organizer/experiences/:experienceId/moments-gallery`

**Query:** `status=pending|approved|rejected`, `page`, `limit`

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

### 8.2 Moderate

Reuse `POST .../responses/:responseId/review` `{ "approved": true|false }`  
**or** gallery-specific:

`POST /organizer/experiences/:experienceId/moments-gallery/:id/review`

---

## 9. Payouts — **NEW module**

### 9.1 Summary

`GET /organizer/payouts/summary?currency=NGN&from=&to=`

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
      "needsAttention": false
    }
  ]
}
```

### 9.3 Bank accounts

`GET /organizer/payouts/bank-accounts`

```json
{
  "data": [
    {
      "id": "…",
      "label": "Afterhours Studio Ltd · GTBank · •••• 4829",
      "currency": "NGN",
      "isDefault": true
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

---

## 10. Team / Roles — **NEW module**

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
      "eventAccess": "selected",
      "experienceIds": ["…"],
      "status": "active|pending",
      "isYou": false
    }
  ]
}
```

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
    "editEvents": false
  }
}
```

### 10.5 Remove member

`DELETE /organizer/workspace/members/:memberId`

### 10.6 Role permission catalog (optional)

`GET /organizer/workspace/roles`

Returns default permission matrix for each role key.

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
| P0 | Experience PATCH + publish/unpublish + ticket PATCH (+ guestsPerTicket) |
| P0 | Guests: `code`, search/filter; check-in response shape |
| P0 | Sales summary + order row contract |
| P1 | Moment responses stream + poll results + presence |
| P1 | Experience Builder run-of-show GET/PUT |
| P1 | Moments gallery list + review |
| P2 | Payouts module |
| P2 | Team / Roles module |
| P2 | Settings (profile, security, notifications, defaults) |
| P2 | Exports (guests CSV, sales statement) |
| P3 | Live pause/end, incidents, leaderboard, updates history, cover upload |

---

## 13. What we are **not** asking for now

- Reports / analytics dashboards  
- Consumer/player-only routes (unless you prefer we BFF them — we would rather have organizer-scoped mirrors)

---

## 14. Contact / next step

Please reply with:

1. Which items already exist (with OpenAPI or example JSON)  
2. Which you will add, with ETA  
3. Any amount unit clarification (major vs minor) for tickets/orders/payouts
