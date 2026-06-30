import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { NewPayment } from "./components/NewPayment";
import { ExtractionReview } from "./components/ExtractionReview";
import { PacketConversion } from "./components/PacketConversion";
import { RiskFirewall } from "./components/RiskFirewall";
import { ApprovalAudit } from "./components/ApprovalAudit";
import { LoginPage } from "./components/LoginPage";

// Screens mapped to sidebar nav items
type Screen =
  | "dashboard"
  | "new-payment"
  | "extraction"      // Step 2: Textract extraction review
  | "conversion"      // Step 3: Payment packet conversion (key differentiator)
  | "risk-firewall"   // Step 4: Rules engine + risk scoring + Bedrock
  | "approvals"       // Step 5: Human review + audit trail + payment simulation
  | "audit-packets"
  | "settings";

// Sidebar nav items — cases entry point goes straight to extraction for the demo case
type SidebarScreen = "dashboard" | "new-payment" | "cases" | "risk-firewall" | "approvals" | "audit-packets" | "settings";

const screenMeta: Record<Screen, { title: string; subtitle: string }> = {
  "dashboard":    { title: "Dashboard",                       subtitle: "FY2025 Q1 — Payment Operations Overview" },
  "new-payment":  { title: "New Payment Intake",              subtitle: "Case MPG-2024-008471 — Document Ingestion & Step Functions Workflow" },
  "extraction":   { title: "Extraction Review",               subtitle: "Case MPG-2024-008471 — Amazon Textract Field Extraction" },
  "conversion":   { title: "Payment Packet Conversion",       subtitle: "Case MPG-2024-008471 — Cross-Document Field Mapping & Readiness Assessment" },
  "risk-firewall":{ title: "Risk Firewall",                   subtitle: "Case MPG-2024-008471 — Rules Engine · Risk Scoring · Bedrock Assistant" },
  "approvals":    { title: "Approval & Audit Packet",         subtitle: "Case MPG-2024-008471 — Human Review · Audit Trail · Payment Simulation" },
  "audit-packets":{ title: "Audit Packets",                   subtitle: "Completed audit evidence packages" },
  "settings":     { title: "Settings",                        subtitle: "System configuration and access control" },
};

// Maps sidebar clicks to the right screen
const sidebarMap: Record<SidebarScreen, Screen> = {
  "dashboard":     "dashboard",
  "new-payment":   "new-payment",
  "cases":         "extraction",
  "risk-firewall": "risk-firewall",
  "approvals":     "approvals",
  "audit-packets": "audit-packets",
  "settings":      "settings",
};

// Maps screens back to which sidebar item should appear active
const sidebarActive: Record<Screen, SidebarScreen> = {
  "dashboard":     "dashboard",
  "new-payment":   "new-payment",
  "extraction":    "cases",
  "conversion":    "cases",
  "risk-firewall": "risk-firewall",
  "approvals":     "approvals",
  "audit-packets": "audit-packets",
  "settings":      "settings",
};

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  const meta = screenMeta[screen];

  const handleSidebarNav = (s: SidebarScreen) => {
    setScreen(sidebarMap[s]);
  };

  const renderContent = () => {
    switch (screen) {
      case "dashboard":
        return <Dashboard onOpenCase={() => setScreen("risk-firewall")} />;
      case "new-payment":
        return <NewPayment onNext={() => setScreen("extraction")} />;
      case "extraction":
        return <ExtractionReview onNext={() => setScreen("conversion")} />;
      case "conversion":
        return <PacketConversion onNext={() => setScreen("risk-firewall")} />;
      case "risk-firewall":
        return <RiskFirewall onNext={() => setScreen("approvals")} />;
      case "approvals":
        return <ApprovalAudit />;
      case "audit-packets":
        return <AuditPacketsPlaceholder />;
      case "settings":
        return <SettingsPlaceholder />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar active={sidebarActive[screen]} onNavigate={handleSidebarNav} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={meta.title} subtitle={meta.subtitle} />

        {/* Workflow breadcrumb for case-level screens */}
        {["new-payment", "extraction", "conversion", "risk-firewall", "approvals"].includes(screen) && (
          <WorkflowBreadcrumb current={screen} onNavigate={setScreen} />
        )}

        {renderContent()}
      </div>
    </div>
  );
}

// Breadcrumb showing where we are in the Step Functions workflow
const workflowSteps: { id: Screen; label: string; short: string }[] = [
  { id: "new-payment",   label: "1. Intake",      short: "Intake" },
  { id: "extraction",    label: "2. Extract",      short: "Extract" },
  { id: "conversion",    label: "3. Convert",      short: "Convert" },
  { id: "risk-firewall", label: "4. Risk & Validate", short: "Risk" },
  { id: "approvals",     label: "5. Approve & Audit",  short: "Approve" },
];

function WorkflowBreadcrumb({ current, onNavigate }: { current: Screen; onNavigate: (s: Screen) => void }) {
  const currentIdx = workflowSteps.findIndex(s => s.id === current);
  return (
    <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-1 text-xs">
      <span className="text-slate-400 font-medium mr-2 text-[10px] uppercase tracking-wide">Workflow:</span>
      {workflowSteps.map((step, i) => {
        const isCurrent = step.id === current;
        const isPast = i < currentIdx;
        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              onClick={() => (isPast || isCurrent) ? onNavigate(step.id) : undefined}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                isCurrent
                  ? "bg-blue-600 text-white"
                  : isPast
                  ? "text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 cursor-pointer"
                  : "text-slate-400 bg-slate-50 border border-slate-200 cursor-default"
              }`}
            >
              {step.label}
            </button>
            {i < workflowSteps.length - 1 && (
              <span className="text-slate-300">›</span>
            )}
          </div>
        );
      })}
      <span className="ml-auto text-[10px] text-slate-400 font-mono">MPG-2024-008471 · Step Functions</span>
    </div>
  );
}

function AuditPacketsPlaceholder() {
  return (
    <div className="flex-1 bg-slate-50 p-6">
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <div className="text-slate-400 text-sm">Completed audit evidence packages are stored here after approval workflows are finalized and sealed in S3.</div>
        <div className="mt-4 text-xs text-slate-300 font-mono">Audit Packets — connects to S3 evidence vault in production</div>
      </div>
    </div>
  );
}

function SettingsPlaceholder() {
  const settingsSections = [
    { label: "User Access Control",       detail: "Manage reviewer roles, permissions, and multi-factor authentication requirements" },
    { label: "Compliance Thresholds",     detail: "Configure payment amount thresholds, risk score cutoffs, and auto-routing rules" },
    { label: "AI Model Configuration",    detail: "Bedrock model selection, confidence thresholds, and extraction field mapping" },
    { label: "Evidence Vault Security",   detail: "AES-256 key rotation, FIPS 140-2 compliance, and S3 retention policy management" },
    { label: "Audit Log Retention",       detail: "Append-only DynamoDB log config, CloudWatch export, and NARA retention schedule" },
    { label: "Integration Settings",      detail: "SAM.gov, DFAS, Treasury, and agency ERP connection management" },
    { label: "Step Functions Workflows",  detail: "Approval routing rules, timeout thresholds, and workflow state configuration" },
    { label: "Textract Configuration",    detail: "OCR confidence thresholds, custom field mappers, and handwriting recognition settings" },
  ];
  return (
    <div className="flex-1 bg-slate-50 p-6">
      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {settingsSections.map(s => (
          <div key={s.label} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-slate-800">{s.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.detail}</div>
            </div>
            <span className="text-xs text-blue-600 font-medium">Configure →</span>
          </div>
        ))}
      </div>
    </div>
  );
}
