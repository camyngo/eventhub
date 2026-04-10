# EventHub — Booking Management Test Scenarios

> **Scope**: Booking Management (create, view, cancel, clear, refund eligibility)
> **Generated**: 2026-04-10
> **Consumed by**: `/test-strategy`

---

## Happy Path (TC-001–099)

### TC-001: Create a booking successfully
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User logged in; at least one event with available seats exists
**Steps**:
1. Navigate to `/events`
2. Click `getByTestId('book-now-btn')` on any event card
3. On `/events/:id`, set quantity to 2 using `+` button (`button:has-text("+")`)
4. Fill `getByLabel('Full Name')` = "Alice Smith"
5. Fill `#customer-email` = "alice@example.com"
6. Fill `getByPlaceholder('+91 98765 43210')` = "+91 9876543210"
7. Click `.confirm-booking-btn`
**Expected Results**:
- Booking confirmation card appears
- `.booking-ref` is displayed matching pattern `[A-Z]-[A-Z0-9]{6}` where first char matches event title's first character
- `totalPrice` displayed = event price × 2
- Available seats for the event decreases by 2
**Business Rule**: BR-1 (booking flow), BR-7 (bookingRef format), BR-9 (price calculation)
**Suggested Layer**: E2E

---

### TC-002: View bookings list
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User logged in; user has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Observe list of booking cards (`#booking-card`)
**Expected Results**:
- All cards show event title, customer name, booking ref, quantity, total price, status = "confirmed"
- Only the authenticated user's own bookings are shown
- "View Details" link is present on each card
- "Clear all bookings" link is visible at the top
**Business Rule**: BR-2 (sandbox isolation)
**Suggested Layer**: E2E

---

### TC-003: View booking detail page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Click `getByRole('link', { name: 'View Details' })` on any booking card
3. Observe `/bookings/:id` page
**Expected Results**:
- `h1` shows event title
- `span.font-mono.font-bold` shows booking reference
- Customer name, email, phone, quantity, total price, and event details are displayed
- "Check Refund Eligibility" button (`#check-refund-btn`) is visible
- Cancel button is visible
**Business Rule**: BR-1 (user journey)
**Suggested Layer**: E2E

---

### TC-004: Cancel a single booking
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User has at least one booking
**Steps**:
1. Navigate to `/bookings/:id` for a booking
2. Click the Cancel button
3. Confirm cancellation if prompted
**Expected Results**:
- Booking is removed from the list at `/bookings`
- Available seats for the associated event increase by the cancelled quantity
- Booking no longer accessible at `/bookings/:id`
**Business Rule**: BR-4 (booking deletion frees seats immediately)
**Suggested Layer**: E2E

---

### TC-005: Clear all bookings
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User has 3+ bookings
**Steps**:
1. Navigate to `/bookings`
2. Click "Clear all bookings" link
3. Confirm if prompted
**Expected Results**:
- All booking cards disappear
- `/bookings` shows empty state
- Available seats for all affected events are restored
**Business Rule**: BR-4 (Clear All Bookings)
**Suggested Layer**: E2E

---

### TC-006: Look up booking by reference via API
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User has a booking with a known ref (e.g., `T-AB1234`)
**Steps**:
1. `GET /api/bookings/ref/T-AB1234` with valid Bearer token
**Expected Results**:
- 200 OK
- Response body `{ data: Booking }` with matching `bookingRef`
**Business Rule**: BR-7 (bookingRef uniqueness)
**Suggested Layer**: API

---

### TC-007: Navigate to bookings from booking confirmation page
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User just completed a booking (confirmation card showing)
**Steps**:
1. After booking confirmation, click "View My Bookings" link
**Expected Results**:
- Redirected to `/bookings`
- New booking appears in the list
**Business Rule**: BR-1 (post-booking navigation)
**Suggested Layer**: E2E

---

### TC-008: Refund eligibility — single ticket
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User has a booking with quantity = 1
**Steps**:
1. Navigate to `/bookings/:id` for a single-ticket booking
2. Click `#check-refund-btn`
3. Wait for `#refund-spinner` to disappear (up to 5s)
4. Observe `#refund-result`
**Expected Results**:
- Spinner appears for ~4 seconds
- Result shows "Single-ticket bookings qualify for a full refund"
**Business Rule**: BR-8 (refund eligibility, quantity = 1)
**Suggested Layer**: E2E

---

### TC-009: Filter bookings by eventId via API
**Category**: Happy Path
**Priority**: P2
**Preconditions**: User has bookings for multiple events
**Steps**:
1. `GET /api/bookings?eventId=<id>` with valid Bearer token
**Expected Results**:
- 200 OK
- Only bookings for the specified event are returned
**Business Rule**: BR-2 (user-scoped data)
**Suggested Layer**: API

---

## Business Rules (TC-100–199)

### TC-100: FIFO pruning — 10th booking removes oldest
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has exactly 9 bookings (sandbox limit)
**Steps**:
1. Record the ID/ref of the oldest booking
2. Create a 10th booking via `POST /api/bookings` or UI flow
**Expected Results**:
- The 10th booking is created successfully
- The oldest booking (recorded in step 1) is automatically deleted
- User still has exactly 9 bookings
- Seats freed from deleted booking are restored to the corresponding event
**Business Rule**: BR-4 (FIFO pruning at limit 9)
**Suggested Layer**: API + E2E

---

### TC-101: Booking reference first character matches event title
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User logged in; event "Tech Summit" exists
**Steps**:
1. Book a ticket for event titled "Tech Summit"
2. Capture the `bookingRef` from `.booking-ref`
**Expected Results**:
- `bookingRef` starts with `T-`
- Remaining 6 characters are alphanumeric
**Business Rule**: BR-7 (bookingRef first letter = event title first letter)
**Suggested Layer**: E2E + API

---

### TC-102: Booking reference first char with different event titles
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Events starting with different letters exist (e.g., "Bollywood Night", "AI Summit")
**Steps**:
1. Book "Bollywood Night" → capture ref
2. Book "AI Summit" → capture ref
**Expected Results**:
- Bollywood Night booking ref starts with `B-`
- AI Summit booking ref starts with `A-`
**Business Rule**: BR-7
**Suggested Layer**: API

---

### TC-103: Total price = event price × quantity
**Category**: Business Rule
**Priority**: P0
**Preconditions**: Event "Tech Conference Bangalore" exists (price = $1499)
**Steps**:
1. Book 3 tickets for "Tech Conference Bangalore"
2. Check `totalPrice` in response and on UI
**Expected Results**:
- `totalPrice` = 1499 × 3 = 4497
**Business Rule**: BR-9 (price calculation)
**Suggested Layer**: API + E2E

---

### TC-104: Available seats reduce immediately on booking
**Category**: Business Rule
**Priority**: P0
**Preconditions**: Event with 50 seats and 0 existing user bookings
**Steps**:
1. Note current `availableSeats` for the event via `GET /api/events/:id`
2. Book 5 tickets via `POST /api/bookings`
3. `GET /api/events/:id` again
**Expected Results**:
- `availableSeats` decreases by 5 immediately
**Business Rule**: BR-6 (seat count reduces on booking)
**Suggested Layer**: API

---

### TC-105: User can book the same event multiple times
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has a dynamic (user-created) event with 100 seats
**Steps**:
1. Book 5 tickets for the event
2. Book 3 more tickets for the same event
**Expected Results**:
- Both bookings succeed
- Available seats = totalSeats − (5 + 3) = 92
- User now has 2 bookings for the same event
**Business Rule**: BR-6 (per-user seat computation for dynamic events)
**Suggested Layer**: API

---

### TC-106: Static event seat availability is fixed in DB
**Category**: Business Rule
**Priority**: P1
**Preconditions**: "Tech Conference Bangalore" static event (500 seats) exists
**Steps**:
1. `GET /api/events/:id` for a static event
2. Create a booking for that event
3. `GET /api/events/:id` again
**Expected Results**:
- `availableSeats` field reflects the seeded value and decrements correctly
**Business Rule**: BR-6 (static events use DB `availableSeats`)
**Suggested Layer**: API

---

### TC-107: Booking status is always "confirmed"
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User logged in
**Steps**:
1. Create a booking via `POST /api/bookings`
2. Retrieve it via `GET /api/bookings/:id`
**Expected Results**:
- `status` field = "confirmed" in response
**Business Rule**: Data model (status default)
**Suggested Layer**: API

---

### TC-108: Refund eligibility — multi-ticket not refundable
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has a booking with quantity = 3
**Steps**:
1. Navigate to `/bookings/:id`
2. Click `#check-refund-btn`
3. Wait for spinner to complete
4. Observe `#refund-result`
**Expected Results**:
- Result shows "Group bookings (3 tickets) are non-refundable"
**Business Rule**: BR-8 (quantity > 1 → non-refundable)
**Suggested Layer**: E2E

---

### TC-109: Booking ref uniqueness across bookings
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User creates 5 bookings
**Steps**:
1. Create 5 bookings
2. Collect all `bookingRef` values
**Expected Results**:
- All 5 booking refs are unique
**Business Rule**: BR-7 (unique ref via collision retry)
**Suggested Layer**: API

---

## Security (TC-200–299)

### TC-200: Cross-user booking access returns 403
**Category**: Security
**Priority**: P0
**Preconditions**: User A and User B both have accounts; User A has a booking
**Steps**:
1. Login as User A; create a booking; note the booking ID
2. Logout (clear localStorage); login as User B
3. Navigate to `/bookings/:userA_booking_id`
**Expected Results**:
- UI shows "Access Denied" message
- No booking details are revealed
**Business Rule**: BR-2 (cross-user access → 403)
**Suggested Layer**: E2E

---

### TC-201: Cross-user booking access via API returns 403
**Category**: Security
**Priority**: P0
**Preconditions**: User A and User B both have tokens; User A has booking ID X
**Steps**:
1. `GET /api/bookings/X` with User B's Bearer token
**Expected Results**:
- HTTP 403 Forbidden
- Response: `{ message: "Access Denied" }` or `"Forbidden"`
**Business Rule**: BR-2
**Suggested Layer**: API

---

### TC-202: Cross-user booking cancellation via API returns 403
**Category**: Security
**Priority**: P0
**Preconditions**: User A has booking ID X; User B is authenticated
**Steps**:
1. `DELETE /api/bookings/X` with User B's Bearer token
**Expected Results**:
- HTTP 403 Forbidden
- Booking not deleted; seat count unchanged
**Business Rule**: BR-2
**Suggested Layer**: API

---

### TC-203: Unauthenticated booking creation returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No Bearer token
**Steps**:
1. `POST /api/bookings` with valid body but no Authorization header
**Expected Results**:
- HTTP 401 Unauthorized
- Response: `{ message: "Unauthorized" }`
**Business Rule**: Auth middleware
**Suggested Layer**: API

---

### TC-204: Unauthenticated GET bookings returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No Bearer token
**Steps**:
1. `GET /api/bookings` with no Authorization header
**Expected Results**:
- HTTP 401 Unauthorized
**Business Rule**: Auth middleware
**Suggested Layer**: API

---

### TC-205: Expired JWT token returns 401
**Category**: Security
**Priority**: P1
**Preconditions**: User has a JWT that is 7+ days old (manually expired)
**Steps**:
1. `GET /api/bookings` with expired Bearer token
**Expected Results**:
- HTTP 401 Unauthorized
**Business Rule**: Auth — JWT 7-day expiry
**Suggested Layer**: API

---

### TC-206: Tampered booking reference lookup returns no result
**Category**: Security
**Priority**: P2
**Preconditions**: Valid authenticated user
**Steps**:
1. `GET /api/bookings/ref/ZZZZZZ` with a ref that doesn't exist
**Expected Results**:
- 404 Not Found or empty result — no server error
**Business Rule**: BR-7 (ref uniqueness)
**Suggested Layer**: API

---

### TC-207: User cannot clear another user's bookings
**Category**: Security
**Priority**: P0
**Preconditions**: User A has 5 bookings; User B is logged in
**Steps**:
1. `DELETE /api/bookings` with User B's token (clears User B's bookings only)
2. Check User A's bookings still exist using User A's token
**Expected Results**:
- User A's bookings are unaffected
- Only User B's bookings are cleared
**Business Rule**: BR-2 (sandbox isolation)
**Suggested Layer**: API

---

## Negative / Error (TC-300–399)

### TC-300: Book event with insufficient seats
**Category**: Negative
**Priority**: P0
**Preconditions**: Event with only 1 available seat
**Steps**:
1. `POST /api/bookings` with `quantity: 5` for the event
**Expected Results**:
- HTTP 400 Bad Request
- Response: `{ message: "Insufficient seats available" }`
- Seat count unchanged
**Business Rule**: Validation — seat availability check
**Suggested Layer**: API

---

### TC-301: Book with quantity = 0
**Category**: Negative
**Priority**: P0
**Preconditions**: User logged in; event exists
**Steps**:
1. `POST /api/bookings` with `quantity: 0`
**Expected Results**:
- HTTP 400 Bad Request — quantity must be between 1 and 10
**Business Rule**: bookingValidator (quantity 1–10)
**Suggested Layer**: API

---

### TC-302: Book with quantity = 11
**Category**: Negative
**Priority**: P0
**Preconditions**: User logged in; event with 100 seats
**Steps**:
1. `POST /api/bookings` with `quantity: 11`
**Expected Results**:
- HTTP 400 Bad Request — quantity must be between 1 and 10
**Business Rule**: bookingValidator (quantity max = 10)
**Suggested Layer**: API

---

### TC-303: Book with missing customerName
**Category**: Negative
**Priority**: P1
**Preconditions**: User logged in; event exists
**Steps**:
1. `POST /api/bookings` with body omitting `customerName`
**Expected Results**:
- HTTP 400 Bad Request with validation error for `customerName`
**Business Rule**: bookingValidator (customerName required)
**Suggested Layer**: API

---

### TC-304: Book with customerName shorter than 2 chars
**Category**: Negative
**Priority**: P1
**Preconditions**: User logged in; event exists
**Steps**:
1. `POST /api/bookings` with `customerName: "A"`
**Expected Results**:
- HTTP 400 Bad Request — name minimum 2 characters
**Business Rule**: bookingValidator (customerName min 2)
**Suggested Layer**: API

---

### TC-305: Book with invalid customerEmail
**Category**: Negative
**Priority**: P1
**Preconditions**: User logged in; event exists
**Steps**:
1. `POST /api/bookings` with `customerEmail: "not-an-email"`
**Expected Results**:
- HTTP 400 Bad Request — valid email required
**Business Rule**: bookingValidator (email format)
**Suggested Layer**: API

---

### TC-306: Book with customerPhone fewer than 10 digits
**Category**: Negative
**Priority**: P1
**Preconditions**: User logged in; event exists
**Steps**:
1. `POST /api/bookings` with `customerPhone: "12345"`
**Expected Results**:
- HTTP 400 Bad Request — phone minimum 10 digits
**Business Rule**: bookingValidator (phone min 10)
**Suggested Layer**: API

---

### TC-307: Book a non-existent event
**Category**: Negative
**Priority**: P1
**Preconditions**: User logged in
**Steps**:
1. `POST /api/bookings` with `eventId: 999999`
**Expected Results**:
- HTTP 404 Not Found — event does not exist
**Business Rule**: Event existence check in service
**Suggested Layer**: API

---

### TC-308: Cancel a non-existent booking
**Category**: Negative
**Priority**: P1
**Preconditions**: User logged in
**Steps**:
1. `DELETE /api/bookings/999999`
**Expected Results**:
- HTTP 404 Not Found
**Business Rule**: Booking existence check in service
**Suggested Layer**: API

---

### TC-309: Get booking detail for non-existent ID
**Category**: Negative
**Priority**: P1
**Preconditions**: User logged in
**Steps**:
1. `GET /api/bookings/999999`
**Expected Results**:
- HTTP 404 Not Found
**Business Rule**: Booking existence check
**Suggested Layer**: API

---

### TC-310: Submit booking form with all fields blank (UI)
**Category**: Negative
**Priority**: P1
**Preconditions**: User on `/events/:id` booking form
**Steps**:
1. Leave Full Name, Email, Phone empty
2. Click `.confirm-booking-btn`
**Expected Results**:
- Form does not submit
- Validation error messages displayed inline for each required field
**Business Rule**: bookingValidator (all fields required)
**Suggested Layer**: E2E

---

### TC-311: Book event with 0 available seats
**Category**: Negative
**Priority**: P0
**Preconditions**: Event where `availableSeats = 0`
**Steps**:
1. Navigate to `/events/:id`
2. Attempt to click "Book Now" or increment ticket count
3. Submit booking
**Expected Results**:
- Booking rejected with "Insufficient seats available"
- "Book Now" button may be disabled or show an error
**Business Rule**: Seat availability validation
**Suggested Layer**: E2E + API

---

## Edge Cases (TC-400–499)

### TC-400: Book exactly 1 ticket (minimum quantity)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User logged in; event with seats available
**Steps**:
1. `POST /api/bookings` with `quantity: 1`
**Expected Results**:
- Booking created successfully
- `totalPrice` = event price × 1
- `availableSeats` decreases by 1
**Business Rule**: bookingValidator (quantity min = 1)
**Suggested Layer**: API

---

### TC-401: Book exactly 10 tickets (maximum quantity)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: Event with at least 10 available seats
**Steps**:
1. `POST /api/bookings` with `quantity: 10`
**Expected Results**:
- Booking created successfully
- `totalPrice` = event price × 10
- `availableSeats` decreases by 10
**Business Rule**: bookingValidator (quantity max = 10)
**Suggested Layer**: API

---

### TC-402: Create exactly the 9th booking (at limit)
**Category**: Edge Case
**Priority**: P0
**Preconditions**: User has exactly 8 bookings
**Steps**:
1. Create 1 more booking
**Expected Results**:
- 9th booking is created successfully
- No FIFO deletion occurs
- User has exactly 9 bookings
**Business Rule**: BR-4 (limit is 9, pruning only on 10th)
**Suggested Layer**: API

---

### TC-403: Book event with price = 0 (free event)
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Event exists with price = 0
**Steps**:
1. `POST /api/bookings` for the free event with `quantity: 3`
**Expected Results**:
- Booking created successfully
- `totalPrice` = 0
**Business Rule**: BR-9 (price >= 0 allowed)
**Suggested Layer**: API

---

### TC-404: Booking reference collision retry produces unique ref
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Many bookings exist (stress scenario)
**Steps**:
1. Create 50+ bookings via API (across accounts if needed)
**Expected Results**:
- All booking refs are unique
- No 500 errors due to collision
**Business Rule**: BR-7 (collision retry ensures uniqueness)
**Suggested Layer**: API

---

### TC-405: Decrement quantity below 1 in UI is blocked
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User on `/events/:id`; `#ticket-count` shows 1
**Steps**:
1. Click `button:has-text("-")` when count is already 1
**Expected Results**:
- Ticket count does not go below 1
- Decrement button is disabled or has no effect
**Business Rule**: bookingValidator (quantity min = 1)
**Suggested Layer**: E2E + Component

---

### TC-406: Increment quantity above 10 in UI is blocked
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User on `/events/:id`; `#ticket-count` shows 10
**Steps**:
1. Click `button:has-text("+")` when count is already 10
**Expected Results**:
- Ticket count does not exceed 10
- Increment button is disabled or has no effect
**Business Rule**: bookingValidator (quantity max = 10)
**Suggested Layer**: E2E + Component

---

### TC-407: FIFO — correct oldest booking is deleted on overflow
**Category**: Edge Case
**Priority**: P0
**Preconditions**: User has 9 bookings; note `createdAt` of all 9
**Steps**:
1. Create a 10th booking
2. Retrieve the user's bookings via `GET /api/bookings`
**Expected Results**:
- The booking with the earliest `createdAt` is the one removed
- The 9 remaining bookings include the new one and 8 most recent prior bookings
**Business Rule**: BR-4 (FIFO — oldest is removed)
**Suggested Layer**: API

---

### TC-408: customerPhone with allowed special characters
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User logged in; event exists
**Steps**:
1. `POST /api/bookings` with `customerPhone: "+91 (98765) 43210"`
**Expected Results**:
- Booking created successfully (validator allows +, -, spaces, parentheses)
**Business Rule**: bookingValidator (phone format)
**Suggested Layer**: API

---

### TC-409: Book event where quantity exactly equals availableSeats
**Category**: Edge Case
**Priority**: P1
**Preconditions**: Event with exactly 5 available seats
**Steps**:
1. `POST /api/bookings` with `quantity: 5`
**Expected Results**:
- Booking succeeds
- `availableSeats` = 0 after booking
**Business Rule**: BR-6 (seat boundary)
**Suggested Layer**: API

---

## UI State (TC-500–599)

### TC-500: Empty bookings page shows empty state
**Category**: UI State
**Priority**: P1
**Preconditions**: User logged in with zero bookings
**Steps**:
1. Navigate to `/bookings`
**Expected Results**:
- No `#booking-card` elements are visible
- Empty state message or prompt to browse events is shown
- "Clear all bookings" link is not visible
**Business Rule**: BR-4 (bookings list)
**Suggested Layer**: E2E

---

### TC-501: Sandbox warning banner appears on bookings page near limit
**Category**: UI State
**Priority**: P1
**Preconditions**: User has 8+ bookings
**Steps**:
1. Navigate to `/bookings`
**Expected Results**:
- Warning banner appears referencing the 9-booking sandbox limit
- Banner text matches `getByText(/sandbox holds up to/i)` or similar
**Business Rule**: BR-5 (sandbox warning banners)
**Known Risk**: Banner not confirmed implemented in current `/bookings` page code — verify existence before automating
**Suggested Layer**: E2E

---

### TC-502: Sandbox warning banner hidden when bookings count is low
**Category**: UI State
**Priority**: P2
**Preconditions**: User has fewer than 5 bookings
**Steps**:
1. Navigate to `/bookings`
**Expected Results**:
- No sandbox warning banner is visible
**Business Rule**: BR-5 (banner hidden at low counts)
**Known Risk**: Same as TC-501 — verify banner implementation exists
**Suggested Layer**: E2E

---

### TC-503: Refund spinner displays for ~4 seconds
**Category**: UI State
**Priority**: P1
**Preconditions**: User on `/bookings/:id`
**Steps**:
1. Click `#check-refund-btn`
2. Immediately observe `#refund-spinner`
3. Wait and observe `#refund-result`
**Expected Results**:
- `#refund-spinner` is visible for approximately 4 seconds
- After spinner disappears, `#refund-result` displays the eligibility message
- No backend call is made (pure frontend logic)
**Business Rule**: BR-8 (4-second spinner)
**Suggested Layer**: E2E

---

### TC-504: Refund button not clickable while spinner is active
**Category**: UI State
**Priority**: P2
**Preconditions**: User has clicked `#check-refund-btn` (spinner is showing)
**Steps**:
1. Click `#check-refund-btn`
2. Immediately try to click it again
**Expected Results**:
- Button is disabled or ignores the second click during spinner duration
**Business Rule**: BR-8 (single-run refund check)
**Suggested Layer**: E2E

---

### TC-505: Booking detail page shows all expected fields
**Category**: UI State
**Priority**: P1
**Preconditions**: User has a booking
**Steps**:
1. Navigate to `/bookings/:id`
**Expected Results**:
- `h1` contains event title
- `span.font-mono.font-bold` contains booking ref matching `[A-Z]-[A-Z0-9]{6}`
- Customer name, email, phone, quantity, total price all visible
- Status "confirmed" displayed
- Event venue, date/time, category visible
- `#check-refund-btn` visible
- Cancel button visible
**Business Rule**: BR-1 (booking detail view)
**Suggested Layer**: E2E

---

### TC-506: Booking confirmation card displays after successful booking
**Category**: UI State
**Priority**: P0
**Preconditions**: User completes booking flow
**Steps**:
1. Complete all steps in TC-001
**Expected Results**:
- Confirmation card appears on same page (not a redirect)
- `.booking-ref` is prominently displayed
- "View My Bookings" and "Browse Events" navigation links are visible
- No error messages shown
**Business Rule**: BR-1 (post-booking confirmation)
**Suggested Layer**: E2E

---

### TC-507: Bookings page pagination (more than 9 bookings not shown simultaneously)
**Category**: UI State
**Priority**: P2
**Preconditions**: Note: sandbox limit is 9, so user can have at most 9 bookings
**Steps**:
1. User has 9 bookings
2. Navigate to `/bookings`
**Expected Results**:
- All 9 bookings displayed (or paginated if page limit < 9)
- Page renders without errors
**Business Rule**: BR-4 (page shows max 9 bookings)
**Suggested Layer**: E2E

---

### TC-508: Access Denied page shown for cross-user booking
**Category**: UI State
**Priority**: P0
**Preconditions**: User B navigates to `/bookings/:userA_id`
**Steps**:
1. (See TC-200 setup)
2. Observe the `/bookings/:id` page for another user's booking
**Expected Results**:
- "Access Denied" message is displayed
- No booking data is visible
- No JavaScript errors in console
**Business Rule**: BR-2 (cross-user isolation UI)
**Suggested Layer**: E2E

---

### TC-509: Ticket count UI reflects updated value after increment/decrement
**Category**: UI State
**Priority**: P1
**Preconditions**: User on `/events/:id`
**Steps**:
1. Note initial `#ticket-count` value (should be 1)
2. Click `+` button 3 times
3. Click `-` button 1 time
**Expected Results**:
- `#ticket-count` shows 3 (1 + 3 - 1)
- Changes are reflected in total price preview if shown
**Business Rule**: BR-9 (quantity UI controls)
**Suggested Layer**: E2E + Component

---

### TC-510: Bookings list loading state shows skeleton cards
**Category**: UI State
**Priority**: P1
**Preconditions**: User logged in; simulate slow network or fresh page load
**Steps**:
1. Navigate to `/bookings` before API response returns
**Expected Results**:
- 5 animated skeleton/pulse placeholder cards are shown
- No actual booking data is visible yet
- No error message is shown
**Business Rule**: UX loading feedback
**Suggested Layer**: E2E (intercept & delay network)

---

### TC-511: Bookings list error state shows retry option
**Category**: UI State
**Priority**: P1
**Preconditions**: User logged in; backend unreachable (simulate network error)
**Steps**:
1. Block network requests to `/api/bookings`
2. Navigate to `/bookings`
**Expected Results**:
- Error message: "Couldn't load bookings"
- Sub-message: "Failed to connect to the server. Please try again."
- "Retry" button is visible and calls `refetch()` on click
**Business Rule**: Frontend error boundary pattern
**Suggested Layer**: E2E (intercept network)

---

### TC-512: Booking detail loading state shows spinner
**Category**: UI State
**Priority**: P1
**Preconditions**: User navigates to `/bookings/:id`; simulate slow response
**Steps**:
1. Intercept and delay `GET /api/bookings/:id`
2. Navigate to `/bookings/:id`
**Expected Results**:
- Full-page spinner (`<Spinner size="lg">`) shown during load
- Booking content does not flash before data arrives
**Business Rule**: UX loading feedback
**Suggested Layer**: E2E (intercept & delay network)

---

### TC-513: Booking detail shows "Booking not found" for invalid ID (UI)
**Category**: UI State
**Priority**: P1
**Preconditions**: User logged in
**Steps**:
1. Navigate to `/bookings/999999`
**Expected Results**:
- Title: "Booking not found"
- Description: "This booking doesn't exist or may have been cancelled."
- "View My Bookings" button links back to `/bookings`
- No booking data shown, no JS error
**Business Rule**: 404 fallback handling in frontend
**Suggested Layer**: E2E

---

### TC-514: Booking detail "Access Denied" UI — correct wording
**Category**: UI State
**Priority**: P0
**Preconditions**: User B is logged in; User A's booking ID known
**Steps**:
1. Navigate to `/bookings/:userA_id` as User B
**Expected Results**:
- Title: "Access Denied"
- Description: "You are not authorized to view this booking."
- "View My Bookings" button visible and navigates to `/bookings`
- No booking data leaked
**Business Rule**: BR-2 (cross-user isolation)
**Suggested Layer**: E2E

---

### TC-515: Cancel booking from detail page shows confirmation modal
**Category**: UI State
**Priority**: P1
**Preconditions**: User on `/bookings/:id`
**Steps**:
1. Click "Cancel Booking" button
**Expected Results**:
- A confirmation modal/dialog appears before the booking is deleted
- Modal shows booking reference and quantity to be released
- Confirm button is present and enabled
- Dismiss/close button cancels the action without deleting
**Business Rule**: BR-4 (cancellation frees seats)
**Suggested Layer**: E2E

---

### TC-516: Cancel booking from detail page — confirm button disabled during in-flight request
**Category**: UI State
**Priority**: P2
**Preconditions**: User on `/bookings/:id`; confirmation modal open
**Steps**:
1. Click "Cancel Booking" → modal appears
2. Click Confirm (intercept DELETE to introduce delay)
**Expected Results**:
- Confirm button shows loading indicator and is disabled while request is in flight
- Dialog does not close prematurely
**Business Rule**: UX double-submit prevention
**Suggested Layer**: E2E

---

### TC-517: Cancel booking success — toast shown and redirect to /bookings
**Category**: UI State
**Priority**: P1
**Preconditions**: User on `/bookings/:id`
**Steps**:
1. Confirm booking cancellation
**Expected Results**:
- Success toast: "Booking cancelled successfully"
- User is redirected to `/bookings`
- Cancelled booking no longer appears in list
**Business Rule**: BR-4 (cancellation flow)
**Suggested Layer**: E2E

---

### TC-518: Cancel booking API error — toast shown, modal stays open
**Category**: UI State
**Priority**: P1
**Preconditions**: User on `/bookings/:id`; cancel modal open; intercept DELETE to return 500
**Steps**:
1. Confirm cancellation
2. Backend returns error
**Expected Results**:
- Error toast appears with the error message
- Modal remains open (not dismissed)
- Booking is NOT removed from the list
- User can retry
**Business Rule**: Frontend error recovery
**Suggested Layer**: E2E (intercept network)

---

### TC-519: Cancel booking from booking card on list page
**Category**: UI State
**Priority**: P1
**Preconditions**: User on `/bookings`; at least one booking card visible
**Steps**:
1. Click "Cancel Booking" on a `#booking-card`
2. Confirm in the dialog
**Expected Results**:
- Booking is removed from the list after confirmation
- Seat count for the event is freed
- Success feedback shown (toast or list refresh)
**Business Rule**: BR-4 (cancellation from list view)
**Suggested Layer**: E2E

---

### TC-520: Clear all bookings requires confirmation dialog
**Category**: UI State
**Priority**: P1
**Preconditions**: User has at least 1 booking; on `/bookings`
**Steps**:
1. Click "Clear all bookings"
**Expected Results**:
- Browser `confirm()` dialog appears: "Clear all your bookings? This cannot be undone."
- If user clicks Cancel: no bookings are deleted
- If user clicks OK: all bookings are cleared
**Business Rule**: BR-4 (Clear All — irreversible)
**Suggested Layer**: E2E

---

### TC-521: Clear all button shows "Clearing…" and is disabled during request
**Category**: UI State
**Priority**: P2
**Preconditions**: User confirms the clear-all action; intercept DELETE to delay
**Steps**:
1. Confirm "Clear all bookings"
2. Observe button state during the in-flight request
**Expected Results**:
- Button label changes to "Clearing…"
- Button is disabled (no double-click possible)
**Business Rule**: UX double-submit prevention
**Suggested Layer**: E2E (intercept network)

---

### TC-522: "Sold Out" button state on event detail page
**Category**: UI State
**Priority**: P0
**Preconditions**: Event with `availableSeats = 0`
**Steps**:
1. Navigate to `/events/:id` for that event
**Expected Results**:
- "Confirm Booking" button is replaced with or shows "Sold Out"
- Button is disabled — clicking has no effect
- No booking is submitted
**Business Rule**: Seat availability check
**Suggested Layer**: E2E

---

### TC-523: Increment button capped at min(10, availableSeats)
**Category**: UI State
**Priority**: P1
**Preconditions**: Event with exactly 3 available seats
**Steps**:
1. Navigate to `/events/:id` for that event
2. Click `+` button 3 times (reaching 3)
3. Click `+` again
**Expected Results**:
- `#ticket-count` caps at 3 (the available seat count, not 10)
- Increment button is disabled at that cap
**Business Rule**: bookingValidator (quantity ≤ availableSeats)
**Suggested Layer**: E2E + Component

---

### TC-524: Booking form submit button shows loading state during in-flight request
**Category**: UI State
**Priority**: P2
**Preconditions**: User on `/events/:id`; form filled; intercept POST to delay
**Steps**:
1. Fill and submit the booking form
2. Observe button state during request
**Expected Results**:
- "Confirm Booking" button is disabled/loading while request is in flight
- No duplicate booking created on double-click
**Business Rule**: UX double-submit prevention
**Suggested Layer**: E2E

---

### TC-525: Booking submission API error — toast shown, form stays visible
**Category**: UI State
**Priority**: P1
**Preconditions**: Valid booking form; intercept POST `/api/bookings` to return 500
**Steps**:
1. Fill all fields and click "Confirm Booking"
2. Backend returns error
**Expected Results**:
- Error toast appears with the error message
- Booking form remains on screen (no confirmation card)
- User can correct and retry
**Business Rule**: Frontend error recovery
**Suggested Layer**: E2E (intercept network)

---

### TC-526: Inline form validation errors shown for all fields simultaneously
**Category**: UI State
**Priority**: P1
**Preconditions**: User on `/events/:id`
**Steps**:
1. Leave Full Name = "A" (1 char), Email = "notanemail", Phone = "123" (3 digits)
2. Click "Confirm Booking"
**Expected Results**:
- Inline error under Name: "Name must be at least 2 chars"
- Inline error under Email: "Enter a valid email"
- Inline error under Phone: "Enter a valid 10-digit phone"
- Form does not submit
- All 3 errors visible simultaneously
**Business Rule**: bookingValidator (all fields)
**Suggested Layer**: E2E + Component

---

### TC-527: Refund result shows green styling for eligible / red for ineligible
**Category**: UI State
**Priority**: P2
**Preconditions**: User on `/bookings/:id`
**Steps**:
1. For quantity = 1 booking: click `#check-refund-btn`, wait for result
2. For quantity > 1 booking: repeat
**Expected Results**:
- Quantity 1: green box with checkmark icon + "Eligible for refund. Single-ticket bookings qualify for a full refund."
- Quantity > 1: red box with X icon + "Not eligible for refund. Group bookings (N tickets) are non-refundable."
**Business Rule**: BR-8 (refund eligibility UI)
**Suggested Layer**: E2E

---

### TC-528: FIFO pruning — same-event fallback when all bookings are for same event
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has 9 bookings all for the same event (Event A)
**Steps**:
1. Create a 10th booking for Event A
**Expected Results**:
- 10th booking created successfully
- Oldest booking for Event A is deleted (no other event to fall back to)
- `availableSeats` for Event A accounts for the pruned booking
- User has exactly 9 bookings, all for Event A
**Business Rule**: BR-4 (FIFO same-event fallback in service logic)
**Suggested Layer**: API

---

### TC-529: Booking ref generation retries on collision; falls back to timestamp
**Category**: Edge Case
**Priority**: P3
**Preconditions**: Stress test scenario — simulate 10 consecutive ref collisions
**Steps**:
1. Mock the ref generator to collide 10 times, then succeed on timestamp fallback
**Expected Results**:
- Booking is still created successfully
- Booking ref is unique (timestamp-based fallback format)
- No 500 error returned to client
**Business Rule**: BR-7 (collision retry up to 10 attempts, then timestamp fallback)
**Suggested Layer**: Unit

---

### TC-530: 401 auto-redirect to /login when JWT is missing from localStorage
**Category**: Security
**Priority**: P1
**Preconditions**: User clears `eventhub_token` from localStorage while on `/bookings`
**Steps**:
1. Remove `localStorage.getItem('eventhub_token')` via browser DevTools
2. Trigger any bookings API call (e.g., refresh page)
**Expected Results**:
- API client interceptor detects 401 response
- Token cleared from localStorage
- User redirected to `/login` automatically
**Business Rule**: Auth middleware + frontend interceptor
**Suggested Layer**: E2E

---

### TC-531: Admin bookings page loads booking list with filters
**Category**: Happy Path
**Priority**: P2
**Preconditions**: User logged in; navigate to `/admin/bookings`
**Steps**:
1. Navigate to `/admin/bookings`
2. Change "Status" filter dropdown to "Confirmed"
**Expected Results**:
- Booking table loads with columns: Ref, Customer, Event, Qty, Total, Status, Date, Actions
- Filtering by "Confirmed" shows only confirmed bookings
- Pagination shown if totalPages > 1
**Business Rule**: Admin view of user's own bookings
**Suggested Layer**: E2E

---

### TC-532: Admin bookings — booking detail modal opens on "View"
**Category**: UI State
**Priority**: P2
**Preconditions**: Admin bookings page loaded with at least one booking
**Steps**:
1. Click "View" on any booking row
**Expected Results**:
- Modal opens showing: ref in title, all booking/event/customer details
- Modal closes on backdrop click or close button
- No page navigation occurs
**Business Rule**: Admin detail view
**Suggested Layer**: E2E

---

*End of booking management test scenarios. Total: 68 scenarios across 6 categories.*
