# EventHub

A full-stack event ticket booking platform where users browse events, book tickets, and manage their bookings. This project was created following the GenAI instructor course on Udemy.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, React Query v5 |
| Backend | Express.js 4.21, Prisma ORM 5.22, MySQL 8+ |
| Auth | JWT (7-day expiry), bcryptjs |
| Testing | Playwright (E2E, Chromium) + ZeroStep (AI selector fallback) |
| API Docs | Swagger UI at `/api/docs` |

## Project Structure

```
eventhub/
├── frontend/          # Next.js 14 app
│   ├── app/           # Pages (App Router)
│   │   ├── events/    # Event listing and detail/booking
│   │   ├── bookings/  # Booking list and detail
│   │   └── admin/     # Admin event and booking management
│   ├── components/    # Shared UI components
│   └── lib/           # API client, hooks, types
├── backend/           # Express.js API
│   └── src/
│       ├── routes/        # HTTP routing
│       ├── controllers/   # Request handling
│       ├── services/      # Business logic
│       ├── repositories/  # Data access (Prisma)
│       └── validators/    # Input validation
└── docs/              # Test scenarios and documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+

### Setup

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd eventhub
   ```

2. **Backend**

   ```bash
   cd backend
   cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
   npm install
   npx prisma migrate dev
   npm run seed                # loads 10 static events and test accounts
   npm run dev
   ```

3. **Frontend**

   ```bash
   cd frontend
   cp .env.example .env.local  # set NEXT_PUBLIC_API_URL
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Test Accounts

| Account | Email | Password |
|---|---|---|
| Gmail | rahulshetty1@gmail.com | Magiclife1! |
| Yahoo | rahulshetty1@yahoo.com | Magiclife1! |

## Key Business Rules

- Each user gets an isolated sandbox: up to **6 events** and **9 bookings**
- When a limit is reached, the oldest record is auto-deleted (FIFO)
- Booking quantity: **1–10 tickets** per booking
- Booking reference format: `[EVENT_TITLE_FIRST_LETTER]-[6_ALPHANUMERIC]` (e.g. `T-A3B2C1`)
- Refund eligibility is frontend-only: single-ticket bookings qualify, multi-ticket do not

## Running the Tests

### Prerequisites

```bash
npm install
npx playwright install chromium
```

### ZeroStep Setup (required for E2E)

ZeroStep is an AI-powered selector fallback used for elements that have no stable `data-testid` or role selector. Three selectors in the booking flow use it — the price display, and both booking reference fields.

1. Get a free token at [app.zerostep.com](https://app.zerostep.com)
2. Create `zerostep.config.json` in the project root (this file is gitignored):

```json
{
  "TOKEN": "your-token-here"
}
```

Or export as an environment variable:

```bash
export ZEROSTEP_TOKEN="your-token-here"
```

### Run the test suite

```bash
# Headless (CI)
npx playwright test --reporter=line

# Headed (watch it run in browser)
npx playwright test --headed --reporter=line

# Single file
npx playwright test tests/booking-flow.spec.js --reporter=line

# HTML report
npx playwright show-report
```

### ZeroStep — what it covers

| Test | Selector replaced | Reason |
|------|------------------|--------|
| TC-001 Step 4 | `span.text-2xl.font-bold.text-indigo-700` | Tailwind utility class — breaks on any restyling |
| TC-001 Step 9 | `.booking-ref` | CSS class only, no `data-testid` |
| TC-003 Step 5 | `span.font-mono` | Actual DOM class differs from `ui-selectors.md`; no `data-testid` |

All other selectors use stable `getByRole`, `getByLabel`, `getByPlaceholder`, or `getByTestId` — ZeroStep is only used where no proper selector exists.

**Developer action**: Add `data-testid="price-per-ticket"`, `data-testid="booking-ref"` to the relevant elements and the ZeroStep fallbacks can be removed.

---

## Documentation

- **Test strategy**: [`docs/test-strategy.md`](docs/test-strategy.md)
- **Test scenarios**: [`docs/test-scenarios.md`](docs/test-scenarios.md)
- **API reference**: available at `/api/docs` when the backend is running
