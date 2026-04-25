// @ts-check
const { test, expect } = require('@playwright/test');
const { ai } = require('@zerostep/playwright');

const USER_EMAIL = 'rahulshetty1@gmail.com';
const USER_PASSWORD = 'Magiclife1!';

/**
 * Login helper — shared across all tests in this file.
 *
 * Selector note: The login button has no #login-btn ID in the DOM.
 * Using getByRole('button', { name: 'Sign In' }) instead.
 * Post-login check uses the nav "My Bookings" link — present on every authenticated page.
 */
async function login(page) {
  await page.goto('/login');
  await page.getByPlaceholder('you@email.com').fill(USER_EMAIL);
  await page.getByLabel('Password').fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'My Bookings' })
  ).toBeVisible();
}

/**
 * Formats a number as a USD string, locale-independent.
 * e.g. 3000 → "$3,000", 600 → "$600"
 */
function formatUSD(amount) {
  return '$' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ---------------------------------------------------------------------------

test.describe('Booking Flow', () => {

  /**
   * TC-001: Create a booking successfully
   * Business rules: BR-1 (booking flow), BR-7 (bookingRef format + prefix), BR-9 (price × quantity)
   * Priority: P0
   */
  test('TC-001: Create a booking successfully', async ({ page }) => {
    // -- Step 1: Login --
    await login(page);

    // -- Step 2: Navigate to events, capture first event card title --
    // ZeroStep used here — getByRole('link').first() inside a card is ambiguous (could be
    // image link, wrapper, or title). Dev should add data-testid="event-title" on title element.
    await page.goto('/events');
    const firstCard = page.getByTestId('event-card').first();
    await expect(firstCard).toBeVisible();
    const eventTitle = await ai('What is the title of the first event card on the page? Return only the event name text', { page, test });
    console.log(`Booking event: "${eventTitle}"`);

    // -- Step 3: Click Book Now on the first event card --
    await firstCard.getByTestId('book-now-btn').click();
    await expect(page).toHaveURL(/\/events\/\d+/);

    // -- Step 4: Capture price per ticket (needed for BR-9 assertion) --
    // ZeroStep used here — no stable selector exists for this price display.
    // Missing data-testid: developers should add data-testid="price-per-ticket" here.
    const priceText = await ai('What is the price per ticket? Return only the price text including the dollar sign and any commas, e.g. "$300" or "$1,200"', { page, test });
    const rawPrice = parseFloat(priceText.replace(/[$,]/g, ''));
    console.log(`Price per ticket: ${priceText} (raw: ${rawPrice})`);

    // -- Step 5: Increment ticket quantity to 2 --
    await page.getByRole('button', { name: '+' }).click();
    await expect(page.locator('#ticket-count')).toHaveText('2');

    // -- Step 6: Fill customer details --
    // Note: label text includes asterisk — getByLabel('Full Name') does not match.
    // Missing data-testid on Full Name and Phone inputs.
    await page.getByLabel('Full Name*').fill('Alice Smith');
    await page.locator('#customer-email').fill('alice@example.com');
    await page.getByPlaceholder('+91 98765 43210').fill('+91 9876543210');

    // -- Step 7: Submit the booking --
    // .confirm-booking-btn class exists but getByRole is preferred per best practices.
    await page.getByRole('button', { name: 'Confirm Booking' }).click();

    // -- Step 8: Assert confirmation card appears on the same page (BR-1) --
    await expect(page.getByText('Booking Confirmed!')).toBeVisible();

    // -- Step 9: Assert booking ref visible and matches [A-Z]-[A-Z0-9]{6} (BR-7) --
    // ZeroStep used here — .booking-ref is a CSS class with no data-testid equivalent.
    const bookingRef = await ai('What is the booking reference shown in the confirmation? Return only the reference code, e.g. "D-ABC123"', { page, test });
    expect(bookingRef).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);

    // -- Step 10: Assert first char of ref = first char of event title (BR-7) --
    expect(bookingRef[0]).toBe(eventTitle.trim()[0].toUpperCase());
    console.log(`Ref: ${bookingRef} — expected prefix: ${eventTitle.trim()[0].toUpperCase()}`);

    // -- Step 11: Assert total price = price × 2 displayed in confirmation card (BR-9) --
    const expectedTotal = formatUSD(rawPrice * 2);
    await expect(page.getByText(expectedTotal)).toBeVisible();
    console.log(`Total assertion passed: ${expectedTotal}`);

    // -- Step 12: Assert post-booking navigation links visible (BR-1) --
    await expect(page.getByRole('link', { name: 'View My Bookings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse More Events' })).toBeVisible();
  });

  // ---------------------------------------------------------------------------

  /**
   * TC-002: View bookings list
   * Business rules: BR-2 (each user sees only their own bookings)
   * Priority: P0
   * Precondition: ≥1 booking exists. TC-001 creates one; fullyParallel=false ensures ordering.
   */
  test('TC-002: View bookings list', async ({ page }) => {
    // -- Step 1: Login --
    await login(page);

    // -- Step 2: Navigate to bookings page --
    await page.goto('/bookings');

    // -- Step 3: Assert at least one booking card is visible (BR-2) --
    // Playwright locator used for count — ZeroStep is not suited for numeric counting.
    // #booking-card is a non-unique ID (invalid HTML); dev should add data-testid="booking-card".
    const bookingCards = page.locator('#booking-card');
    await expect(bookingCards.first()).toBeVisible(); // auto-waits for page to load
    const count = await bookingCards.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Booking cards visible: ${count}`);

    // -- Step 4: Assert first card shows "confirmed" status --
    // ZeroStep used here — no data-testid or role to scope assertion to first card content.
    const isConfirmed = await ai('Does the first booking card show the status "confirmed"?', { page, test });
    expect(isConfirmed).toBeTruthy();

    // -- Step 5: Assert "View Details" link is present on the first card --
    const hasViewDetails = await ai('Is there a "View Details" link visible in the first booking card?', { page, test });
    expect(hasViewDetails).toBeTruthy();

    // -- Step 6: Assert "Clear all bookings" button is visible at top (BR-4) --
    await expect(
      page.getByRole('button', { name: 'Clear all bookings' })
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------

  /**
   * TC-003: View booking detail page
   * Business rules: BR-1 (booking detail journey), BR-7 (bookingRef format on detail page)
   * Priority: P0
   * Precondition: ≥1 booking exists.
   */
  test('TC-003: View booking detail page', async ({ page }) => {
    // -- Step 1: Login --
    await login(page);

    // -- Step 2: Navigate to bookings, click View Details on first card --
    // getByRole used — "View Details" has a clear accessible role; no ZeroStep needed here.
    // .first() is safe: all "View Details" links are equivalent; any will reach a /bookings/:id page.
    await page.goto('/bookings');
    await expect(page.getByRole('link', { name: 'View Details' }).first()).toBeVisible();
    await page.getByRole('link', { name: 'View Details' }).first().click();

    // -- Step 3: Assert URL changed to /bookings/:id --
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 4: Assert event title displayed as main heading (BR-1) --
    // ZeroStep used here — page.locator('h1') is too generic; no data-testid on the heading.
    // Dev should add data-testid="event-title-heading".
    const eventTitle = await ai('What is the event title shown as the main heading on this page? Return only the title text', { page, test });
    expect(eventTitle.trim().length).toBeGreaterThan(0);
    console.log(`Detail page title: "${eventTitle}"`);

    // -- Step 5: Assert booking ref visible and correctly formatted (BR-7) --
    // ZeroStep used here — ui-selectors.md says span.font-mono.font-bold but actual DOM
    // class is "text-gray-900 font-mono" and no data-testid exists for this element.
    const bookingRef = await ai('What is the booking reference number shown on this page? Return only the reference code, e.g. "D-ABC123"', { page, test });
    expect(bookingRef).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);
    console.log(`Booking ref on detail page: "${bookingRef}"`);

    // -- Step 6: Assert customer and payment section headings are visible --
    await expect(page.getByRole('heading', { name: 'Customer Details' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payment Summary' })).toBeVisible();
    await expect(page.getByText('Total Paid')).toBeVisible();

    // -- Step 7: Assert required action buttons are present (BR-1) --
    await expect(page.locator('#check-refund-btn')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Booking' })).toBeVisible();
  });

});
