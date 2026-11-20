# Organizer dashboard — backend API gaps

**Context:** Organizer web app has consumed Postman **17 Organizer (web app)** folders: Auth, Workspace, Events, Tickets, Door, Sales, Live games.  
**Deferred on frontend:** Reports / analytics.  
**Ask:** Confirm or add the endpoints below so remaining Figma screens can be wired.

---

## A. Screens still partially mock / incomplete wiring

| Screen | Need |
|--------|------|
| Experience Builder | Run-of-show GET/PUT wired (Add + Save); import / named versions still open |
| Moments (`/moments`) | Gallery list + approve/reject wired; rejection-reason field still UI-only |
| Payouts | Summary/balances/history + filters + bank resolve/add/default + transfer create wired. **Export statement still 404**. Workspace may return `payoutsEnabled: false` (transfers 409). **`POST .../bank-accounts/resolve` is wired correctly** (`{ bankCode, accountNumber }` → `accountName`) but live API currently returns 400 `We could not find that account` for all probed NUBANs (incl. previously working Access `044`/`0123456789`) — **Paystack/provider name-enquiry config on backend** |
| Team / Roles | Members list + invite + resend + save permissions wired; audit log still mock. **Invite email delivery unconfirmed / likely not sending** (API creates pending + accept token flow exists; no inbox mail observed) |
| Settings | Org/notifications/defaults + security (sign-in alerts + session revoke) wired |

---

## B. Gaps inside folders already consumed

### Events / event setup
- [x] `PATCH /organizer/experiences/:id` — wired in setup (Basics / Date-Venue)
- [x] Cover image upload (`POST .../cover`) — wired on Basics **Change cover**
- [ ] Allow category slug **`other`** on create/PATCH (UI has Other; API currently 400s)
- [ ] **`POST .../publish` is a no-op** — returns OK but `GET` still shows `status: "draft"` (blocks Upcoming). Confirm + fix; unpublish too.

### Tickets
- [x] `PATCH .../ticket-types/:id` — edit wired in Access (name / price / quantity / guestsPerTicket / description)
- [ ] Confirm backend persists `guestsPerTicket` + `description` on create/edit/detail

### Sales
- [x] Sales summary wired (`GET .../sales/summary`) with order-page fallback
- [x] Export statement wired (`GET .../sales/export`)
- [x] Other-event ledgers wired (`GET /organizer/sales/ledgers`) with city/currency fallback
- [ ] Date range + event filters in UI
- [ ] Confirm whether summary/ledger amounts are minor units (kobo) vs ticket `priceAmount`

### Door / Attendees
- [x] Export guest list wired (`GET .../guests/export`) — CSV or signed `{ url }`
- [ ] Server-side search / status filter on `GET .../guests` (UI filters client-side for now; export forwards `q`/`status`)
- [ ] Confirm guests payload includes pass `code` for row check-in

### Live games / Live Control
- [x] Response stream (`GET .../moments/:momentId/responses`) wired into Live Control
- [x] Poll tallies (`GET .../moments/:momentId/results`) wired into poll card
- [x] Presence (`GET .../live/presence`) wired into Active participants
- [x] Organizer leaderboard (`GET .../leaderboard`) wired
- [x] Pause all / End event (`POST .../live/pause|resume|end`) — wired in Live Control header + safety card (`end` requires `{ confirm: true }`)
- [ ] Incidents / safety log (list + create)
- [ ] Reminder / announcement history (POST Live tab update exists)
- [ ] Confirm photo review + restore shapes for Approve / Reject UI

### Workspace
- [x] Settings security (`GET`/`PATCH .../workspace/security` + `DELETE .../sessions/:id`) wired
- [ ] Confirm `PATCH /organizer/workspace` for Settings rename (API in Postman; UI not wired yet)

---

## C. Already working (no ask)

- Auth (register / verify / login / Google / me / password flows)
- Workspace GET
- Experiences list / get / create draft
- Ticket types create / delete
- Door check-in by pass `code`
- Guests + orders lists
- Live moments list / start / close; squads list; reports; submissions (partial UI)

---

## D. Suggested priority for backend

1. Experience **edit + publish** + ticket **edit** (finish setup flow)
2. **Sales summary** + fees
3. Experience Builder / scheduled moments persistence
4. Team / Roles + Settings
5. Payouts
6. Live Control presence, stream, leaderboard, pause/end
7. Moments gallery page
8. Exports (guests + sales)

---

## E. Paste blurb

> Organizer web has consumed Auth, Workspace, Events, Tickets, Door, Sales (summary/ledgers/export), Live games (incl. pause/resume/end), Settings security, Team, Payouts (minus export).  
> Still blocked: Payouts export endpoint. Team invite email delivery unconfirmed.  
> Still incomplete in existing folders: guest search server-side, Live Control incidents/reminders history.  
> Analytics/Reports deferred on our side.
