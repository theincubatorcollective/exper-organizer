# Organizer dashboard — backend API gaps

**Context:** Organizer web app has consumed Postman **17 Organizer (web app)** folders: Auth, Workspace, Events, Tickets, Door, Sales, Live games.  
**Deferred on frontend:** Reports / analytics.  
**Ask:** Confirm or add the endpoints below so remaining Figma screens can be wired.

---

## A. Screens with no organizer API yet

| Screen | Need |
|--------|------|
| Experience Builder | Prompt / run-of-show CRUD, schedule moments, save versions |
| Moments (`/moments`) | Organizer moments gallery + moderation feed |
| Payouts | Balances, payout history, multi-currency ledgers |
| Team / Roles | Invite members, roles, permissions |
| Settings | Org profile, notifications, security (beyond workspace rename) |

---

## B. Gaps inside folders already consumed

### Events / event setup
- [x] `PATCH /organizer/experiences/:id` — wired in setup (Basics / Date-Venue)
- [ ] Cover image upload
- [ ] **`POST .../publish` is a no-op** — returns OK but `GET` still shows `status: "draft"` (blocks Upcoming). Confirm + fix; unpublish too.

### Tickets
- [ ] `PATCH .../ticket-types/:id` — edit name / price / quantity (create + delete already used)
- [ ] Confirm guests-per-ticket (and any other ticket fields) on create/edit/detail

### Sales
- [ ] Sales summary: gross, refunds, **fees**, net (not page-1 order sums)
- [ ] Export statement
- [ ] Date range + event filters
- [ ] Other-event ledger **amounts** (city/currency alone is not enough)

### Door / Attendees
- [ ] Export guest list
- [ ] Server-side search / status filter on `GET .../guests`
- [ ] Confirm guests payload includes pass `code` for row check-in

### Live games / Live Control
- [ ] Organizer read for **response stream** + live poll tallies
- [ ] Presence / “active in last 5 minutes”
- [ ] Organizer **leaderboard**
- [ ] Pause all / End event
- [ ] Incidents / safety
- [ ] Reminder / announcement history (POST Live tab update exists)
- [ ] Confirm photo review + restore shapes for Approve / Reject UI

### Workspace
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

> Organizer web has consumed Auth, Workspace, Events, Tickets, Door, Sales, and Live games.  
> Still blocked: Experience Builder, Moments gallery, Payouts, Team/Roles, Settings (beyond workspace).  
> Still incomplete in existing folders: experience edit/publish, ticket edit, sales summary (gross/fees/refunds/export), guest export/search, Live Control stream/presence/leaderboard/pause/end/incidents.  
> Analytics/Reports deferred on our side.
