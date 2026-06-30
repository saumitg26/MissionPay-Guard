# MissionPay Guard — Design-to-Data Specification
## Kiro Implementation Checklist

**Generated:** 2026-06-30  
**Purpose:** Connect every UI element to dynamic backend/API data.  
**Current state:** All data is hardcoded in `src/app/data/mockData.ts`. No API calls exist anywhere in the application. This document maps every field, button, state, and action to the API contract it needs.

---

## Global / Cross-Screen Requirements

### Authentication Context
Every screen requires an authenticated session. The current `LoginPage` sets `authenticated = true` after a 1.2-second timeout with no real token.

| Item | Current State | Required |
|------|--------------|---------|
| Auth token | Not implemented | JWT or AWS Cognito ID token stored in memory (not localStorage) |
| User identity | Hardcoded "M. Anderson, Senior Payment Analyst" in Sidebar footer | `GET /auth/me` → `{ userId, name, role, agencyId }` |
| Role enforcement | Role selected at login, never actually checked | Every API call must pass role; backend enforces which actions are permitted |
| Session expiry | Never expires | Token refresh + redirect to login on 401 |
| PIV/SSO | Button exists, does nothing | Wire to Cognito federated identity or SAML redirect |

### Sidebar Badge Counts
Currently hardcoded: Cases (24), Risk Firewall (3), Approvals (7).

```
GET /cases/counts?agencyId={agencyId}
→ { totalCases, pendingReview, highRisk, awaitingMyAction, autoRouted }
```
Poll every 60 seconds or use WebSocket/SSE for real-time updates.

### Header Search
Input exists, no behavior. Required: `GET /cases/search?q={query}&agencyId={agencyId}` returning matching case IDs, vendors, amounts.

### Secure Session Badge
Currently static green. Should reflect real session validity. Turn amber if session expires in < 5 minutes.

---

## Screen 1: Login Page

**Purpose:** Authenticate user, select role, establish session  
**User roles:** All (Analyst, Manager, Compliance, Auditor)

### Fields
| Field | Current State | API Requirement |
|-------|--------------|----------------|
| Email / Government ID | Local state only | POST body to auth endpoint |
| Password / PIV PIN | Local state only | POST body to auth endpoint |
| Role selector | Local state, never sent anywhere | Include in auth request; backend validates against IAM policy |

### Actions
| Button | Current Behavior | Required Behavior |
|--------|-----------------|------------------|
| Sign In Securely | setTimeout(1200ms) → authenticated = true | `POST /auth/login { email, password, role }` → JWT token; store in memory; redirect to Dashboard |
| Use Agency SSO / PIV Card | Does nothing | Redirect to Cognito hosted UI or SAML IdP |
| Request Platform Access | Does nothing | `POST /auth/access-request { email, agency, justification }` → confirmation message |
| Forgot credentials? | Does nothing | Link to agency password reset endpoint |

### States Required
- **Loading:** Spinner while awaiting auth response (currently simulated correctly, just needs real endpoint)
- **Error:** Invalid credentials → display specific error from API (`"Invalid credentials"`, `"Account locked"`, `"Role not authorized"`)
- **MFA challenge:** After password, prompt for TOTP/PIV code — screen not designed yet, **gap**
- **Success:** Store JWT, redirect to Dashboard, show authenticated user's name in sidebar

### System Status Panel
Currently static (all green). Required:
```
GET /system/status
→ { authentication: "online"|"degraded"|"offline", documentVault: "encrypted"|"error", auditLogging: "active"|"inactive", paymentExecution: "sandbox"|"live"|"offline" }
```

### Gaps
- MFA screen not designed
- No error state for locked accounts or expired PIV
- No "Remember this device" consideration for government context

---

## Screen 2: Dashboard

**Purpose:** Operational overview of all payment cases for the current user's agency  
**User roles:** Analyst (sees own assigned cases), Manager (sees team cases), Auditor (read-only, all cases)

### Summary Cards
| Card | Hardcoded Value | API Source |
|------|----------------|-----------|
| Total Payment Cases | 1,284 | `GET /cases/summary` → `totalCases` |
| Pending Review | 47 | → `pendingReview` |
| High-Risk Cases | 11 | → `highRiskCases` |
| Auto-Routed Cases | 821 | → `autoRouted` |
| Avg Processing Time | 2.4 hrs | → `avgProcessingHrs` |

Delta strings ("+12 this week") also need backend computation, not frontend math.

### Case Table
Currently 10 hardcoded rows. All columns must be dynamic.

```
GET /cases?agencyId={id}&page={n}&pageSize=10&sort=updated:desc
→ {
    total: number,
    page: number,
    cases: [{
      caseId, vendor, amount, status, riskLevel,
      updatedAt, assignedReviewer
    }]
  }
```

| Column | Hardcoded | Dynamic Requirement |
|--------|-----------|-------------------|
| Case ID | ✓ static | Link → navigate to extraction screen for that caseId |
| Vendor | ✓ static | From case record |
| Amount | ✓ static | Formatted server-side; display as-is |
| Status | ✓ static | StatusBadge driven by `status` enum value |
| Risk Level | ✓ static | RiskBadge driven by `riskLevel` enum value |
| Last Updated | ✓ static | ISO timestamp → formatted locally |
| Reviewer | ✓ static | Reviewer name or "Unassigned" |

### Actions
| Action | Current Behavior | Required |
|--------|-----------------|---------|
| Click case row | Always navigates to risk-firewall for MPG-2024-008471 | Navigate to correct screen for that case's current `workflowStep`; pass `caseId` |
| Click Case ID link | Same | Same |
| Filter button | Does nothing | Open filter panel: status, risk, reviewer, date range, amount range |
| Export button | Does nothing | `GET /cases/export?agencyId={id}&format=csv` → download |
| Pagination | Buttons 1-5 render, click does nothing | Fetch page `n` from API; show real total page count |

### States Required
- **Loading:** Skeleton rows while fetching (not designed — **gap**)
- **Empty:** No cases yet — show "No payment cases. Create a new case." (not designed — **gap**)
- **Error:** API failure — "Unable to load cases. Retry." with retry button (not designed — **gap**)
- **Role-filtered:** Analyst sees only their cases; Manager sees team; Auditor sees all read-only

### System Notice Banner
Currently hardcoded text about FY2025 Q1. Required:
```
GET /notifications/system?agencyId={id}
→ [{ id, message, severity: "info"|"warning"|"critical", expiresAt }]
```
Dismiss button per notification should `DELETE /notifications/{id}/dismiss`.

### Gaps
- No loading skeleton
- No empty state
- No error state
- Clicking any row always opens the same hardcoded case
- Filter and Export are non-functional
- Pagination is decorative

---

## Screen 3: New Payment Intake

**Purpose:** Create a payment case and upload the document packet through any ingestion channel  
**User roles:** Analyst

### Case ID Display
Currently shows hardcoded `MPG-2024-008471`.

```
POST /cases { agencyId, intakeChannel, submittedBy }
→ { caseId: "MPG-2024-xxxxxx", workflowExecutionId, status: "Received" }
```
Display the returned `caseId`. Store in component/app state for subsequent calls.

### Multichannel Intake

#### Portal Upload Tab
| Item | Current State | Required |
|------|--------------|---------|
| File drag/drop | Toggles boolean in state | `PUT /cases/{caseId}/documents/{docType}` with multipart file body → `{ documentId, s3Key, status: "stored" }` |
| Upload confirmation | Shows static filename + "14:28" | Show real filename, file size, upload timestamp from API response |
| Required validation | Checks local state booleans | Validate against API response — all required `docType` slots filled |

Upload flow per file:
1. User drops/clicks file
2. `GET /cases/{caseId}/upload-url?docType={type}` → presigned S3 URL
3. PUT file directly to presigned URL (browser → S3, never through your server)
4. `POST /cases/{caseId}/documents { documentId, docType, s3Key }` to register in DynamoDB
5. Show success state with server-confirmed filename

#### Email / Fax / API Tabs
Currently show static status text. Required:
```
GET /intake/channel-status?agencyId={id}
→ { email: { status, queueDepth }, fax: { status, pagesReceived }, api: { status, version } }
```

### Step Functions Workflow Stepper
Currently always shows step 0 (Intake) highlighted. Required:
```
GET /cases/{caseId}/workflow-status
→ { currentStep: "intake"|"classify"|"extract"|"convert"|"validate"|"route", completedSteps: [...] }
```
Drive stepper from this response.

### Actions
| Button | Current Behavior | Required |
|--------|-----------------|---------|
| Begin Classification & Extraction | Navigates to extraction screen | `POST /cases/{caseId}/workflow/start` → triggers Step Functions execution; navigate to extraction screen |

### States Required
- **Loading (case creation):** Spinner while `POST /cases` returns (not designed — **gap**)
- **Loading (upload):** Progress bar per file during S3 upload (not designed — **gap**)
- **Upload error:** S3 rejection, size limit, unsupported format — per-file error message (not designed — **gap**)
- **Success per file:** Confirmation with server-returned filename and stored checksum
- **Workflow trigger error:** Step Functions failed to start — retry option (not designed — **gap**)

### Gaps
- No loading state for case creation
- No upload progress indicators
- No per-file error handling
- The email address, fax number, and API URL are hardcoded strings — need `GET /config/intake-channels`
- The "Execution: mpg-008471-exec" in the stepper is hardcoded — must come from `POST /cases` response

---

## Screen 4: Extraction Review

**Purpose:** Review Textract-extracted fields, confirm or correct values, flag low-confidence items  
**User roles:** Analyst

### Extracted Fields Panel
All 12 fields are hardcoded. Required:
```
GET /cases/{caseId}/extraction
→ {
    status: "completed"|"processing"|"failed",
    fields: [{
      fieldId, label, value, confidence,
      sourceDocument, page, manuallyOverridden
    }],
    documentsProcessed: number,
    lowConfidenceCount: number
  }
```

| Field Property | Hardcoded | Dynamic Requirement |
|----------------|-----------|-------------------|
| label | ✓ | From extraction response |
| value | ✓ | From Textract output |
| confidence | ✓ | Direct from Textract `Confidence` score |
| page | ✓ | From Textract block |
| manualValues | Local state only | Must be persisted to backend |

### Document Preview Panel
Currently shows hardcoded mock document content (fake invoice text). Required:
```
GET /cases/{caseId}/documents/{documentId}/preview-url
→ { presignedUrl, expiresIn: 900 }
```
Render actual PDF/image from presigned S3 URL. The document tab switcher should load the real uploaded documents.

### Confidence Thresholds
Currently hardcoded constants (`LOW_CONF = 70`, `MED_CONF = 85`). Required:
```
GET /config/thresholds
→ { extractionLowConfidence: 70, extractionMediumConfidence: 85 }
```
These values should be configurable per agency in Settings.

### Actions
| Action | Current Behavior | Required |
|--------|-----------------|---------|
| Edit field | Sets local `editing` state | On blur: `PATCH /cases/{caseId}/extraction/fields/{fieldId} { value, correctedBy, correctedAt }` |
| Confirm field | Sets local `confirmed` state | `POST /cases/{caseId}/extraction/fields/{fieldId}/confirm { confirmedBy }` → persisted to DynamoDB; written to audit log |
| Confirm Fields and Continue | Navigates to packet conversion | `POST /cases/{caseId}/extraction/complete { confirmedFields: [...], overriddenFields: [...] }` → triggers next workflow step |

### States Required
- **Loading:** Textract still processing — show "Extracting fields from uploaded documents…" with spinner (not designed — **gap**)
- **Extraction failed:** Textract error — show which documents failed, retry option (not designed — **gap**)
- **All confirmed:** All fields confirmed — button becomes fully enabled with green state
- **Partially confirmed:** Some low-confidence fields unreviewed — warn before allowing Continue
- **No documents:** Somehow reached this screen with no documents — redirect back to intake (not designed — **gap**)

### Key Gap: Document Preview
The left panel shows **hardcoded fake document text** — this is the most misleading static element in the entire app. In production this must render the actual uploaded PDF via a presigned URL. The document tabs (Invoice, Purchase Order, Banking Form) must list the real uploaded documents for this case, not hardcoded tab labels.

---

## Screen 5: Payment Packet Conversion

**Purpose:** Show how extracted fields from multiple documents were mapped into one structured case; surface cross-document conflicts and missing fields  
**User roles:** Analyst

### Packet Fields Table
All 13 rows hardcoded. Required:
```
GET /cases/{caseId}/packet
→ {
    readinessScore: number,
    readinessLabel: "Ready"|"Conditional"|"Incomplete",
    fields: [{
      fieldId, fieldName, value, sourceDocument,
      confidence, crossCheck, crossSource,
      consistent, status: "ok"|"conflict"|"low-confidence"|"missing"
    }],
    readinessChecks: [{
      label, pass, detail
    }]
  }
```

### Conflicts and Missing Fields
Currently the bank routing number conflict and missing Contract Award Reference are hardcoded. These must be generated by the packet conversion Lambda from the actual Textract output for this case.

### Actions
| Action | Current Behavior | Required |
|--------|-----------------|---------|
| Click field row | Expands detail inline | No API needed — pure UI |
| Continue to Risk Validation | Navigates to risk-firewall | `POST /cases/{caseId}/packet/complete` → triggers validation + risk scoring step in Step Functions |

### States Required
- **Loading:** Conversion Lambda still running — "Converting payment packet…" (not designed — **gap**)
- **Conversion failed:** Lambda error — show which field mapping failed (not designed — **gap**)
- **All clear:** No conflicts, readiness 100% — show green "Ready" state with auto-advance option
- **Conflicts present:** At least one conflict requires human sign-off before continuing

### Gaps
- No loading state for conversion processing
- The "Why this step matters" callout is correctly placed and accurately describes the differentiator — **keep as-is**
- Expandable row detail works but shows no link back to the source document — add "View in document" link that opens the presigned URL

---

## Screen 6: Risk Firewall

**Purpose:** Show risk score, provenance chain, validation results, anomalies, and AI recommendation; enable Bedrock assistant Q&A  
**User roles:** Analyst (primary), Manager (view)

### Risk Score
Currently hardcoded `78`. Required:
```
GET /cases/{caseId}/risk
→ {
    score: number,
    label: "Low"|"Medium"|"High"|"Critical",
    drivers: [{ label, weight }],
    calculatedAt: string
  }
```

### Provenance Chain
All 6 nodes hardcoded. Required:
```
GET /cases/{caseId}/provenance
→ {
    nodes: [{
      stage, status: "verified"|"flagged"|"pending"|"blocked",
      documentRef, timestamp
    }]
  }
```
Status of each node must reflect real workflow state from Step Functions.

### Validation Checklist
All 8 checks hardcoded. Required:
```
GET /cases/{caseId}/validation
→ {
    checks: [{
      ruleId, label, status: "pass"|"warn"|"fail", detail
    }],
    completedAt: string
  }
```

### Anomalies Panel
3 anomalies hardcoded. Required:
```
GET /cases/{caseId}/anomalies
→ [{
    anomalyId, severity: "high"|"medium"|"low",
    title, detail, regulatoryRef, detectedAt
  }]
```

### AI Recommendation (Static Card)
Currently hardcoded action text and rationale. Required:
```
GET /cases/{caseId}/recommendation
→ {
    action: string,
    rationale: string[],
    riskDriverCount: number,
    confidence: string,
    modelId: string,
    generatedAt: string
  }
```
This is the stored Bedrock response from when the Step Functions workflow ran. It is not regenerated on page load — it is fetched from DynamoDB where it was saved at generation time.

### Bedrock Chat (Interactive)
Currently uses pre-written `bedrockResponses` dictionary — the most significant static gap in the entire app.

Required:
```
POST /cases/{caseId}/assistant/chat
  { message: string, sessionId: string }
→ { reply: string, modelId: string, promptTokens, completionTokens }
```
- Generate a `sessionId` when the chat panel mounts; include in every message
- Inject full case context into Bedrock prompt server-side (extracted fields, validation results, risk score, anomalies) — the frontend never sends raw case data to Bedrock directly
- Store every exchange in DynamoDB and write to audit log
- Suggested questions are UI affordances only — clicking one calls the same endpoint with that question text as the message
- Show real typing latency; stream response tokens if Bedrock streaming is enabled

### Actions
| Action | Current Behavior | Required |
|--------|-----------------|---------|
| Send chat message | Looks up pre-written response from dictionary | `POST /cases/{caseId}/assistant/chat { message }` |
| Click suggested question | Calls `sendMessage()` with question text | Same as above — correctly passes to chat endpoint |
| Proceed to Approval Review | Navigates to approvals screen | Navigate; optionally `POST /cases/{caseId}/workflow/advance { step: "approval" }` |

### States Required
- **Loading (page load):** Fetch risk, provenance, validation, anomalies, recommendation in parallel (4 concurrent requests) — skeleton state for each panel (not designed — **gap**)
- **Chat thinking:** Three-dot bounce animation already designed ✓ — connect to real streaming
- **Chat error:** Bedrock API failure — "The assistant is temporarily unavailable. Please try again." (not designed — **gap**)
- **Risk data unavailable:** Score not yet calculated — show "Risk assessment in progress…" (not designed — **gap**)

### Gaps
- Bedrock chat is entirely pre-scripted — **highest priority fix**
- All four data panels (risk, provenance, validation, anomalies) fetch from the same hardcoded source
- No loading skeletons for any panel

---

## Screen 7: Approval & Audit Packet

**Purpose:** Record human review decisions, show approval route progress, display full audit trail, trigger payment simulation  
**User roles:** Analyst (submit initial decision), Manager (approve/escalate), Compliance (final check), Auditor (read-only)

### Approval Steps
Currently 4 hardcoded steps. Required:
```
GET /cases/{caseId}/approval-route
→ {
    steps: [{
      stepId, label, role,
      status: "completed"|"active"|"pending",
      assignedUser, completedAt
    }]
  }
```
The approval route configuration (which roles are required, in what order) must be driven by the risk level and agency policy stored in DynamoDB — not hardcoded.

### Human Review Decision Panel
| Item | Current State | Required |
|------|--------------|---------|
| Decision buttons | Set local `decision` state | Available decisions filtered by current user's role and the active approval step |
| Comment textarea | Local state only | Required for escalate/reject; included in API request body |
| Submit Decision | Sets `submitted = true` locally | `POST /cases/{caseId}/approvals { decision, comment, reviewedBy }` → updates step status, advances workflow, writes audit event |
| Role enforcement | Not enforced — any user can press any button | Backend must reject if calling user's role is not authorized for the active step |

### Decision Outcomes
| Decision | Required Backend Behavior |
|----------|--------------------------|
| Approve | Advance Step Functions to next approval step or to payment simulation if final |
| Request Docs | Set case status to "Documentation Required"; notify submitter via SNS/SES |
| Escalate | Route to next level immediately; notify via SNS; record in audit |
| Reject | Terminal state; case status = "Rejected"; notify submitter; write final audit record |

### Payment Simulation Result
Currently shows hardcoded `paymentSimulation` object after `submitted = true`.

Required:
```
GET /cases/{caseId}/payment-simulation
→ {
    disbursementId, status: "SIMULATED",
    amount, vendorName, accountRef,
    authorizedBy, simulatedAt,
    stepFnExecutionId, auditHash
  }
```
This is written to DynamoDB by the payment simulation Lambda after all approvals complete. It is fetched, not generated, on the frontend.

**The simulation result card should only appear when `case.workflowStatus === "payment_simulated"`**, not when the analyst clicks Submit in the UI — those are decoupled events in the real workflow.

### Audit Trail
Currently 14 hardcoded events (including future events like "Finance Manager review completed" which haven't happened yet in the demo flow — **misleading gap**). Required:
```
GET /cases/{caseId}/audit?page=1&pageSize=50
→ {
    total: number,
    events: [{
      eventId, ts, event, actor, type, detail
    }]
  }
```
- Poll every 30 seconds or use WebSocket to get new events as workflow advances
- Events are append-only — backend never deletes or modifies
- The audit hash shown in the footer must be fetched from the latest audit checkpoint event, not hardcoded

### Generate Audit Packet
| Button | Current Behavior | Required |
|--------|-----------------|---------|
| Generate Audit Packet | Does nothing | `POST /cases/{caseId}/audit-packet` → Lambda bundles documents + audit log + case data into a signed PDF/ZIP, stores in S3, returns download URL; show download link |

### States Required
- **Loading:** Fetching approval status + audit trail — skeletons (not designed — **gap**)
- **Awaiting other reviewer:** Current user is not the active step's assignee — show "Awaiting [Role] review" read-only state (not designed — **gap**)
- **Payment simulated:** Show simulation result card prominently — case is effectively done
- **Rejected:** Show rejection reason, who rejected, final audit hash — terminal state (not designed — **gap**)
- **Audit packet generating:** Spinner while Lambda runs; then download link (not designed — **gap**)
- **Audit trail live update:** New event appears while user is on the screen (WebSocket / polling)

### Gaps
- Future audit events (Manager review, Compliance review, payment simulation) shown in the timeline before they've happened — timeline must only show events that have occurred
- Submitting a decision immediately shows simulation result — these are decoupled in the real workflow
- No role-based access control on decision buttons
- No "awaiting another reviewer" state

---

## Screen 8: Audit Packets (Placeholder)

**Purpose:** List completed, sealed audit evidence packages  
**User roles:** Analyst, Auditor (read-only), Compliance

Currently shows a static placeholder message. Full design not yet built — **gap**.

Required:
```
GET /audit-packets?agencyId={id}&page=1
→ [{
    packetId, caseId, vendor, amount,
    sealedAt, auditHash, downloadUrl,
    status: "sealed"|"generating"
  }]
```

Minimum design needed:
- Table of sealed packets with case ID, vendor, amount, sealed date, download button
- Status badge (generating / sealed)
- Download triggers `GET /audit-packets/{packetId}/download` → presigned S3 URL

---

## Screen 9: Settings (Placeholder)

**Purpose:** Configure thresholds, roles, integrations, workflow rules  
**User roles:** System Admin only

Currently shows 8 static list items. Each row links to nothing. Each setting category needs its own sub-screen or panel with real read/write API calls. Full design not yet built — **gap** for hackathon scope, acceptable as placeholder.

---

## Workflow Coverage Assessment

### Does the UI support the full expected workflow?

| Workflow Step | Designed | Connected to Data | Gap |
|---------------|----------|------------------|-----|
| Create payment case | ✓ New Payment screen | ✗ No `POST /cases` call | Case ID is hardcoded |
| Upload payment packet | ✓ Upload panel | ✗ No file upload to S3 | Clicking simulates upload only |
| Store documents | — | ✗ Not visible in UI | Shown only as a security note |
| Extract fields | ✓ Extraction Review | ✗ Hardcoded field list | Document preview is fake text |
| Validate payment | ✓ Risk Firewall checklist | ✗ Hardcoded check results | |
| Calculate risk | ✓ Risk score card | ✗ Hardcoded 78/100 | |
| Explain issues with AI | ✓ Bedrock chat panel | ✗ Pre-scripted responses | Highest priority fix |
| Route approval | ✓ Approval steps | ✗ Steps always same | No role enforcement |
| Support human review | ✓ Decision panel | ✗ Decisions not persisted | |
| Simulate payment | ✓ Simulation result card | ✗ Always same hardcoded data | Timing is wrong — shows on Submit not on workflow complete |
| Generate audit trail | ✓ Audit timeline | ✗ Hardcoded including future events | Future events shown before they occur |

---

## Differentiator Visibility Assessment

**"MissionPay Guard converts messy payment packets into structured payment cases, explains risk to reviewers, guides human review, routes approvals, simulates payment, and generates audit-ready evidence."**

| Differentiator Claim | Visible in UI | Accurate in UI | Connected to Real Data |
|---------------------|--------------|---------------|----------------------|
| Converts messy payment packets | ✓ Packet Conversion screen with "Why this matters" callout | ✓ Field map + conflict detection well designed | ✗ All data hardcoded |
| Into structured payment cases | ✓ Case record shown throughout | ✓ Case metadata consistent | ✗ Always same case |
| Explains risk to reviewers | ✓ Bedrock assistant + anomaly panel | ✓ Explanations are well-written | ✗ Pre-scripted, not live Bedrock |
| Guides human review | ✓ Suggested questions, decision panel, AI recommendation | ✓ Human-in-the-loop messaging is strong | ✗ Decisions not persisted |
| Routes approvals | ✓ 4-step approval route | ⚠ Route is always the same — doesn't show risk-based routing variation | ✗ Not connected to workflow |
| Simulates payment | ✓ Simulation result card | ✓ "Sandbox Mode" / prototype messaging is clear | ✗ Always same disbursement ID |
| Generates audit-ready evidence | ✓ Audit timeline + Generate Audit Packet button | ⚠ Future events shown prematurely | ✗ Not connected to append-only log |

**Strongest UI moment for judges:** The Bedrock chat assistant with suggested questions — feels live even though it isn't. Fix this first.  
**Weakest moment:** Document preview panel showing fake lorem-style invoice text instead of actual uploaded documents.

---

## Priority-Ordered Implementation Checklist for Kiro

### P0 — Must fix for demo to feel real

- [ ] `POST /cases` — create case, return real case ID, store in app state
- [ ] `PUT /cases/{caseId}/documents/{docType}` — real S3 presigned upload with progress
- [ ] `GET /cases/{caseId}/extraction` — return Textract output or mock that varies per case
- [ ] `PATCH /cases/{caseId}/extraction/fields/{fieldId}` — persist field corrections
- [ ] `POST /cases/{caseId}/extraction/fields/{fieldId}/confirm` — persist confirmations
- [ ] `POST /cases/{caseId}/assistant/chat` — real or near-real Bedrock call with case context injected server-side; retire `bedrockResponses` dictionary
- [ ] `POST /cases/{caseId}/approvals` — persist decision + comment; advance workflow
- [ ] Remove all future audit events from timeline — only show events that have occurred

### P1 — Required for a complete working prototype

- [ ] `POST /auth/login` — real authentication returning JWT (or Cognito integration)
- [ ] `GET /auth/me` — populate sidebar user name and role from token
- [ ] `GET /cases?agencyId=&page=` — paginated case list for Dashboard
- [ ] `GET /cases/summary` — live summary card counts
- [ ] `GET /cases/{caseId}/risk` — risk score from real scoring Lambda
- [ ] `GET /cases/{caseId}/validation` — rules engine results
- [ ] `GET /cases/{caseId}/anomalies` — anomaly detection output
- [ ] `GET /cases/{caseId}/approval-route` — risk-driven approval route
- [ ] `GET /cases/{caseId}/audit` — real append-only audit events
- [ ] `POST /cases/{caseId}/audit-packet` — generate and return downloadable bundle
- [ ] `GET /cases/{caseId}/workflow-status` — drive breadcrumb stepper from Step Functions state
- [ ] Role-based button visibility on Approval screen (only active step's role sees enabled buttons)
- [ ] Loading skeleton states for: Dashboard table, Risk Firewall panels, Audit timeline

### P2 — Polish and completeness

- [ ] `GET /cases/{caseId}/documents/{documentId}/preview-url` — real document preview replacing fake invoice text
- [ ] `GET /cases/{caseId}/packet` — packet conversion field map from real Lambda output
- [ ] `GET /cases/{caseId}/recommendation` — stored Bedrock recommendation from DynamoDB
- [ ] `GET /cases/{caseId}/provenance` — provenance chain from Step Functions execution history
- [ ] `GET /cases/{caseId}/payment-simulation` — fetch simulation result instead of showing on Submit
- [ ] `GET /system/status` — live system status panel on Login page
- [ ] `GET /notifications/system` — dynamic system notice banner on Dashboard
- [ ] `GET /intake/channel-status` — live email/fax/API channel status on New Payment screen
- [ ] Search functionality in Header
- [ ] Filter and Export on Dashboard case table
- [ ] `GET /cases/counts` — real sidebar badge counts with polling

### P3 — Full production readiness (post-hackathon)

- [ ] WebSocket or SSE for live audit trail updates
- [ ] MFA / PIV card authentication screen
- [ ] Audit Packets screen (currently placeholder)
- [ ] Settings screens with real read/write APIs
- [ ] Session expiry handling and token refresh
- [ ] Per-agency configurable thresholds pulled from SSM Parameter Store
- [ ] NARA retention policy enforcement on audit packet generation
- [ ] Accessibility audit (WCAG 2.1 AA — required for federal deployment)

---

## API Contract Summary

The following endpoints must exist for P0 + P1 functionality. All require `Authorization: Bearer {jwt}` header.

```
POST   /auth/login
GET    /auth/me
GET    /system/status

POST   /cases
GET    /cases
GET    /cases/summary
GET    /cases/{caseId}
GET    /cases/{caseId}/workflow-status

POST   /cases/{caseId}/documents/upload-url
POST   /cases/{caseId}/documents

GET    /cases/{caseId}/extraction
PATCH  /cases/{caseId}/extraction/fields/{fieldId}
POST   /cases/{caseId}/extraction/fields/{fieldId}/confirm
POST   /cases/{caseId}/extraction/complete

GET    /cases/{caseId}/packet
POST   /cases/{caseId}/packet/complete

GET    /cases/{caseId}/risk
GET    /cases/{caseId}/validation
GET    /cases/{caseId}/anomalies
GET    /cases/{caseId}/recommendation
GET    /cases/{caseId}/provenance

POST   /cases/{caseId}/assistant/chat

GET    /cases/{caseId}/approval-route
POST   /cases/{caseId}/approvals
GET    /cases/{caseId}/payment-simulation

GET    /cases/{caseId}/audit
POST   /cases/{caseId}/audit-packet
```

---

*End of specification. Total: 9 screens, 38 API endpoints, 47 checklist items.*
