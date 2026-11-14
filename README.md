# Workflow Failure Test Builder

**Test the failure. Not just the happy path.**

An original, free, offline and MIT-licensed test-design tool for CRM journeys, webhook consumers, APIs and AI-assisted workflows. Pick failure patterns and export a deterministic structured plan, readable Markdown, and draft Gherkin .feature acceptance scenarios. Nothing is submitted to an external server.

**Live demo:** https://esheenj.github.io/workflow-failure-test-builder/

## Local quick start

Requires Node.js 20+. No npm packages are required.

    git clone https://github.com/esheenj/workflow-failure-test-builder.git
    cd workflow-failure-test-builder
    npm test
    npm run demo
    node src/cli.mjs examples/crm-sample.json markdown
    node src/cli.mjs examples/crm-sample.json gherkin
    npm run build
    python3 -m http.server 8000 --bind 127.0.0.1 --directory dist

Then open http://127.0.0.1:8000 and load the fictional CRM-to-invoice sample. Generate the test plan and download either .feature, Markdown, or JSON. Users can edit a generic workflow name and outcome, choose which failure cases to include, and adjust hypothetical retry and retention assumptions.

## Ten synthetic failure patterns

1. Repeated delivery after acceptance
2. Two workers receiving concurrent duplicates
3. Timeout after a business operation commits
4. Rate limiting and 429 Retry-After handling
5. Persistent server errors and retry exhaustion
6. Breaking payload schema or field changes
7. Out-of-order updates and stale state
8. Crash after processing and before acknowledgement
9. Invalid sender identity or forged notification
10. Missing evidence in an AI-assisted decision

Each generated case has unique fictional identifiers, test setup and injection steps, expected observable checks, and an automation hint. The generator itself has automated tests. The generated tests have NOT been run on your API, customer account, integration, CRM or production system.

## JSON input contract

The sample in examples/crm-sample.json is the canonical example. The object uses:
- project: optional printable string at most 80 characters
- outcome: optional printable string at most 140 characters
- flowType: one of crm, webhook, api, agent
- selected: unique array containing 1 to 10 recognized scenario IDs
- policy.maxAttempts: integer 1 to 10 (default 3)
- policy.backoffMs: integer 100 to 60000 (default 1000)
- policy.retentionHours: integer 1 to 720 (default 24)

Outputs are deterministic for identical inputs. The CLI enforces a 1 MiB input limit. Unrecognized scenario IDs, duplicate choices, invalid flow types, control characters and out-of-bounds policy values are rejected.

## Interpretation and limits

**The exported .feature text is a draft, not a runnable automated suite.** Gherkin step definitions, fixtures, mocks, provider-specific behavior, integration adapters, endpoint access and test execution all remain separate implementation work. The generated cases do not certify exactly-once delivery, security, rate-limit compliance, uptime or recovery. The fictional policy assumptions are not verified environment settings. For a real deployment, independently examine the provider contract, concurrency, state storage, identity and data handling.

Browser code has no network calls, authentication, tracking, storage, third-party packages or live execution. It uses strict Content Security Policy and DOM text nodes. Inputs are processed only in the current browser tab unless the user exports them. Do not share credentials, private customer payloads or internal endpoints through public issues.

## Engineering pilot

The self-service generator is free. A small integration-testing pilot can be discussed through a user-initiated email to the publicly listed Sigma Code business contact:

[Email Sigma Code about a workflow test pilot](mailto:info@sigmacode.co.za?subject=Workflow%20failure%20test%20pilot%20enquiry)

or through the [public GitHub pilot enquiry form](https://github.com/esheenj/workflow-failure-test-builder/issues/new?template=pilot.yml), without posting confidential data. An enquiry is not a booking, customer contract, payment or confirmed delivery. Scope, pricing and any private evidence-sharing process must be agreed separately. No revenue or completed customer pilots are claimed.

This tool complements [Integration Reliability Assessment](https://esheenj.github.io/integration-reliability-assessment/), [Webhook Idempotency Lab](https://esheenj.github.io/webhook-idempotency-lab/) and [Agent Tool Schema Diff Lab](https://esheenj.github.io/agent-tool-schema-diff-lab/).

## Project structure and contributions

- src/plan.mjs — deterministic failure case catalog and export logic
- src/cli.mjs — local JSON command-line interface
- site/ — offline user-facing playground
- tests/ — validation, adversarial and export tests
- scripts/build.mjs — dependency-free static staging
- .github/workflows/ci-pages.yml — independent tests and Pages release

MIT licensed. Contributions should include synthetic examples and test evidence. Optional [public funding details](https://esheenj.github.io/compound-intelligence-starter/support.html) do not imply native GitHub Sponsors or fiat checkout is active. Keep private SIGMA trading, Cortex and Commander control-plane information out of this public project.

© 2026 Esheen Labs.
