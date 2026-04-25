# EventHub UI Selectors Reference

## Login Page
- Email input: `getByPlaceholder('you@email.com')` or `getByLabel('Email')`
- Password input: `getByLabel('Password')` or `getByPlaceholder('...')`
- Login button: `getByRole('button', { name: 'Sign In' })` *(not `#login-btn` — that ID does not exist in the DOM)*

## Home Page
- Browse Events link: `getByRole('link', { name: 'Browse Events ->' })`
- My Bookings link: navigation bar

## Events Page
- Event cards: `getByTestId('event-card')`
- Book Now button: `getByTestId('book-now-btn')` (inside card)
- Sandbox banner: `getByText(/sandbox holds up to/i)`
- Category/City/Search filters: form controls

## Event Detail / Booking Form
- Ticket count display: `#ticket-count`
- Increment/Decrement: `button:has-text("+")` / `button:has-text("-")`
- Full Name: `getByLabel('Full Name*')` *(label includes asterisk — `getByLabel('Full Name')` without asterisk does not match)*
- Email: `#customer-email`
- Phone: `getByPlaceholder('+91 98765 43210')`
- Confirm: `.confirm-booking-btn`
- Booking Ref: `.booking-ref`

## Admin Event Form
- Title: `#event-title-input`
- Description: `#admin-event-form textarea`
- City: `getByLabel('City')`
- Venue: `getByLabel('Venue')`
- Date: `getByLabel('Event Date & Time')`
- Price: `getByLabel('Price ($)')`
- Seats: `getByLabel('Total Seats')`
- Add button: `#add-event-btn`

## Bookings Page
- Booking cards: `#booking-card`
- View Details link: `getByRole('link', { name: 'View Details' })`
- Clear all bookings: `getByRole('button', { name: 'Clear all bookings' })` *(it is a `<button>`, not a link)*

## Booking Detail Page
- Booking ref: `span.font-mono` *(actual DOM class is `text-gray-900 font-mono` — `font-bold` class does not exist on this element)*
- Event title: `h1`
- Check refund: `#check-refund-btn`
- Refund spinner: `#refund-spinner`
- Refund result: `#refund-result`
- Cancel button: visible on detail page
