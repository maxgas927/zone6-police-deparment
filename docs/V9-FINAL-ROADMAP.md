# Z6PD V9.9 final release plan
Status: PLANNED — not implemented. Production remains on the current V9.2.3 feature baseline plus navigation hotfixes.

## V9.3 Personnel Command
Promotion/demotion requests with review and immutable audit history; division transfers; secure supervisor notes and attachments; officer IDs; personnel history. Enforce server-side authorization and access logging.

## V9.4 Workflow Automation
Unified review queue; report return/resubmission; LOA and recruitment approvals; Discord event notifications with retries and audit logs.

## V9.5 Google Sheets Roster
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
Do not merge the full V9.9 release until the above work is implemented, tested, and approved. Keep live data safe; never claim features are completed based on this plan.
