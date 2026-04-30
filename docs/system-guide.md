# AML Reporting System Guide

This repository contains a Next.js Anti-Money Laundering (AML) monitoring and reporting application for banking, compliance, and regulatory workflows. The system is designed to help users detect suspicious transactions, generate alerts, investigate cases, and prepare Suspicious Transaction Report (STR) submissions while maintaining an audit trail of activity.

## Acronyms And Abbreviations

- AML: Anti-Money Laundering.
- API: Application Programming Interface.
- App Router: Next.js routing system for the `app/` directory.
- JWT: JSON Web Token.
- KPI: Key Performance Indicator.
- SLA: Service Level Agreement.
- STR: Suspicious Transaction Report.
- UI: User Interface.
- MongoDB: MongoDB document database.

## What The System Does

At a high level, the system does four things:

1. Ingests and displays transactions.
2. Evaluates transactions against AML rules to produce alerts and risk scores.
3. Lets compliance users investigate alerts, manage cases, and prepare STR submissions.
4. Provides dashboards and analytics for operational monitoring and oversight.

The application is implemented as a Next.js app using the App Router, server route handlers under `app/api`, Prisma for the data model, and a client-side authentication layer built around JSON Web Tokens (JWTs) stored in local storage.

## Architecture Overview

The root application shell is defined in `app/layout.tsx`, which sets the page metadata and wraps the app in the shared provider tree. The authenticated navigation and page framing live in `app/AppShell.tsx`, which redirects unauthenticated users to `/login` and renders the sidebar, breadcrumbs, and signed-in user panel.

The dashboard and page surfaces are split between server route handlers and client UI components:

- API routes under `app/api/**/route.ts` expose the data used by the UI.
- Client pages and components consume those APIs through `AML_frontend/services/api.ts`.
- Domain logic such as rule evaluation and session verification lives in `lib/`.
- The canonical schema is defined in `prisma/schema.prisma` and uses MongoDB as the backing datastore.

## User Roles And Navigation

The app recognizes three main user roles in the UI:

- Bank user: focuses on transactions, alerts, and institutional monitoring.
- Compliance officer: investigates alerts, manages cases, and drafts STR submissions.
- Administrator / regulator: handles oversight, configuration, and reporting views.

The sidebar in `app/AppShell.tsx` reflects these areas through three navigation groups:

- Monitoring: dashboard, alerts, transactions.
- Investigation: cases, STR submissions.
- Administration: admin panel, regulatory views.

The dashboard itself also contains a role selector in `app/page.tsx`. That selector is currently a UI-level switch used to demonstrate how the KPI tiles change by role; it is not the same thing as the authenticated server-side role.

## Business Operations Model

The business operation of the system is the end-to-end compliance and monitoring process that turns raw transaction activity into operational decisions, investigations, and regulatory outputs.

In practice, the system supports four operating groups:

- Bank operations: monitor customer transactions, watch for unusual behavior, and respond to alerts tied to their institution.
- Compliance operations: review suspicious activity, investigate cases, manage deadlines, and decide whether a case should be escalated.
- Regulatory oversight: review submitted STRs, assess institution risk, and monitor compliance performance across the network.
- System administration: maintain users, roles, rules, exports, and overall platform health.

The business flow usually moves through the following cycle:

1. Transaction activity enters the system through the transaction layer.
2. The rule engine scores the activity and generates alerts when risk thresholds or patterns are triggered.
3. Compliance users review the alert queue, prioritize high-risk items, and group related alerts into cases.
4. Investigators gather evidence, add notes, track discussions, and monitor SLA obligations.
5. If suspicion is confirmed, the case is escalated into an STR submission.
6. Regulatory users review the report and the institution’s history, while admins keep the rule set and user access current.

This model is important because the application is not only a screen for viewing data. It is a workflow engine for operational compliance. The dashboard, alert queue, case screen, and STR screen each support one stage of that workflow.

### Daily Operating Pattern

A typical business day in the system looks like this:

- Morning review: teams open the dashboard to see current alert volume, overdue cases, submitted STRs, and critical risk items.
- Queue triage: compliance officers open the alert management view and sort alerts by severity, lifecycle stage, institution, amount, and date.
- Investigation work: investigators open a case, inspect linked alerts, review the narrative, and record findings in the discussion and audit trail.
- Escalation handling: if a case meets the threshold for reporting, it is escalated to STR preparation and submission.
- Oversight and reporting: supervisors and regulators check trends, heatmaps, institution risk, and exports to understand whether controls are working.
- End-of-day control: teams confirm that overdue items, pending reviews, and unresolved alerts are visible and assigned.

### Operational Controls

The system supports several controls that matter in a business setting:

- Access control: users see only the parts of the workflow that match their role and institution context.
- Auditability: important changes can be recorded in activity logs, case audit entries, and discussions.
- Timeliness: SLA fields and overdue flags make aging items visible before they become process failures.
- Traceability: alerts are linked to transactions, cases, and STRs so an investigator can move from symptom to source.
- Reporting continuity: exports and submission records provide a repeatable record of what was reviewed and filed.

### Business Outputs

The main outputs of the business process are:

- A prioritized alert queue for operational review.
- A managed case file with investigator notes and supporting evidence.
- An STR submission package with narrative, rules triggered, and supporting documents.
- A set of dashboards and analytics for management and oversight.
- An audit trail that shows how and when key decisions were made.

### How The Roles Connect

- The bank identifies unusual activity first and uses the system to monitor its own transaction flow.
- Compliance officers convert alerts into casework and reportable narratives.
- Regulators use the resulting reports and analytics to supervise institutions and spot systemic weaknesses.
- Administrators keep the rule set, access model, and reporting environment operational.

That separation matters because the same data is being viewed through different business lenses. A bank user cares about transaction behavior, a compliance officer cares about investigation readiness, a regulator cares about filing quality and institutional patterns, and an admin cares about the platform itself.

## Authentication And Session Flow

Authentication begins at `app/api/auth/login/route.ts`:

1. The client submits credentials that are validated against `userLoginSchema`.
2. The login route looks up the user in Prisma and checks the password with `bcryptjs`.
3. On success, it updates `lastLogin` and creates a JWT with `createAuthToken`.
4. The token payload includes user identity, role, and institution context.
5. The response returns both the token and a normalized user object.

On the client, `lib/auth-client.ts` stores the token in local storage under `authToken`, decodes it, and attaches it to requests through `authFetch`. `lib/auth-context.tsx` keeps the auth state in React context so the rest of the UI can read the current user and call `login()` / `logout()`.

On the server, `lib/session.ts` extracts the token from the `Authorization` header or the `x-auth-token` header, verifies it with `verifyAuthToken`, and exposes two helpers:

- `requireAuth()` for authenticated routes.
- `requireRole()` for role-gated behavior.

This means client-side auth state and server-side authorization are separate layers. The client controls navigation and UI state, while API routes enforce access control.

## Core Business Objects

The Prisma schema models the main AML entities:

- `User`: signed-in person, including role, institution, activity, rule ownership, and exports.
- `Institution`: bank or organization being monitored.
- `Transaction`: financial activity that may trigger rules and alerts.
- `Alert`: a suspicious event generated from detection logic.
- `Case`: an investigation container that groups alerts and tracks SLA status.
- `AMLRule`: rule configuration used by the detection engine.
- `STRSubmission`: a suspicious transaction report prepared for review or filing.
- `ActivityLog`: audit trail for major actions.
- `Notification`: user notifications.
- `ReportExport`: exported reports and related metadata.

The schema also defines the key enums that shape the user interface (UI) and API behavior:

- `UserRole`
- `AlertSeverity`
- `LifecycleStage`
- `RuleType`
- `STRStatus`
- `TransactionType`
- `TransactionStatus`
- `ExportFormat`

## Detection And Risk Scoring

The transaction screening logic lives in `lib/amlRuleEngine.ts`. The main entry point is `evaluateTransactionAgainstRules()`, which loads active rules and evaluates each one against the incoming transaction.

The application is now rule-based only. The former edge-versus-core detection split has been removed from the user-facing and API surfaces, so alerts, dashboards, and reports should be read as rule-based detections.

The evaluation flow is:

1. Compute a base risk score from the transaction amount, transaction type, and country.
2. Evaluate each active AML rule.
3. Keep the highest-scoring triggered rule.
4. Return a flag result with the winning rule, severity, and final risk score.

The engine currently supports three rule types:

- `THRESHOLD`: flags transactions above a configured amount.
- `PATTERN`: checks for heuristics such as structuring, high-risk countries, dormant account reactivation, and circular transaction hints.
- `VELOCITY`: checks for fast-moving activity, currently using simplified metadata-driven heuristics.

The code intentionally caps the score and includes simplified logic in places where production systems would usually consult historical transaction context. The guide should treat those areas as current implementation behavior, not final AML policy.

## Dashboard And Operational Views

The primary dashboard is implemented in `app/page.tsx`. It uses the frontend API client to load:

- KPI summary data.
- Top alerts.
- Real-time indicators.
- Heatmap and trend data.
- Alert lifecycle information.
- Institution risk data.

The dashboard also polls for live updates every 10 seconds and highlights critical alerts with a banner when present.

This page is a good example of the app’s presentation pattern:

- UI components come from `components/`.
- Data is pulled through `AML_frontend/services/api.ts`.
- Formatting helpers come from `lib/localization.ts`.
- Severity and alert state are rendered directly in the view layer.

## Investigation Workflow

The investigation flow is centered on alerts, cases, and STR submissions.

Alerts represent suspicious activity that has been flagged by the rule engine or analytics layer. A case groups related alerts and tracks the investigation lifecycle through stages such as new, under review, escalated, STR submitted, and closed.

The case schema also carries:

- A compliance deadline.
- Remaining SLA hours.
- An overdue flag.
- An investigator assignment.
- Discussion and audit sub-records.

STR submissions capture the narrative, supporting documents, rules triggered, and linked case or transaction context. The schema is designed so that a case can produce one or more STR records as an investigation matures.

## API Surface

The application exposes route handlers in `app/api` for the main functional areas:

- `auth`: login, signup, debugging, and test routes.
- `transactions`: transaction retrieval and simulator endpoints.
- `alerts`: alert lists and top-alert views.
- `cases`: case management, discussions, and escalation.
- `str`: STR submission handling.
- `dashboard`: role-specific dashboard data.
- `kpi`: KPI summary data.
- `analytics`: trends, heatmaps, institution risk, lifecycle metrics, and compliance metrics.
- `reports`: report export endpoints.
- `indicators`: real-time indicator feeds.

The transaction route is representative of the API style: it calls `requireAuth()`, applies role-sensitive filtering, supports query parameters such as `limit`, `offset`, `status`, and `search`, and returns JSON results with pagination metadata.

Most routes follow the same general conventions:

- Authentication is enforced at the route level.
- Role-sensitive filtering happens before the database query.
- Responses are JSON.
- Validation is done before any write operation.

## Frontend Data Access

The shared browser API client in `AML_frontend/services/api.ts` centralizes the data contract used by the UI. It exposes typed response helpers such as KPI, alerts, heatmap, trend, lifecycle, and institution-risk responses.

This is important because the guide should explain that the UI is not making ad hoc fetch calls everywhere. Instead, the page layer depends on a consistent service wrapper, which makes the dashboard easier to reason about and keeps response shapes predictable.

## Authentication Boundaries In Practice

The application uses a layered auth model:

- The login route creates the session token.
- The client stores and reuses the token.
- The `AppShell` keeps public and private routes separated.
- `requireAuth()` and `requireRole()` protect server endpoints.

That separation is the main reason the guide should explain both the browser side and the server side. Understanding only one of them gives an incomplete picture of how access control works here.

## Known Simplifications And Gaps

The current codebase includes several deliberately simplified or partially stubbed areas that should be called out in the guide:

- Pattern and velocity rules use heuristic/demo logic in places where production systems usually need historical context.
- The dashboard role selector changes the UI locally and is not the same as server-side authorization.
- Some schema models exist before every corresponding UI or route is fully fleshed out.
- The app is structured to support a deeper compliance workflow than the current default README explains.

## How To Run The Project

Use the standard Next.js scripts defined in `package.json`:

- `pnpm dev` to start the local development server.
- `pnpm build` to produce a production build.
- `pnpm start` to run the built app.
- `pnpm lint` to run code quality checks.

## Suggested Reading Order

If someone is onboarding to the codebase, the best reading order is:

1. `app/layout.tsx` and `app/AppShell.tsx` to understand the application shell.
2. `app/api/auth/login/route.ts`, `lib/auth-client.ts`, `lib/auth-context.tsx`, and `lib/session.ts` to understand auth.
3. `prisma/schema.prisma` to understand the domain model.
4. `lib/amlRuleEngine.ts` to understand detection behavior.
5. `app/page.tsx` and `AML_frontend/services/api.ts` to understand the dashboard and frontend data flow.

## Summary

This system is a role-aware Anti-Money Laundering (AML) monitoring platform built around a transaction screening pipeline, investigation workflow, Suspicious Transaction Report (STR) reporting, and a shared authenticated shell. The codebase is already organized around those concepts; this guide simply explains them in a way that matches the implementation.