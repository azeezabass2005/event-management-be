**Product Vision**
================

A campus-wide event platform for OAU that digitizes end-to-end event workflows:
* Event discovery
* AI-powered ticketing
* Secure QR check-in & seat allocation
* Campus navigation
* Live updates & social posts
* Payments, refunds, and resale
* Feedback → AI-generated reports
* Fraud detection & platform security

**Personas**
-----------

### Organizer

* Faculty, department, or student body creating/managing events

### Attendee

* Students, staff, or guests discovering events, buying/holding tickets, attending, posting updates, and giving feedback

### Admin

* Oversees platform security, fraud detection, and moderation

**User Stories**
----------------

### Event Creation & Management (Organizer)

#### 1. Create event

* As an Organizer, I want to create an event with details (title, venue, capacity, time, categories, images, description, FAQs) so attendees can discover it.
* Example: Like creating an event on Lu.ma.
* Acceptance Criteria (AC):
    + Given I’m logged in, When I submit the form, Then the event is saved as Draft or Published and visible if Published.

#### 2. Tiered tickets

* As an Organizer, I want to set multiple ticket types (free, VIP, early bird) so I can segment pricing.
* Example: Like concerts having Regular, VIP, and VVIP tickets.
* Acceptance Criteria (AC):
    + Given I’m editing tickets, When I add tiers, Then attendees see them during checkout.

#### 3. Capacity control

* As an Organizer, I want to set a maximum number of tickets so the event does not oversell.
* Example: Like Eventbrite showing “Sold Out” when capacity is reached.
* Acceptance Criteria (AC):
    + Given tickets sold = capacity, When a new order is attempted, Then the system blocks it and shows “Sold Out.”

#### 4. Publish & schedule

* As an Organizer, I want to schedule an event to be published later.
* Example: Like scheduling an Instagram post.
* Acceptance Criteria (AC):
    + Given a future publish time, When the time arrives, Then the event is automatically published.

#### 5. Clone event

* As an Organizer, I want to duplicate a past event to save setup time.
* Example: Like duplicating an email campaign in Mailchimp.
* Acceptance Criteria (AC):
    + Given I select Clone, When I confirm, Then a Draft is created with copied fields but no old sales.

### Ticketing & QR (Attendee & Organizer)

#### 6. Buy ticket and receive QR code

* As an Attendee, I want to buy a ticket online and receive a QR code so I can check in easily.
* Example: Like Eventbrite tickets or airline boarding passes scanned at the gate.
* Acceptance Criteria (AC):
    + After purchase, a unique QR code is generated for the attendee.

### Event Discovery & Recommendations (Attendee)

#### 7. Event recommendations

* As an Attendee, I want recommended events based on my history and interests.
* Example: Like Netflix suggesting shows or Spotify recommending songs.
* Acceptance Criteria (AC):
    + Given past attendance, When I open Discover page, Then I see recommended events.

#### 8. Follow organizers

* As an Attendee, I want to follow popular organizers to get updates.
* Example: Like following people on Instagram.
* Acceptance Criteria (AC):
    + Given I follow, When they publish, Then I get notified.

### AI FAQs (Attendee)

#### 9. AI FAQs

* As an Attendee, I want to ask event-specific questions and get instant answers.
* Example: Like ChatGPT inside an event app.
* Acceptance Criteria (AC):
    + Given FAQs exist, When I ask, Then AI replies with official info.

#### 10. Escalation to human

* As an Attendee, I want to contact a human if AI cannot answer.
* Example: Like Jumia chat support escalation.
* Acceptance Criteria (AC):
    + Given low AI confidence, When I tap Contact, Then a message is sent to the organizer.

### Navigation to Venue (Attendee)

#### 11. Navigation to venue

* As an Attendee, I want navigation from my location to the event venue.
* Example: Like Google Maps in Uber.
* Acceptance Criteria (AC):
    + Given I share my location, When I tap Navigate, Then I see step-by-step directions.

### Live Updates & Social Posts (Organizer, Attendee, Admin)

#### 12. Event timeline

* As an Organizer, I want to post official updates.
* Example: Like pinned tweets.
* Acceptance Criteria (AC):
    + Given I’m the owner, When I post, Then it appears pinned.

#### 13. Attendee micro-posts

* As an Attendee, I want to share short posts (text/images).
* Example: Like tweets or IG stories.
* Acceptance Criteria (AC):
    + Given I have a ticket, When I post, Then it appears in the live feed.

#### 14. Moderation & report

* As an Admin, I want to remove abusive posts.
* Example: Like Twitter’s report & moderation tools.
* Acceptance Criteria (AC):
    + Given a post is reported, When I act, Then it’s hidden/removed.

### Feedback & Reports (Attendee, Organizer)

#### 15. Feedback after event

* As an Attendee, I want to give feedback after the event.
* Example: Like rating your Uber ride.
* Acceptance Criteria (AC):
    + Given event ended, When I open feedback, Then I can rate and comment.

#### 16. AI summary report

* As an Organizer, I want AI to summarize feedback.
* Example: Like Spotify Wrapped but for events.
* Acceptance Criteria (AC):
    + Given feedback exists, When I generate report, Then I see insights and trends.

#### 17. Predict turn-out

* As an Organizer, I want AI to predict attendance.
* Example: Like predictive analytics in Spotify Wrapped.
* Acceptance Criteria (AC):
    + Given past data, When I open analytics/forecast, Then I see turnout forecast.

### Payments & Refunds (Attendee, Organizer, Admin)

#### 18. Payment integration

* As an Attendee, I want to pay via cards or transfers.
* Example: Like Jumia checkout.
* Acceptance Criteria (AC):
    + Given valid payment, When I pay, Then I get a ticket.

#### 19. Organizer payout

* As an Organizer, I want automatic settlement post-event.
* Example: Like Uber driver weekly payouts.
* Acceptance Criteria (AC):
    + Given event ended, When payout day hits, Then funds settle.

#### 20. Chargeback handling

* As an Admin, I want workflows for disputes.
* Example: Like PayPal dispute resolution.
* Acceptance Criteria (AC):
    + Given a dispute, When I review, Then I can resolve and update records.

### Notifications (All Users)

#### 21. Pre-event reminders

* As an Attendee, I want reminders before events.
* Example: Like calendar notifications.
* Acceptance Criteria (AC):
    + Given I hold a ticket, When 24h/2h before, Then I get reminders.

#### 22. Real-time alerts

* As an Attendee, I want instant updates on event changes.
* Example: Like Uber notifying driver arrival.
* Acceptance Criteria (AC):
    + Given an update, When posted, Then I get notified, provided