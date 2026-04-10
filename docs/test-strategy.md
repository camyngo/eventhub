# EventHub — Booking Management Test Strategy

> **Scope**: Booking Management (create, view, cancel, clear, refund eligibility)
> **Generated**: 2026-04-10
> **Input**: `docs/test-scenarios.md`
> **Consumed by**: `/generate-tests`

---

## Test Distribution Summary

| Layer     | Count | Focus                                              | Avg Time    |
|-----------|-------|----------------------------------------------------|-------------|
| Unit      | 2     | Pure refund eligibility logic, bookingRef generator | < 10ms each |
| API       | 36    | Contracts, validation, auth, business rules        | 50–300ms    |
| Component | 2     | Ticket quantity stepper bounds (UI-only logic)     | < 100ms     |
| E2E       | 20    | Critical flows, multi-page journeys, UI state      | 3–15s each  |
| **Total** | **60**|                                                    |             |

**Pyramid shape**: Wide API base (60%), narrow E2E top (33%), thin unit/component layers (7%).

---

## Layer Assignments

### Unit (2 tests)

These are pure frontend functions — no I/O, no network — that can be tested in isolation.

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-108 (logic only) | Refund eligibility rule: `quantity === 1 → eligible`, `quantity > 1 → not eligible` | Pure conditional, no async, no DOM needed. Extract `getRefundEligibility(quantity)` from component and unit-test directly. E2E (TC-008, TC-108) covers the spinner + DOM separately. |
| TC-101 (logic only) | BookingRef first-char = `eventTitle[0].toUpperCase()` | The format rule is deterministic. Unit-test the ref-generator helper used in `bookingService`. API test (TC-101) validates the contract end-to-end. |

**Source targets** (expected paths — not verified from source, project is in early setup):
- `backend/src/services/bookingService.ts` — assumed to contain a ref-generator function; actual name unconfirmed
- `frontend/lib/` — refund eligibility helper if extracted from component; not yet present

---

### API / Integration (36 tests)

These validate HTTP contracts, business rules enforced server-side, auth middleware, and data integrity. They call the running backend directly with a real database — no UI.

#### Happy Path

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-006 | `GET /api/bookings/ref/:ref` | 200 + `data.bookingRef` matches requested ref |
| TC-009 | `GET /api/bookings?eventId=<id>` | 200 + all returned bookings have `eventId` matching filter |

#### Business Rules

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-100 | `POST /api/bookings` (10th) | Oldest booking auto-deleted; user count stays at 9; freed seats restored |
| TC-101 | `POST /api/bookings` | `bookingRef[0]` === `eventTitle[0].toUpperCase()` |
| TC-102 | `POST /api/bookings` (×2 different events) | Refs start with `B-` and `A-` respectively |
| TC-103 | `POST /api/bookings` then `GET /api/bookings/:id` | `totalPrice === event.price × quantity` |
| TC-104 | `POST /api/bookings` + `GET /api/events/:id` | `availableSeats` decrements immediately by booked quantity |
| TC-105 | `POST /api/bookings` ×2 same event | Both succeed; `availableSeats = totalSeats − (q1 + q2)` |
| TC-106 | `POST /api/bookings` on static event | `availableSeats` decrements from seeded DB value |
| TC-107 | `GET /api/bookings/:id` | `status === "confirmed"` always |
| TC-109 | Create 5 bookings | All `bookingRef` values are unique in the set |

#### Security

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-201 | `GET /api/bookings/:userA_id` with User B token | 403 + `{ message: "Access Denied" }` |
| TC-202 | `DELETE /api/bookings/:userA_id` with User B token | 403; seat count unchanged |
| TC-203 | `POST /api/bookings` with no Authorization header | 401 + `{ message: "Unauthorized" }` |
| TC-204 | `GET /api/bookings` with no Authorization header | 401 |
| TC-205 | `GET /api/bookings` with expired JWT | 401 |
| TC-206 | `GET /api/bookings/ref/ZZZZZZ` (non-existent ref) | 404 or empty result — no 500 |
| TC-207 | `DELETE /api/bookings` with User B token, verify User A's bookings | User A's bookings unaffected |

#### Negative / Validation

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-300 | `POST /api/bookings` (quantity > availableSeats) | 400 + `"Insufficient seats available"` |
| TC-301 | `POST /api/bookings` with `quantity: 0` | 400 — quantity must be 1–10 |
| TC-302 | `POST /api/bookings` with `quantity: 11` | 400 — quantity must be 1–10 |
| TC-303 | `POST /api/bookings` missing `customerName` | 400 — customerName required |
| TC-304 | `POST /api/bookings` with `customerName: "A"` | 400 — minimum 2 characters |
| TC-305 | `POST /api/bookings` with `customerEmail: "not-an-email"` | 400 — valid email required |
| TC-306 | `POST /api/bookings` with `customerPhone: "12345"` | 400 — phone minimum 10 digits |
| TC-307 | `POST /api/bookings` with `eventId: 999999` | 404 — event not found |
| TC-308 | `DELETE /api/bookings/999999` | 404 — booking not found |
| TC-309 | `GET /api/bookings/999999` | 404 — booking not found |

#### Edge Cases

| ID | Endpoint | What to Assert |
|----|----------|----------------|
| TC-400 | `POST /api/bookings` with `quantity: 1` | 201; `totalPrice = price × 1`; seats −1 |
| TC-401 | `POST /api/bookings` with `quantity: 10` | 201; `totalPrice = price × 10`; seats −10 |
| TC-402 | Create 9th booking (user has 8) | 9th created; no FIFO deletion; count = 9 |
| TC-403 | `POST /api/bookings` on free event (price = 0) | 201; `totalPrice === 0` |
| TC-404 | Create 50+ bookings across accounts | All `bookingRef` values unique; no 500 errors |
| TC-407 | `POST /api/bookings` when 9 exist; `GET /api/bookings` | Deleted booking has earliest `createdAt` of original 9 |
| TC-408 | `POST /api/bookings` with `customerPhone: "+91 (98765) 43210"` | 201 — special chars accepted |
| TC-409 | `POST /api/bookings` quantity === availableSeats | 201; `availableSeats === 0` after |

**Source targets** (once backend exists):
- `backend/src/controllers/bookingController.ts`
- `backend/src/services/bookingService.ts`
- `backend/src/validators/bookingValidator.ts`
- `backend/src/middleware/auth.ts`

---

### Component (2 tests)

These test isolated UI components — no backend, no routing, just DOM behavior.

| ID | Component | What to Assert |
|----|-----------|----------------|
| TC-405 | Ticket quantity stepper on `/events/:id` | Clicking `−` when `#ticket-count === 1` has no effect; button is disabled or count stays 1 |
| TC-406 | Ticket quantity stepper on `/events/:id` | Clicking `+` when `#ticket-count === 10` has no effect; button is disabled or count stays 10 |

**Rationale**: These are pure UI state transitions with no network dependency. The business rule (quantity 1–10) is already validated at API layer (TC-301, TC-302). Component tests catch the UX enforcement without slow browser navigation.

**Source targets** (once frontend exists):
- `frontend/components/` — ticket stepper/counter component
- `frontend/app/events/[id]/page.tsx` — inline stepper if not extracted

---

### E2E (20 tests)

> **Note**: The `playwright-best-practices` skill referenced in the test-strategy skill definition does not exist in `.claude/skills/`. E2E layer decisions below were made using the decision rules and domain knowledge only — review against Playwright standards before generating tests.

Only multi-page flows, cross-layer state changes, and UI behaviors that require a real browser + backend are tested here. Everything that can be verified at a lower layer is excluded.

#### Happy Path Flows (P0 critical paths)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-001 | Create booking end-to-end | Multi-page, full-stack: navigate → fill form → confirm → verify ref + seat count |
| TC-002 | View bookings list | Requires authenticated session + real data; verifies user isolation in UI |
| TC-003 | View booking detail page | Multi-page navigation + data rendering across two pages |
| TC-004 | Cancel single booking | Seat restoration visible in UI; requires full stack |
| TC-005 | Clear all bookings | Bulk delete + empty state + seat restoration across multiple events |
| TC-007 | Navigate bookings from confirmation | Post-booking redirect + list hydration |

#### Business Rule Verification (cross-stack confirmation)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-100 | FIFO pruning visible in UI | API test validates the deletion; E2E confirms the UI list updates correctly after overflow |
| TC-103 | Total price displayed on confirmation card | API validates the calculation; E2E confirms correct rendering of `totalPrice` in `.booking-ref` card |

#### Refund Eligibility (browser-only feature)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-008 | Refund eligible — quantity 1 | Spinner animation + `#refund-result` text require real browser; no API call to intercept |
| TC-108 | Refund not eligible — quantity > 1 | Same reason; pure frontend with timing dependency |

#### Security (UX layer)

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-200 | Cross-user booking access shows "Access Denied" in UI | API test (TC-201) validates the 403; E2E validates the UI error state renders correctly |

#### Negative / UI Validation

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-310 | Submit blank booking form | Verifies client-side validation messages render inline; API tests cover server-side rejection |
| TC-311 | Book event with 0 seats via UI | "Book Now" button state + error message rendering requires browser |

#### UI State

| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-500 | Empty bookings page shows empty state | Requires authenticated session with zero bookings |
| TC-501 | Sandbox warning banner at 8+ bookings | Banner display is conditional; requires real count reaching threshold |
| TC-502 | Sandbox warning banner hidden at low count | Negative UI state; confirms banner is absent |
| TC-503 | Refund spinner displays ~4 seconds | Timing-dependent animation; requires real browser |
| TC-504 | Refund button disabled during spinner | Interactive state during async delay |
| TC-505 | Booking detail shows all expected fields | Full-stack data display; validates all fields render |
| TC-506 | Booking confirmation card appears after booking | Post-form-submit DOM state |

**Source targets** (expected paths — not verified from source, project is in early setup):
- `frontend/app/bookings/page.tsx`
- `frontend/app/bookings/[id]/page.tsx`
- `frontend/app/events/[id]/page.tsx`
- `frontend/lib/hooks/useBookings.ts`

---

## Decision Rationale — Contested Assignments

### TC-310 (blank form submit) — kept at E2E, not Component

The scenario tests client-side HTML5/React form validation messages rendering inline. While the individual field rules could be unit-tested, the scenario requires the full form context (all fields blank simultaneously, submit button interaction, error message placement). E2E is the lowest layer that catches this holistically.

### TC-200 (cross-user UI) — E2E supplements TC-201 (API)

TC-201 at API layer validates the 403 response code. TC-200 at E2E layer validates that the frontend correctly handles the 403 and renders "Access Denied" — not a blank page, redirect, or JS error. Both layers are needed.

### TC-100 (FIFO pruning) — API is primary, E2E is supplementary

The FIFO deletion logic lives in `bookingService`. API test validates the backend behavior (oldest deleted, count stays 9, seats restored). E2E supplementary test confirms the UI list reflects the deletion without a manual refresh — this catches frontend cache/refetch bugs that the API layer cannot.

### TC-503/TC-504 (refund spinner) — E2E only, not Unit

The 4-second delay is a `setTimeout` inside the component. While the pure `getRefundEligibility(quantity)` logic is unit-tested, the spinner visibility, timing, and button-disable state require a real browser. No mocking needed — test the actual implementation.

### TC-405/TC-406 (stepper bounds) — Component, not E2E

These test a single UI widget's min/max enforcement. They don't require navigation, auth, or backend data. E2E for these would be slow (3-15s per test) to verify what amounts to a `disabled` attribute or a conditional `onClick`. Component tests run in < 100ms with full assertion capability.

---

## Anti-Patterns Found

> **No existing tests found** (`tests/` directory does not exist). The following anti-patterns are **pre-emptive warnings** to avoid when writing tests from scratch.

### 1. Don't test input validation at E2E

TC-301 through TC-306 (quantity bounds, customerName/Email/Phone validation) are tagged `API` in scenarios — keep them there. Validating `quantity: 0` returns 400 via browser navigation is 50× slower than a direct API call and tests the same thing.

**Rule**: Validation errors (`400 Bad Request`) belong at API layer, not E2E.

### 2. Don't test HTTP status codes at E2E

TC-201 through TC-205 (403, 401 responses) are all `API` layer. Never write an E2E test that asserts an HTTP status code — assert the UI state (TC-200 "Access Denied" message) instead.

**Rule**: Auth/authz error codes belong at API layer. E2E covers only the resulting UI state.

### 3. Don't duplicate refund logic tests across layers unnecessarily

BR-8 (refund eligibility) is purely frontend. The unit test covers the logic; the E2E covers the UX (spinner + DOM). Do not add an API-level test for refund — no backend endpoint exists for it.

**Rule**: Frontend-only features (no API) → Unit + E2E only.

### 4. Avoid testing FIFO pruning exclusively via E2E

The FIFO deletion logic in `bookingService` is a critical backend rule. If tested only at E2E, failures are slow to diagnose and flaky (requires creating 9 bookings via UI). API tests with direct HTTP calls are the right primary layer.

**Rule**: Backend business rules → API primary, E2E supplementary only.

---

## Defense-in-Depth Coverage (Critical Rules)

These rules are tested at multiple layers as they are high-risk:

| Business Rule | Unit | API | E2E |
|---------------|------|-----|-----|
| BR-2: Sandbox isolation / cross-user access | — | TC-201, TC-202, TC-207 | TC-200 |
| BR-4: FIFO pruning at 9-booking limit | — | TC-100, TC-402, TC-407 | TC-100 (supplementary) |
| BR-7: BookingRef first char = event title first char | TC-101 (logic) | TC-101, TC-102 | TC-001 (regex assertion on `.booking-ref`) |
| BR-8: Refund eligibility logic | TC-108 (logic) | — | TC-008, TC-108 |
| BR-9: Price = price × quantity | — | TC-103, TC-400, TC-401 | TC-103 (UI display) |
| BR-6: Seats decrement immediately | — | TC-104, TC-409 | TC-004 (cancel restores seats) |
