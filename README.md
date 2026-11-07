# inDrive Lifeline: Interactive Demo

> **Concept prototype.** All people, places, routes, partners and amounts are fictional. This is **not** an official inDrive service, an emergency-response system or a real alert channel. No real dispatch, identity check or payment happens.

inDrive Lifeline connects people who need transportation or essential deliveries with **verified inDrive drivers** and **trusted NGO partners**. During a simulated disaster it also coordinates transfers between **pre-approved safe pickup points** and **approved shelters**.

The demo is a single desktop page with three views:

| Left | Centre | Right |
|---|---|---|
| **Passenger app**: inDrive home, side menu with **Lifeline**, request form, live tracker | **Driver app**: inDrive driver home, side menu with **Lifeline**, extra verification, missions, earnings | **Operator Control Center**: disaster remote, work queue, drivers, NGO desk, impact, event log |

All three read and write **one shared in-browser store**, so every action updates every view immediately, with no backend.

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

The 17 guided steps follow the recording script: open the menus → driver enrolls → operator verifies the driver → driver goes online → activate *Earthquake · Demo District A · High* → both phones alert → passenger requests transport for 3 (Assembly Point Alpha → Shelter Green) → operator verifies and approves `ROUTE-A1` → offer → driver accepts (25 MAD + 15 MAD bonus) → trip steps → operator confirms safe arrival → bonus approved and impact updated → resolve.

### Other journeys to show

| Journey | How |
|---|---|
| **Blocked route** | Scenario tab → Flood → Activate. Passenger: Request safe transport → Community Center Beta → Shelter Green shows **Blocked**. In the queue, the operator's approve button is disabled with the failing gate listed. |
| **Unverified driver** | After Reset, open the driver's Lifeline. The seeded food-parcel mission shows **Accept** disabled with the reason. |
| **Accessibility** | `REQ-0002` (hotline, wheelchair) cannot be offered until an accessible vehicle is online: Drivers tab → Yasmin → *Set online*. |
| **NGO on behalf** | NGO desk → *Create Request on Behalf* → same queue, gates and confirmation. Winter Warmth campaign progress updates after confirmation. |
| **Safety pause** | During a trip the driver taps *Report safety issue & pause*, or the operator changes the scenario so the route becomes blocked. The trip pauses until the operator resumes it. |

### Separate tabs (optional)

`?view=passenger`, `?view=driver` and `?view=operator` render one view each. Tabs of the **same browser and origin** stay in sync through `BroadcastChannel`, falling back to the `storage` event. There is no cross-device sync, because there is no backend.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` runs the tests, builds and publishes `dist/` on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**. Vite uses `base: './'` and the app uses query parameters rather than path routes, so any project-page URL works without 404s on refresh.

## Visual reference notes

The four reference screenshots (passenger home, driver home offline, driver menu, passenger menu) were reproduced as functional components:

- **Menus:** the item order is unchanged. **Lifeline** is inserted directly under *City to City*: before *Notifications* in the driver menu, and before *Freight* in the passenger menu, where *Freight* follows *City to City*.
- **Fonts and icons:** Inter is a substitute for inDrive's proprietary typeface, and Lucide icons stand in for the original icon set.
- **Illustrations:** the service-tile artwork, city photos and social icons are simplified original SVG drawings, not copied brand assets. The Google map is replaced by a self-contained fictional SVG map.
- **Inferred screens** (not in the references): all Lifeline screens, the driver "online" request list, alert sheets, the trip tracker and the operator panel. They reuse the measured tokens: dark surfaces, `#C1F11D` lime CTAs, the coral offline pill and the peach banner.
- **Spec discrepancy:** the spec's mock data starts the driver as `PENDING_REVIEW`, while Journey D starts with the driver applying. The demo starts at `NOT_ENROLLED` so the enrollment flow can be shown, and the operator approval path follows.

## Project layout

```
src/
  app/        App.tsx (stage, scaling, views) · store.ts (Zustand, persistence, tab sync)
  domain/     types · dispatch gates · eligibility · rewards · hazard geometry · workflow · metrics · labels
  data/       fictional drivers, locations/routes, scenarios, NGOs, deterministic initial state
  components/ PhoneFrame, SideMenu, FictionalMap, MissionCard, overlays, GuidedDemo
  passenger/  home, Lifeline home, request form, tracker
  driver/     home, Lifeline, enrollment, mission details, active mission, earnings
  operator/   scenario, queue, drivers, NGO desk, impact + log
tests/        dispatch, eligibility and reward invariants
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for state flow, safety gates and limitations.
