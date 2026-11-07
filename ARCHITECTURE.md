# Architecture

## State and synchronization

- **One store:** `src/app/store.ts` is a single Zustand store holding `domain` (business state) and `ui` (per-phone screens, menus, stage settings). The Passenger, Driver and Operator components subscribe to the same object, so a change in one view re-renders the others in the same frame. No polling and no network.
- **Pure transitions:** every business action is a pure function in `src/domain/workflow.ts`: `(state, args, now) → { state, ok, reasons, notices }`. The store's `perform()` applies the new state, shows the notices as in-phone notification banners, and surfaces any refusal reason as a toast. UI components never mutate domain state directly.
- **Persistence:** the store is mirrored to `localStorage`, so a reload keeps the scene. **Reset Demo** replaces it with `createInitialState()`, which is fully deterministic: fixed IDs, timestamps and seed records.
- **Tab sync (optional):** each store change is posted on a `BroadcastChannel`, with the `storage` event as a fallback. This only syncs tabs of the same origin in one browser. Real multi-device use would need a backend; see below.

## Business rules (all in `src/domain`)

| Module | Responsibility |
|---|---|
| `dispatch.ts` | The 8 dispatch gates from the spec: active scenario (for disaster transfers), need verified, pickup authorized, destination authorized, route approved in mock data, route approved by operator, an eligible verified driver available, not already dispatched. Also `acceptGates()` for one driver and one mission. |
| `eligibility.ts` | Driver issues: verification status, online, busy, seats vs passengers, wheelchair capability. |
| `hazard.ts` | Fictional geometry. Each scenario template (earthquake, flood, wildfire, storm) is a polygon placed on a demo district and scaled by severity. A route crossing it is `blocked`; a route within the type's buffer distance is `unknown`. A point inside it is not authorized. |
| `rewards.ts` | Illustrative earnings table (e.g. evacuation 25 + 15 MAD) and `canApproveBonus()`. |
| `workflow.ts` | All transitions, plus `reconcile()`, which re-applies safety gates whenever the scenario changes. |
| `metrics.ts` | Impact KPIs **derived** from state, so they cannot double-count. |

### Invariants (covered by `tests/`)

- Unverified, pending or suspended drivers cannot accept. Seats and wheelchair needs must match.
- `blocked` and `unknown` routes can never be approved or offered. There is no "no eligible driver" fallback.
- A mission has at most one driver. A second accept is refused.
- A bonus moves `pending_completion → pending_confirmation → approved` only after operator confirmation, and only once. A held bonus stays held until released. Cancelled missions are `not_eligible`.
- Changing or resolving a scenario withdraws open offers on routes that are no longer approved, and pauses in-progress trips (`safetyHold`). Completed history is kept.
- Repeated clicks are idempotent: duplicate submissions return the existing request, and repeated confirmations are refused.

### Lifecycles

- **Request:** `under_review → verified → approved` (or `rejected` / `blocked` / `cancelled`)
- **Mission:** `offered → accepted → en_route → at_pickup → onboard → arrived → awaiting_confirmation → confirmed` (or `cancelled` / `blocked`)
- **Driver:** `not_enrolled → pending_review → verified` (or `suspended` / `expired`)
- **Bonus:** `pending_completion → pending_confirmation → approved` (or `held` / `not_eligible`)
- **Scenario:** `inactive → active → resolved`

The passenger tracker maps these to customer-facing steps: Submitted → Needs Review → Approved → Searching for Driver → Driver Assigned → On the Way → Picked Up → Arrived → Confirmed.

## Safety boundaries

- Every alert is labeled **SIMULATED — NOT A REAL EMERGENCY**, and no real emergency numbers are shown.
- Lifeline is never presented as rescue or ambulance transport. It moves people only between designated pickup points and approved shelters.
- Route safety comes from operator-controlled mock data and fictional geometry. The prototype does **not** assess real-world safety.
- Drivers can refuse or pause any task without penalty, and bonuses never depend on speed.

## Limitations and what production would need

- **No backend:** state lives in one browser. Production needs authenticated role-based APIs, a transactional database (idempotent payouts, locking on accept), audit storage and real-time push (WebSockets or SSE).
- **Verification, payouts and NGO onboarding are simulated.** Production needs identity and document checks, finance and tax review, and partner agreements.
- **Hazard and route data are invented.** Production would need authorised feeds from authorities and response partners, plus a human incident lead.
- **No accessibility audit has been done beyond basics:** keyboard focus, labels, contrast and `prefers-reduced-motion` are handled.
