# DueDateHQ Beta Plan

## Purpose

DueDateHQ is a Beta SaaS product for solo and small-firm CPAs who manage multi-state small business tax obligations. The product helps a CPA import or manually enter clients, generate traceable deadline tasks from verified tax rules, and triage the work that matters this week.

The core product principle is:

```txt
Traceable tax deadlines, not black-box dates.
```

DueDateHQ maintains a 50-state tax obligation library, monitors official sources within a 24-hour detection window, and clearly separates verified system rules from unverified, user-provided, or unsupported obligations.

## Current Delivery Goals

- Build a real Beta product, not a pure front-end demo.
- Support external users through hosted Cloudflare deployment.
- Use Spec-Driven Development: every major feature starts from `specs/<feature>.md`.
- Cover the two P0 user stories:
  - Import clients from TaxDome, Drake, Karbon, or QuickBooks CSV.
  - Let a CPA complete Monday triage in minutes from a clear deadline dashboard.
- Add manual entry for clients and custom deadlines.
- Add official source monitoring and a verification queue for tax rule maintenance.
- Add a feature progress page so product, engineering, and reviewers can see what is complete.

## Key Product Rule

```txt
Only Verified tax rules can create official system-generated deadline tasks.
User-provided deadlines can appear in the user's workspace, but must be marked as not verified by DueDateHQ.
Needs review, Source changed, and Unsupported rules must be transparent but cannot be treated as confirmed deadlines.
```

## Documents

- Product plan: `docs/product/due-date-hq-product-plan.md`
- Technical plan: `docs/technical/due-date-hq-beta-technical-plan.md`
- SDD specs index: `specs/README.md`

## SDD Specs

- `specs/auth.md`
- `specs/csv-imports.md`
- `specs/manual-client-and-deadline-entry.md`
- `specs/tax-obligation-library.md`
- `specs/tax-rule-verification.md`
- `specs/official-source-monitoring.md`
- `specs/coverage-matrix.md`
- `specs/monday-triage-dashboard.md`
- `specs/feature-progress-page.md`
- `specs/gtm.md`
- `specs/cloudflare-deployment.md`

## Beta Scope Boundaries

In scope:

- Email/password registration and login.
- Client import from four CSV sources using representative adapters.
- Manual client and deadline entry.
- Verified tax rules generating official tasks.
- 50-state obligation coverage matrix with verification status.
- Official source monitoring design and API surface.
- Verification queue for rule review and publishing.
- Cloudflare deployment plan.

Out of scope for Beta:

- Production-grade tax liability guarantee.
- Full OAuth, MFA, organizations, invitations, and role-based permissions.
- Automatic publishing of rule changes without verification.
- Complete city/county/industry-specific tax automation.
- Live AI interpretation without human review.

## GTM Summary

First users are solo multi-state CPAs. Pricing target is Pro at `$49/month`, with the first 20 Beta users free in exchange for onboarding calls, redacted CSV samples, and weekly feedback.

The initial acquisition motion is a practical lead magnet: a public "50-State Tax Deadline Coverage Tracker" backed by the same obligation library and verification statuses used inside the product.
