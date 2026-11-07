# inDrive Lifeline: Interactive Demo

> **Concept prototype.** All people, places, routes, partners and amounts are fictional. This is **not** an official inDrive service, an emergency-response system or a real alert channel. No real dispatch, identity check or payment happens.

inDrive Lifeline offers **voluntary transport during natural disasters**, and nothing else. The **Admin** decides when and where Lifeline is active. Once it is, people in the selected area can request a ride from a **designated pickup point** to an **approved shelter**. **Volunteer drivers** who have joined Lifeline and passed its extra checks accept approved missions, and they receive a **bonus** after the Admin confirms completion. Outside an Admin-activated scenario, Lifeline only shows an inactive message.

The demo is a single desktop page with three views:

| Left | Centre | Right |
|---|---|---|
| **Passenger app**: inDrive home, side menu with **Lifeline**, alert, shelter-transport request, live tracker, safe-arrival confirmation | **Driver app**: inDrive driver home, side menu with **Lifeline**, volunteer sign-up, availability switch, missions grouped by pickup point, trip steps, earnings history | **Lifeline Admin**: scenario activation, request review and route approval, volunteers, impact, event log |

All three read and write **one shared in-browser store**, so every action updates every view immediately, with no backend. A **Light / Dark** toggle in the header themes all three views. The choice is remembered after refresh, synced across tabs, and does not affect the scenario, requests or trips.

## Quick start

Requires **Node.js 18.18+** (tested with Node 24).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # domain rule tests (Vitest)
npm run build      # type-check + static build into dist/
npm run preview    # serve the production build
```

## Recording the video

1. Run `npm run dev` and open the page full-screen at 1920×1080 or 1440×900. Phones scale automatically.
2. Click **Present** to slim down the header and hide labels.
3. Use the **Guided Demo** strip: **Do it** performs the step's simulated action, and **‹ ›** moves between steps without acting. Nothing plays on its own.
4. **Reset Demo** (or **Restart** in the guide) restores the exact initial state for another take.

The 10 guided steps follow the core story:

1. Lifeline starts inactive.
2. A driver volunteers and is verified, then turns on availability.
3. **Admin activates** *Earthquake · Demo District A · High*.
4. **Passenger requests shelter transport** for 3 people (Assembly Point Alpha → Shelter Green).
5. **Admin approves** `ROUTE-A1`, which publishes the mission.
6. **Volunteer accepts**, having seen the +15 MAD bonus and the 25 MAD fare as separate lines.
7. **Pickup**: On my way → Arrived at pickup → Passengers picked up.
8. **Shelter arrival**: Arrived at shelter → Submit completion; the passenger confirms safe arrival.
9. **Admin confirms**, and the **bonus is approved** once.
10. Admin resolves the scenario.

### Other journeys to show

| Journey | How |
|---|---|
| **Inactive** | After Reset, the passenger's Lifeline screen shows "not active in your area" with no request button. The driver's list shows "on standby". |
| **Outside the area** | Activate in Demo District B or C. The passenger, who lives in District A, gets no alert and no request option. |
| **Blocked route** | Activate any scenario, then request Community Center Beta → Shelter Green. The form warns that `ROUTE-B2` is blocked, and in Requests the Admin's approve button is disabled with the failing check listed. A flood also makes `ROUTE-A1` *unknown*, which cannot be approved either. |
| **Eligibility** | Before the volunteer joins, or while they are unavailable, mission cards show **Accept** disabled with the reason. Requests for 4 passengers exceed the demo car's 3 seats; wheelchair requests need Yasmin's accessible van (Volunteers → *Simulate: available*). |
| **Safety pause** | During a trip the driver taps *Report safety concern & pause*, or the Admin changes the scenario so the route becomes blocked. The trip pauses until the Admin resumes or cancels it. A cancelled mission earns no bonus. |
| **Resolve** | Open offers and unassigned requests close. Trips under way can finish, and completed history and earnings stay until Reset. |

### Separate tabs (optional)

`?view=passenger`, `?view=driver` and `?view=operator` (Admin) render one view each. Tabs of the **same browser and origin** stay in sync through `BroadcastChannel`, falling back to the `storage` event. There is no cross-device sync, because there is no backend.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` runs the tests, builds and publishes `dist/` on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**. Vite uses `base: './'` and the app uses query parameters rather than path routes, so any project-page URL works without 404s on refresh.

## Visual reference notes

The four reference screenshots (passenger home, driver home offline, driver menu, passenger menu) were reproduced as functional components:

- **Menus:** the item order is unchanged. **Lifeline** is inserted directly under *City to City*: before *Notifications* in the driver menu, and before *Freight* in the passenger menu, where *Freight* follows *City to City*.
- **Fonts and icons:** Inter is a substitute for inDrive's proprietary typeface, and Lucide icons stand in for the original icon set.
- **Illustrations:** the service-tile artwork, city photos and social icons are simplified original SVG drawings, not copied brand assets. The Google map is replaced by a self-contained fictional SVG map.
- **Inferred screens** (not in the references): all Lifeline screens, the driver "online" request list, alert sheets, the trip tracker and the Admin panel. They reuse the measured tokens: dark surfaces, `#C1F11D` lime CTAs, the coral offline pill and the peach banner.
- **Light mode** is inferred, not measured: white surfaces, light-gray cards, dark text and clear borders, with the same lime accent and dark button labels. Lime used as text or icon colour switches to a darker olive so it stays readable on white. The map has a light palette, and approved, blocked and unknown routes keep their meaning through both colour and dash pattern. All colours are shared variables in `src/styles/tokens.css`.
- **Volunteer start state:** the phone driver starts as `not_enrolled`, so joining Lifeline voluntarily can be shown. Guided step 2 runs sign-up, Admin verification and availability together.
- **Area:** the demo passenger lives in Demo District A, where both designated pickup points are. Activating another district shows that Lifeline is limited to the selected area.

## Project layout

```
src/
  app/        App.tsx (stage, scaling, views) · store.ts (Zustand, persistence, tab sync)
  domain/     types · dispatch gates · eligibility · rewards · hazard geometry · workflow · metrics · labels
  data/       fictional drivers, passenger, pickup points/shelters/routes, scenarios, clean initial state
  components/ PhoneFrame, SideMenu, FictionalMap, MissionCard, overlays, GuidedDemo
  passenger/  home, Lifeline home, request form, tracker
  driver/     home, Lifeline, enrollment, mission details, active mission, earnings
  operator/   Admin panel: scenario, requests, volunteers, impact + log
  styles/     tokens.css (dark + light theme variables) · app.css
tests/        dispatch, eligibility and reward invariants
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for state flow, safety gates and limitations.
