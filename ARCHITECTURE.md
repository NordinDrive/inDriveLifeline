# Architecture

## State and synchronization

- **One store:** `src/app/store.ts` is a single Zustand store holding `domain` (business state) and `ui` (per-phone screens, menus, stage settings). The Passenger, Driver and Admin components subscribe to the same object, so a change in one view re-renders the others in the same frame. No polling and no network.
- **Pure transitions:** every business action is a pure function in `src/domain/workflow.ts`: `(state, args, now) → { state, ok, reasons, notices }`. The store's `perform()` applies the new state, shows the notices as in-phone notification banners, and surfaces any refusal reason as a toast. UI components never mutate domain state directly.
- **Persistence:** the store is mirrored to `localStorage` (key `indrive-lifeline-demo-v2`), so a reload keeps the scene. Saves are validated on load and on tab sync: the old `v1` key is deleted, and any save with NGO, campaign or service-type data is discarded rather than restored. **Reset Demo** replaces the domain with `createInitialState()`: an inactive scenario, no requests, no missions, no bonuses. The theme is kept.
- **Theme:** `ui.stage.theme` (`dark` | `light`) is part of the synced UI state. `App.tsx` writes it to `<html data-theme>`, and an inline script in `index.html` applies the saved value before first paint. `tokens.css` defines every colour as a variable, with a `:root[data-theme='light']` override. `app.css` and the SVG map (through CSS classes, not inline fills) only use those variables.
- **Tab sync (optional):** each store change is posted on a `BroadcastChannel`, with the `storage` event as a fallback. This only syncs tabs of the same origin in one browser. Real multi-device use would need a backend; see below.

## Business rules (all in `src/domain`)

| Module | Responsibility |
|---|---|
| `dispatch.ts` | Safety gates shared by requests and missions: Admin-activated scenario, pickup in the selected area, designated pickup point, approved shelter, route approved in the scenario. `requestGates()` adds "not already published" for Admin approval. `acceptGates()` adds the volunteer's eligibility and "mission still open". For trips already under way, only the route and location gates apply, so resolving a scenario does not strand a trip. |
| `eligibility.ts` | Volunteer issues: joined and verified, online, **available for Lifeline**, not busy, enough seats, wheelchair-accessible vehicle when needed. |
| `hazard.ts` | Fictional geometry. Each scenario template (earthquake, flood, wildfire, storm) is a polygon placed on a demo district and scaled by severity. A route crossing it is `blocked`; a route within the type's buffer distance is `unknown`. A point inside it is not authorized. |
| `rewards.ts` | Demo amounts (25 MAD trip fare, kept separate from the 15 MAD Lifeline bonus) and `canApproveBonus()`. |
| `workflow.ts` | All transitions, plus `reconcile()`, which re-applies safety gates whenever the scenario changes. |
| `metrics.ts` | Impact KPIs **derived** from state, so they cannot double-count. |

### Invariants (covered by `tests/`)

- No requests or offers without an Admin-activated scenario, and only from designated pickup points in the selected area to approved shelters.
- Drivers who have not joined, are pending, suspended or not available cannot accept. Seats and wheelchair needs must match.
- `blocked` and `unknown` routes can never be approved. Admin approval publishes the mission exactly once.
- A mission has at most one driver. A second accept is refused.
- A bonus moves `pending_completion → pending_confirmation → approved` only after Admin confirmation, and only once. A held bonus stays held until released. Cancelled missions are `not_eligible`.
- Changing a scenario withdraws open offers that no longer pass, and pauses in-progress trips whose route became unsafe (`safetyHold`). Resolving closes open offers and unassigned requests, lets trips under way finish, and keeps completed history and earnings.
- Repeated clicks are idempotent: duplicate submissions return the existing request, and repeated confirmations are refused.

### Lifecycles

- **Request:** `under_review → approved` (approval publishes the mission), or `rejected` / `blocked` / `cancelled`
- **Mission:** `offered → accepted → en_route → at_pickup → onboard → arrived → awaiting_confirmation → confirmed` (or `cancelled` / `blocked`)
- **Volunteer:** `not_enrolled → pending_review → verified` (or `suspended` / `expired`), plus the volunteer's own `available` switch
- **Bonus:** `pending_completion → pending_confirmation → approved` (or `held` / `not_eligible`)
- **Scenario:** `inactive → active → resolved`

The passenger tracker maps these to customer-facing steps: Submitted → Admin review → Route approved → Volunteer driver assigned → Driver on the way → Picked up → Arrived at shelter → Admin confirmed.

## Safety boundaries

- Every alert is labeled **SIMULATED — NOT A REAL EMERGENCY**, and no real emergency numbers are shown.
- Lifeline is never presented as rescue or ambulance transport. It moves people only between designated pickup points and approved shelters.
- Route safety comes from Admin-controlled mock data and fictional geometry. The prototype does **not** assess real-world safety.
- Drivers can refuse or pause any task without penalty, and bonuses never depend on speed.

## Limitations and what production would need

- **No backend:** state lives in one browser. Production needs authenticated role-based APIs, a transactional database (idempotent payouts, locking on accept), audit storage and real-time push (WebSockets or SSE).
- **Verification and payouts are simulated.** Production needs identity and document checks, plus finance and tax review.
- **Hazard and route data are invented.** There are no real disaster feeds or geolocation. Production would need authorised feeds from authorities and response partners, plus a human incident lead.
- **No accessibility audit has been done beyond basics:** keyboard focus, labels, contrast and `prefers-reduced-motion` are handled.
