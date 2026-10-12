# Z6PD production readiness

## Deployed safeguards
- Discord membership and permission groups are checked server-side before privileged data access.
- Report reviews and returned-report resubmissions use conditional database updates to avoid double decisions.
- Personnel badge numbers and Discord-authoritative identity are not editable from the personnel update API.
- Confidential supervisor notes are visible to personnel managers and audited when added.
- Discord requests use short-lived member caching, in-flight deduplication and bounded retry for HTTP 429.
- A read-only /api/health endpoint returns 200 only when the database responds.
- GitHub Actions runs Prisma client generation and TypeScript checking on pushes and pull requests.

## Operator checklist (manual verification required)
1. Test officer, supervisor, FTO, IA and command access with separate Discord test accounts.
2. Confirm report submission, return, correction, resubmission and approval including simultaneous reviews.
3. Confirm automatic personnel onboarding and Discord nickname/rank changes without duplicate badge numbers.
4. Test 390px and 768px screens, keyboard Escape on navigation, and long navigation lists.
5. Back up PostgreSQL and test a restore before schema changes. Production currently uses Prisma db push; plan migration-only deploys after baseline reconciliation.
6. Check Render database expiration and plan renewal/migration before the free database expiry.
7. Verify Discord bot scopes and role hierarchy, rotate any exposed secrets, and inspect webhook health.
8. Monitor deploy logs and /api/health after each release.

A successful build and Render live status do not replace manual end-to-end role testing.
