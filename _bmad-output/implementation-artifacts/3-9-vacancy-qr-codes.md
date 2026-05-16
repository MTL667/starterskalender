# Story 3.9: Vacancy QR Codes (Phase 2)

> Status: done
> Epic: 3 — Public Presence & Candidate Application
> Generated: 2026-05-16

## Story

As a headhunter,
I want unique QR codes for each vacancy,
so that I can use them on printed materials, posters, and at events for direct mobile access.

## Acceptance Criteria

**AC1:** Given a vacancy is published, When I view the vacancy detail in the admin, Then I see a "QR Code" button.
**AC2:** When the QR code is generated, it links to the canonical URL of the public detail page, And I can download it as high-res PNG.
**AC3:** When a candidate scans the QR code, they land on the mobile-optimized vacancy detail page.

## Tasks / Subtasks

- [x] Task 1: Create QR code generation API endpoint (AC: 1,2)
- [x] Task 2: Add QR code button to vacancy detail admin page (AC: 1)
- [x] Task 3: QR code dialog with download functionality (AC: 2)
- [x] Task 4: i18n keys (AC: 1)

## Dev Agent Record

### Completion Notes

- QR code API generates SVG from canonical vacancy URL using `qrcode` library
- Download as PNG via canvas conversion in client
- Button added to vacancy detail header in admin
- Mobile-optimized landing already exists (Story 3.2 public detail page is responsive)
