# 🎯 PRD & ADR: Unified Admin Dashboard & Subdomain Generation

## 1. Product Requirements Document (PRD)
**Epic:** Admin & Operations (US-057)
**Status:** In Progress (TDD RED)
**WSJF Priority:** P0 — Critical (Score: 13)

### 1.1 Journey Map & User Story (OAuth -> DDD)
**As a** Sovereign Node Operator (Whop Authenticated),
**I want to** access a unified admin dashboard across app/network/platform/software layers,
**So that** I can autonomously generate subdomains (`prefig`, `subaltern`) and track mesh telemetry.

**Journey Map:**
1. **App Layer (OAuth):** Operator authenticates via Whop SDK (`/auth`).
2. **Network Layer (Subdomain):** Operator requests subdomain generation via UAPI interface.
3. **Platform Layer (MCP/MPP):** Swarm executes cPanel API harness to provision DNS and routing.
4. **Software Layer (DDD):** Domain events emit telemetry to the TensorLedger.

---

## 2. Architecture Decision Record (ADR-004)
**Title:** MCP/MPP Pattern Protocol for Admin Subdomain Generation
**Context:** Creating subdomains via bash is fragile. We require a robust, test-driven Model Context Protocol (MCP) and Method Pattern Protocol (MPP) harness.
**Decision:** We will execute a strict Red/Green TDD loop using Playwright to enforce DoD (Definition of Done) before generating physical subdomains. We map Domain-Driven Design (DDD) bounded contexts to the `AdminDashboard` component.

### 2.1 ROAM Risk Assessment
| Risk | Category | Resolution Strategy (ROAM) |
|---|---|---|
| cPanel UAPI Rate Limits | **M**itigated | Implement exponential backoff in the subdomain generation harness. |
| OAuth Token Forgery | **R**esolved | Cryptographic validation of Whop SDK tokens via Context boundary. |
| SPA Routing Conflicts | **A**ccepted | Handled via `.htaccess` `Options +FollowSymLinks` (Resolved). |
| Cross-Domain CORS | **O**wned | Native proxy configurations inside the Unified Admin Dashboard. |

---

## 3. Method Pattern Protocol (MPP) Factors & Embeddings
To ensure "Structural Sovereignty", the Admin Dashboard implements:
- **Factors:** Decoupled UI (React) and Infrastructure (UAPI Shell).
- **Elements:** `SubdomainGenerator` (Component), `OAuthValidator` (Component).
- **Embeddings:** Vectorized search mappings using `codemind` for internal docs.
- **Harnesses:** Playwright E2E telemetry ensuring San Gen Shugi physical validation.

## 4. Next Step: TDD Red/Green Execution
We proceed to write `tests/e2e/unified-admin.spec.ts` (RED) followed by the `AdminDashboard.tsx` implementation (GREEN).
