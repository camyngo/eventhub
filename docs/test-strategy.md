# EventHub — Booking Management Test Strategy

> **Scope**: Booking Management (create, view, cancel, clear, refund eligibility)
> **Generated**: 2026-04-24
> **Input**: `docs/test-scenarios.md`
> **Consumed by**: `/generate-tests`
> **Note**: `playwright-best-practices` skill not found in `.claude/skills/` — E2E decisions made from decision rules + domain knowledge only. Backend and frontend source do not exist yet (early setup); source file references are expected paths, not discovered.

---

## Test Distribution Summary

| Layer     | Count | Focus                                                                   | Avg Time     |
|-----------|-------|-------------------------------------------------------------------------|--------------|
| Unit      | 10    | Pure validators, price calc, bookingRef logic, refund rule              | < 10ms each  |
| API       | 30    | HTTP contracts, business rules, auth, FIFO, seat logic                  | 50–300ms     |
| Component | 9     | Form validation UI, empty states, banners, cards, stepper               | < 100ms each |
| E2E       | 22    | Critical flows, full-stack state, spinner UX, loading/error states      | 3–15s each   |
| **Total** | **71**|                                                                         |              |

```
        /──────────\      E2E       22  (31%)
       /────────────\     Component  9  (13%)
      /──────────────\    API       30  (42%)
     /────────────────\   Unit      10  (14%)
```

**Pyramid shape**: API-heavy base (expected for a data-layer-heavy app with Prisma + MySQL), E2E is the narrowest layer. Not an ice cream cone.

---

## Layer Assignments

### Unit (10 tests)

Pure functions — no I/O, no network, no DOM. Test the logic directly.

| ID (Unit) | What to Test | Pure Function (expected) | Assertion |
|-----------|-------------|--------------------------|-----------|
| TC-301-unit | Quantity below minimum | `validateQuantity(0)` | Throws or returns error — below min of 1 |
| TC-302-unit | Quantity above maximum | `validateQuantity(11)` | Throws or returns error — above max of 10 |
| TC-303-unit | Missing customer name | `validateCustomerName(undefined)` | Throws or returns error — field required |
| TC-304-unit | Name too short | `validateCustomerName("A")` | Throws or returns error — min 2 chars |
| TC-305-unit | Invalid email format | `validateCustomerEmail("not-an-email")` | Throws or returns error — invalid format |
| TC-306-unit | Phone too short | `validateCustomerPhone("12345")` | Throws or returns error — min 10 digits |
| TC-408-unit | Phone with special chars | `validateCustomerPhone("+91 (98765) 43210")` | Returns valid — `+`, spaces, `()` permitted |
| TC-103-unit | Price calculation | `calculateTotalPrice(1499, 3)` | Returns `4497` exactly |
| TC-101-unit | BookingRef prefix rule | `generateBookingRefPrefix("Tech Summit")` | Returns `"T"` |
| TC-108-unit | Refund eligibility rule | `isRefundEligible(1)` / `isRefundEligible(3)` | `true` / `false` respectively |

**Rationale**: TC-301–306 and TC-408 are pure field validators in `bookingValidator`. Decision rule #1 applies: pure function, no I/O → Unit. The API layer retains **one** wired integration test (TC-301 at API) to confirm the validator is connected to the route — testing the same logic twice at API is redundant. TC-103 is simple arithmetic; TC-101 is a string operation; TC-108 is a conditional. All have zero I/O.

**Source targets** (expected paths — not verified from source, project is in early setup):
- `backend/src/validators/bookingValidator.ts` — `validateQuantity`, `validateCustomerName`, `validateCustomerEmail`, `validateCustomerPhone`
- `backend/src/services/bookingService.ts` — assumed ref-generator; actual function name unconfirmed
- `frontend/lib/` — refund eligibility helper, if extracted from component

---

### API / Integration (30 tests)

HTTP layer — calls the running backend with a real database. Validates contracts, business rules, auth middleware, and data integrity.

#### Happy Path (2)

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-006 | `GET /api/bookings/ref/:ref` | 200 + `data.bookingRef` matches requested ref |
| TC-009 | `GET /api/bookings?eventId=<id>` | 200 + all returned bookings have matching `eventId` |

#### Business Rules (9)

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-100 | `POST /api/bookings` (10th) | Oldest booking auto-deleted; count stays at 9; freed seats restored |
| TC-101 | `POST /api/bookings` | `bookingRef[0]` === `eventTitle[0].toUpperCase()` |
| TC-102 | `POST /api/bookings` ×2 different events | Refs start with `B-` and `A-` respectively |
| TC-103 | `POST /api/bookings` + `GET /api/bookings/:id` | `totalPrice === event.price × quantity` in response |
| TC-104 | `POST /api/bookings` + `GET /api/events/:id` | `availableSeats` decrements immediately by booked quantity |
| TC-105 | `POST /api/bookings` ×2 same event | Both succeed; `availableSeats = totalSeats − (q1 + q2)` |
| TC-106 | `POST /api/bookings` on static event | `availableSeats` decrements from seeded DB value |
| TC-107 | `GET /api/bookings/:id` | `status === "confirmed"` always |
| TC-109 | Create 5 bookings | All `bookingRef` values are unique in the set |

#### Security (7)

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-201 | `GET /api/bookings/:userA_id` with User B token | 403 + `{ message: "Access Denied" }` |
| TC-202 | `DELETE /api/bookings/:userA_id` with User B token | 403; seat count unchanged |
| TC-203 | `POST /api/bookings` with no Authorization header | 401 + `{ message: "Unauthorized" }` |
| TC-204 | `GET /api/bookings` with no Authorization header | 401 |
| TC-205 | `GET /api/bookings` with expired JWT | 401 |
| TC-206 | `GET /api/bookings/ref/ZZZZZZ` (non-existent ref) | 404 or empty — no 500 |
| TC-207 | `DELETE /api/bookings` with User B token, check User A | User A's bookings unaffected |

#### Negative / Validation (5)

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-301 | `POST /api/bookings` with `quantity: 0` | 400 — confirms validator is wired to route (one integration check covers the contract; edge cases live in Unit) |
| TC-300 | `POST /api/bookings` (quantity > availableSeats) | 400 + `"Insufficient seats available"` — business rule, not a pure validator |
| TC-307 | `POST /api/bookings` with `eventId: 999999` | 404 — event existence check in service |
| TC-308 | `DELETE /api/bookings/999999` | 404 — booking existence check |
| TC-309 | `GET /api/bookings/999999` | 404 — booking existence check |

> TC-302–306, TC-408 removed from API — their validation logic is pure functions tested at Unit. TC-301 remains as the single wired integration test confirming validators fire on the route.

#### Edge Cases (7)

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-400 | `POST /api/bookings` with `quantity: 1` | 201; `totalPrice = price × 1`; seats −1 |
| TC-401 | `POST /api/bookings` with `quantity: 10` | 201; `totalPrice = price × 10`; seats −10 |
| TC-402 | Create 9th booking (user has 8) | 9th created; no FIFO deletion; count = 9 |
| TC-403 | `POST /api/bookings` on free event (price = 0) | 201; `totalPrice === 0` |
| TC-404 | Create 50+ bookings | All `bookingRef` values unique; no 500 errors |
| TC-407 | `POST /api/bookings` when 9 exist; `GET /api/bookings` | Deleted booking has earliest `createdAt` of the original 9 |
| TC-409 | `POST /api/bookings` quantity === availableSeats | 201; `availableSeats === 0` after |

> TC-408 (phone special chars) removed from API — it is a pure validator rule, now tested at Unit (TC-408-unit).

**Source targets** (expected paths — not verified from source, project is in early setup):
- `backend/src/controllers/bookingController.ts`
- `backend/src/services/bookingService.ts`
- `backend/src/validators/bookingValidator.ts`
- `backend/src/middleware/auth.ts`

---

### Component (8 tests)

Isolated UI component tests — no backend, no routing, no authentication. Mount the component, pass props, assert DOM state.

| ID | Component | Props / State | What to Assert |
|----|-----------|--------------|----------------|
| TC-405 | Ticket quantity stepper | `count=1` | Clicking `−` has no effect; button disabled or count stays 1 |
| TC-406 | Ticket quantity stepper | `count=10` | Clicking `+` has no effect; button disabled or count stays 10 |
| TC-310 | Booking form | All fields empty, submit clicked | Form does not submit; inline validation error shown per required field |
| TC-500 | Bookings list page | `bookings=[]` | No `#booking-card` elements; empty state message visible; "Clear all" link absent |
| TC-501 | Sandbox warning banner | `bookingCount=8` | Warning banner visible with text matching `/sandbox holds up to/i` |
| TC-502 | Sandbox warning banner | `bookingCount=3` | Warning banner not rendered |
| TC-505 | Booking detail page | Full mock booking object | `h1` has event title; `span.font-mono.font-bold` has ref; name/email/phone/quantity/price/status/venue/date all visible; `#check-refund-btn` present |
| TC-506 | Booking confirmation card | Completed booking data | `.booking-ref` visible; "View My Bookings" and "Browse Events" links present; no error messages |
| TC-509 | Ticket quantity stepper | Initial `count=1`, then +3 clicks then −1 click | `#ticket-count` shows 3; value updates correctly after each interaction |

> **Known risk on TC-501/502**: Sandbox warning banner implementation on `/bookings` is unconfirmed in scenario notes. Component test will fail if the component doesn't implement it — which is the correct outcome. Verify banner exists before running.

**Rationale for moves from E2E**: TC-310, TC-500, TC-501, TC-502, TC-505, TC-506 are single-component rendering or UI state checks (decision rule #3). They require no navigation, no auth session, no backend data — only a mounted component with mock props. E2E for these costs 3–15s per test to verify what a component test covers in under 100ms.

**Source targets** (expected paths — not verified from source, project is in early setup):
- `frontend/components/` — ticket stepper, booking card, confirmation card, sandbox banner
- `frontend/app/bookings/page.tsx` — empty state, banner integration
- `frontend/app/bookings/[id]/page.tsx` — booking detail layout
- `frontend/app/events/[id]/page.tsx` — booking form, stepper

---

### E2E (14 tests)

> **Note**: `playwright-best-practices` skill not found in `.claude/skills/`. These decisions are based on decision rules and domain knowledge — review against Playwright standards before generating.

Only tests requiring a real browser + live backend + authenticated session. Multi-page navigation, full-stack state changes, and browser-native behavior (timing, animation, interactive state) belong here.

#### Critical Booking Flows — P0 (6)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-001 | Create booking end-to-end | Multi-page: navigate → form → submit → confirmation; seat count verified across pages |
| TC-002 | View bookings list | Requires live auth session + real DB data; verifies user sandbox isolation in rendered UI |
| TC-003 | View booking detail page | Multi-page navigation: `/bookings` → `/bookings/:id`; cross-page data consistency |
| TC-004 | Cancel single booking | Seat restoration must be verified after deletion via API + UI re-fetch |
| TC-005 | Clear all bookings | Bulk delete + empty state + multi-event seat restoration across full stack |
| TC-007 | Navigate to bookings from confirmation | Post-submit redirect + list hydration; tests Next.js router + React Query refetch |

#### Business Rule Cross-Stack Confirmation (2)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-100 | FIFO pruning visible in UI | API validates deletion logic; E2E confirms the bookings list re-renders after overflow without stale data |
| TC-103 | Price displayed correctly on confirmation card | Unit tests arithmetic; API verifies stored value; E2E confirms the rendered price in `.booking-ref` card matches — catches template/format bugs neither layer can |

#### Refund Eligibility — Browser-Only Feature (2)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-008 | Refund eligible (quantity = 1) | `setTimeout`-driven spinner + `#refund-result` DOM update requires real browser; no API to intercept |
| TC-108 | Refund not eligible (quantity > 1) | Same — pure frontend timing dependency |

#### Security — UX Layer (1)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-200 | Cross-user access shows "Access Denied" in UI | TC-201 validates the 403 at API; E2E validates the frontend renders the error state correctly (not a blank page or JS crash) |

#### Negative — Button/Interaction State (1)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-311 | Book event with 0 seats via UI | "Book Now" button disabled state + error message rendering requires real browser interaction against live event state |

#### Timing & Interactive UI State (2)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-503 | Refund spinner visible for ~4 seconds | Animation timing is a live `setTimeout`; cannot be reliably asserted in a component test without mocking the clock, which removes the real-world value |
| TC-504 | Refund button disabled during spinner | Interactive state mid-animation; requires real click + immediate re-click in browser |

#### Loading, Error & Navigation States (8)

> These scenarios (TC-507–515) were present in `test-scenarios.md` but missing from the initial strategy pass.

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-507 | Bookings page pagination — 9 bookings shown | Requires live auth session + real DB data reaching the page limit |
| TC-508 | Access Denied page renders for cross-user booking | Overlaps with TC-200/TC-514; kept separately to assert no JS errors in console — requires real browser |
| TC-510 | Loading state shows skeleton cards | Requires network interception to delay `/api/bookings` response; skeleton timing is browser-dependent |
| TC-511 | Error state shows retry option | Requires network interception to simulate backend unreachable; `refetch()` must be triggered in real browser |
| TC-512 | Booking detail loading spinner | Requires network interception to delay `/api/bookings/:id`; flash-of-content check needs real render cycle |
| TC-513 | Booking not found page — correct UI | Requires real routing to `/bookings/999999` and a real 404 API response to trigger the error boundary |
| TC-514 | Access Denied — correct wording | Requires cross-user auth flow + real 403 to verify exact title/description/CTA wording |
| TC-515 | Cancel booking shows confirmation modal | Requires real booking data + click interaction to trigger the modal; modal state is tied to the delete flow |

**Source targets** (expected paths — not verified from source, project is in early setup):
- `frontend/app/bookings/page.tsx`
- `frontend/app/bookings/[id]/page.tsx`
- `frontend/app/events/[id]/page.tsx`
- `frontend/lib/hooks/useBookings.ts`

---

## Decision Rationale — Contested Assignments

### TC-301–306, TC-408 — Moved from API → Unit (primary), API retains one wired test

These are pure field validators. Decision rule #1: pure function, no I/O → Unit. Testing `validateQuantity(0)` returning an error through a full HTTP round-trip is slow and tests the wrong thing — it tests the wiring, not the logic. Unit tests cover all boundary combinations in milliseconds. TC-301 stays at API as a single "wired integration" check that confirms the validator fires when the route is called with invalid input.

### TC-310 — Moved from E2E → Component

Previous rationale said "requires full form context." Corrected: that IS what a component test provides — mount the full booking form, submit with blank fields, assert validation messages render inline. No navigation, auth, or backend needed. E2E for this wastes 10–15s testing what amounts to React form state.

### TC-500 — Moved from E2E → Component

Empty state is a rendering concern: when `bookings=[]` is passed (or returned by mock), the component shows an empty state message. This is testable by mounting with empty props. The E2E test would require setting up a fresh authenticated user with zero bookings — expensive setup for a UI rendering check.

### TC-501/TC-502 — Moved from E2E → Component

Sandbox warning banner visibility is conditional on a count. This is a component prop/state test: pass `bookingCount=8` → banner renders; pass `bookingCount=3` → banner absent. No routing or auth required. The "Known Risk" note (banner may not be implemented) applies at any layer — a failing component test is the right signal.

### TC-505 — Moved from E2E → Component

Booking detail field rendering is a layout/data-display concern. Given a mock booking object, does the component render all fields? This is a component test. The E2E equivalent (navigate to `/bookings/:id` and assert every field) is valid but duplicates what TC-003 (E2E) already covers for navigation + data loading. TC-505 at Component isolates the rendering contract from the navigation concern.

### TC-506 — Moved from E2E → Component

Booking confirmation card content is a component rendering test: given completed booking data, does the card show `.booking-ref`, navigation links, and no errors? TC-001 (E2E) already covers the full booking flow including this card. TC-506 at Component tests the card in isolation, catching regressions without re-running the full booking flow.

### TC-100 (FIFO pruning) — API primary, E2E supplementary

The deletion logic lives in `bookingService`. API tests validate the backend behavior (oldest deleted, count stays 9, seats restored). The E2E supplementary test catches frontend cache/refetch bugs — if the UI doesn't re-query after overflow, the stale list would still show 10 entries. Neither layer alone covers both concerns.

### TC-200 (cross-user access) — E2E supplements TC-201 (API)

TC-201 validates the 403 HTTP response. TC-200 validates that the frontend correctly handles that 403 and renders "Access Denied" — not a blank page, redirect loop, or unhandled JS error. Both layers needed for defense-in-depth.

### TC-503/TC-504 (refund spinner) — E2E only

The 4-second delay is a live `setTimeout`. While `isRefundEligible(quantity)` is unit-tested, the spinner visibility, duration, and button-disable state require a real browser running real time. Mocking `setTimeout` in a component test would test the mock, not the implementation.

---

## Anti-Patterns Found

> **No existing tests found** (`tests/` directory does not exist). The following are **pre-emptive warnings** — patterns to avoid when writing tests from scratch.

### 1. Don't test pure field validators at API (now fixed)

TC-302–306 and TC-408 were all at API in the original pass. These are pure functions. Testing `validateCustomerEmail("bad")` through HTTP adds 200–300ms latency and couples the test to the HTTP layer, which is not what's being tested. **Fix applied**: moved to Unit; one wired API test retained.

### 2. Don't test single-component UI state at E2E (now fixed)

TC-310, TC-500, TC-501, TC-502, TC-505, TC-506 were all at E2E. These are component rendering checks. **Fix applied**: moved to Component.

### 3. Don't test HTTP status codes at E2E

TC-201–205 (403, 401) belong at API. Never write an E2E test that asserts an HTTP status code — assert the resulting UI state (TC-200 "Access Denied" message) instead.

### 4. Don't test FIFO pruning exclusively via E2E

The deletion logic is a backend service rule. E2E requires creating 9 bookings through the UI — slow, flaky setup. API tests with direct HTTP calls are the primary layer; E2E is supplementary only.

### 5. Don't add an API test for refund eligibility

BR-8 (refund eligibility) has no backend endpoint. Unit covers the logic; E2E covers the UX. A spurious API test would either test nothing or create a false dependency on a non-existent route.

---

## Defense-in-Depth Coverage (Critical Rules)

| Business Rule | Unit | API | Component | E2E |
|---------------|------|-----|-----------|-----|
| BR-2: Sandbox isolation / cross-user | — | TC-201, TC-202, TC-207 | — | TC-200 |
| BR-4: FIFO pruning at 9-booking limit | — | TC-100, TC-402, TC-407 | — | TC-100 (supplementary) |
| BR-6: Seats decrement immediately | — | TC-104, TC-409 | — | TC-004 (cancel restores seats) |
| BR-7: BookingRef first char = event title | TC-101-unit | TC-101, TC-102 | — | TC-001 (regex on `.booking-ref`) |
| BR-8: Refund eligibility logic | TC-108-unit | — | — | TC-008, TC-108 |
| BR-9: Price = price × quantity | TC-103-unit | TC-103, TC-400, TC-401 | — | TC-103 (rendered price in UI) |
| bookingValidator: quantity bounds | TC-301-unit, TC-302-unit | TC-301 (wired) | TC-405, TC-406, TC-509 (stepper UI) | — |
| bookingValidator: field formats | TC-303–306-unit, TC-408-unit | TC-301 (wired) | TC-310 (form messages) | — |

---

## E2E Test Summary (Excel-Ready)

All 22 E2E tests in a single flat table. Copy the rows below directly into Excel.

| Test ID | Scenario | Category | Priority | Group | Page(s) |
|---------|----------|----------|----------|-------|---------|
| TC-001 | Create a booking successfully | Happy Path | P0 | Critical Flow | `/events` → `/events/:id` |
| TC-002 | View bookings list | Happy Path | P0 | Critical Flow | `/bookings` |
| TC-003 | View booking detail page | Happy Path | P0 | Critical Flow | `/bookings` → `/bookings/:id` |
| TC-004 | Cancel a single booking | Happy Path | P0 | Critical Flow | `/bookings/:id` |
| TC-005 | Clear all bookings | Happy Path | P0 | Critical Flow | `/bookings` |
| TC-007 | Navigate to bookings from confirmation page | Happy Path | P1 | Critical Flow | `/events/:id` → `/bookings` |
| TC-100 | FIFO pruning — 10th booking removes oldest (UI) | Business Rule | P0 | Business Rule | `/bookings` |
| TC-103 | Total price displayed correctly on confirmation card | Business Rule | P0 | Business Rule | `/events/:id` |
| TC-008 | Refund eligibility — single ticket | Happy Path | P1 | Refund | `/bookings/:id` |
| TC-108 | Refund eligibility — multi-ticket not refundable | Business Rule | P0 | Refund | `/bookings/:id` |
| TC-200 | Cross-user booking access shows "Access Denied" in UI | Security | P0 | Security | `/bookings/:id` |
| TC-311 | Book event with 0 available seats via UI | Negative | P0 | Negative | `/events/:id` |
| TC-503 | Refund spinner displays for ~4 seconds | UI State | P1 | Timing & Interaction | `/bookings/:id` |
| TC-504 | Refund button not clickable while spinner is active | UI State | P2 | Timing & Interaction | `/bookings/:id` |
| TC-507 | Bookings page shows all 9 bookings at limit | UI State | P2 | Loading & Navigation | `/bookings` |
| TC-508 | Access Denied page renders with no JS errors | UI State | P0 | Security | `/bookings/:id` |
| TC-510 | Loading state shows skeleton cards | UI State | P1 | Loading & Navigation | `/bookings` |
| TC-511 | Error state shows retry option | UI State | P1 | Loading & Navigation | `/bookings` |
| TC-512 | Booking detail loading spinner shown | UI State | P1 | Loading & Navigation | `/bookings/:id` |
| TC-513 | Booking not found page — correct UI | UI State | P1 | Loading & Navigation | `/bookings/:id` |
| TC-514 | Access Denied — correct title, description, CTA | UI State | P0 | Security | `/bookings/:id` |
| TC-515 | Cancel booking shows confirmation modal | UI State | P1 | Loading & Navigation | `/bookings/:id` |
