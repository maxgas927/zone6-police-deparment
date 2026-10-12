# Z6PD V9.9 final release plan
Status: IN PROGRESS — selected V9 improvements have been shipped to main. Full V9.9 acceptance and release verification are NOT complete. Google Sheets (V9.5) is excluded at the owner’s request.

## V9.3 Personnel Command
Promotion/demotion requests with review and immutable audit history; division transfers; secure supervisor notes and attachments; officer IDs; personnel history. Enforce server-side authorization and access logging.

## V9.4 Workflow Automation
Unified review queue; report return/resubmission; LOA and recruitment approvals; Discord event notifications with retries and audit logs.

## V9.5 Google Sheets Roster — DEFERRED
Existing sheet connection after user authorization; column mapping; dry-run previews; duplicate/conflict detection; incremental sync and rollback records. Never overwrite records silently.

## V9.6 Patrol Operations
Live duty board; shifts and patrol sessions; staffing summaries; supervisor tools; aggregate patrol analytics.

## V9.7 Security and Reliability
Authentication/permission regression tests; role-sync verification; migration rehearsal; backups; audit trails; error monitoring and health checks.

## V9.8 Mobile and UX
Responsive tables/forms, single global navigation, accessible menus, notification center, PWA install experience, and consistent dashboard settings.

## V9.9 Release Validation
Build/typecheck, automated tests, Discord login and authorization scenarios, database backup and migration review, mobile smoke tests, staging deployment, one approved merge to main, production verification, and rollback readiness.

## Deployment gates
The owner has chosen incremental direct-to-main production patches. Do not mark V9.9 complete until all included features are implemented and validated in production. Keep live data safe, verify each Render deployment, and never claim features are completed based on this plan.
