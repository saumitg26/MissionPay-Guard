import { useState } from "react";
import { Upload, CheckCircle, Lock, ShieldCheck, ArrowRight, AlertCircle, FileText, Mail, Printer, Globe, Cpu, Wifi } from "lucide-react";
import { documentSlots, ACTIVE_CASE } from "../data/mockData";

const steps = ["Intake", "Classify", "Extract", "Convert", "Validate", "Route"];

// Multichannel ingestion options
// Production: each channel has its own Lambda handler. Portal = S3 presigned upload.
// Email = SES inbound rule → S3. Fax = third-party fax-to-email bridge → SES.
// Agency API = REST endpoint via API Gateway with IAM auth.
const channels = [
  { id: "portal",   label: "Portal Upload",  icon: Globe,    desc: "Upload directly from your browser — the most common intake path for this prototype." },
  { id: "email",    label: "Email Intake",   icon: Mail,     desc: "Send documents to intake@missionpay.agency.gov. SES ingests attachments and creates the case automatically." },
  { id: "fax",      label: "Fax Adapter",    icon: Printer,  desc: "Fax to (800) 555-0192. Physical fax is digitized, classified, and routed into the payment case queue." },
  { id: "api",      label: "Agency API",     icon: Cpu,      desc: "POST to /v1/cases/{caseId}/documents with IAM-signed requests. Used for ERP and system-to-system integrations." },
];

// System status shown for non-portal channels
const channelStatus: Record<string, { label: string; color: string }> = {
  email: { label: "Online — 0 messages in queue", color: "text-green-600" },
  fax:   { label: "Online — Fax bridge connected", color: "text-green-600" },
  api:   { label: "Online — API v1.4 accepting requests", color: "text-green-600" },
};

interface NewPaymentProps {
  onNext: () => void;
}

export function NewPayment({ onNext }: NewPaymentProps) {
  const [activeChannel, setActiveChannel] = useState("portal");
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const currentStep = 0;

  const requiredUploaded = documentSlots.filter(d => d.required).every(d => uploaded[d.key]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto p-6 space-y-5">

        {/* Case ID + Step Functions status */}
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs">Generated Payment Case ID</span>
            <div className="font-mono text-blue-600 text-lg font-semibold mt-0.5">{ACTIVE_CASE.caseId}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded">
              <Wifi className="w-3.5 h-3.5" />
              <span>Step Functions workflow started</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">
              <Lock className="w-3.5 h-3.5" />
              Secure Evidence Vault
            </div>
          </div>
        </div>

        {/* Step Functions workflow stepper */}
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-medium">AWS Step Functions — Payment Workflow</span>
            <span className="text-[10px] font-mono text-slate-400">Execution: mpg-008471-exec</span>
          </div>
          <div className="flex items-center">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
                    i < currentStep   ? "bg-green-500 border-green-500 text-white" :
                    i === currentStep ? "bg-blue-600 border-blue-600 text-white" :
                    "bg-white border-slate-200 text-slate-400"
                  }`}>
                    {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${
                    i === currentStep  ? "text-blue-700" :
                    i < currentStep    ? "text-green-700" :
                    "text-slate-400"
                  }`}>{step}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-4 ${i < currentStep ? "bg-green-400" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Multichannel intake selector */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-slate-900 text-sm font-semibold">Document Intake Channel</h2>
            <p className="text-slate-400 text-xs mt-0.5">Select how this payment packet was received. Each channel routes documents into the same encrypted intake vault.</p>
          </div>
          <div className="grid grid-cols-4 gap-0 border-b border-slate-100">
            {channels.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`flex flex-col items-center gap-1.5 py-4 px-3 border-b-2 transition-all text-center ${
                    isActive
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span className={`text-xs font-medium ${isActive ? "text-blue-700" : "text-slate-500"}`}>{ch.label}</span>
                </button>
              );
            })}
          </div>

          <div className="px-5 py-3.5">
            <p className="text-slate-500 text-xs mb-3">{channels.find(c => c.id === activeChannel)?.desc}</p>

            {activeChannel !== "portal" && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-green-400`} />
                  <span className={`text-xs font-medium ${channelStatus[activeChannel]?.color}`}>
                    {channelStatus[activeChannel]?.label}
                  </span>
                </div>
                {activeChannel === "email" && (
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div><span className="text-slate-400">Intake address:</span> intake@missionpay.agency.gov</div>
                    <div><span className="text-slate-400">Subject line required:</span> PAYMENT CASE {ACTIVE_CASE.caseId}</div>
                    <div><span className="text-slate-400">Max attachment size:</span> 50MB per message</div>
                    <div className="text-slate-400 text-[10px] mt-2">Documents are received by SES, stored in S3, and automatically attached to this case. Processing begins within 60 seconds of receipt.</div>
                  </div>
                )}
                {activeChannel === "fax" && (
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div><span className="text-slate-400">Fax number:</span> (800) 555-0192</div>
                    <div><span className="text-slate-400">Cover sheet required:</span> Include Case ID {ACTIVE_CASE.caseId} on cover sheet</div>
                    <div><span className="text-slate-400">Pages received today:</span> 0</div>
                    <div className="text-slate-400 text-[10px] mt-2">Physical fax is digitized via fax-to-email bridge, routed to SES, and ingested into the secure vault. Handwriting is processed by Textract handwriting recognition.</div>
                  </div>
                )}
                {activeChannel === "api" && (
                  <div className="space-y-1.5 text-xs text-slate-600 font-mono">
                    <div className="text-slate-400 text-[10px]">POST /v1/cases/{ACTIVE_CASE.caseId}/documents</div>
                    <div className="bg-slate-900 text-green-400 rounded p-3 text-[10px] leading-relaxed">
                      <div>{"curl -X POST \\"}</div>
                      <div className="pl-2">{"https://api.missionpay.agency.gov/v1/cases/ \\"}</div>
                      <div className="pl-2">{"  " + ACTIVE_CASE.caseId + "/documents \\"}</div>
                      <div className="pl-2">{"-H 'Authorization: AWS4-HMAC-SHA256 ...' \\"}</div>
                      <div className="pl-2">{"--form 'file=@invoice.pdf' \\"}</div>
                      <div className="pl-2">{"--form 'docType=invoice'"}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Portal upload (only shown when portal tab is active) */}
        {activeChannel === "portal" && (
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-slate-900 text-sm font-semibold">Document Upload</h2>
              <p className="text-slate-400 text-xs mt-0.5">Upload all required documents. Files are stored in an encrypted S3 intake vault and are never publicly accessible.</p>
            </div>

            <div className="p-5 space-y-3">
              {documentSlots.map((doc) => (
                <div
                  key={doc.key}
                  onDragOver={(e) => { e.preventDefault(); setDragging(doc.key); }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={(e) => { e.preventDefault(); setDragging(null); setUploaded(u => ({ ...u, [doc.key]: true })); }}
                  onClick={() => setUploaded(u => ({ ...u, [doc.key]: !u[doc.key] }))}
                  className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                    uploaded[doc.key]
                      ? "border-green-300 bg-green-50"
                      : dragging === doc.key
                      ? "border-blue-400 bg-blue-50"
                      : "border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${uploaded[doc.key] ? "bg-green-100" : "bg-white border border-slate-200"}`}>
                      {uploaded[doc.key] ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Upload className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${uploaded[doc.key] ? "text-green-800" : "text-slate-700"}`}>{doc.label}</span>
                        {doc.required && <span className="text-[10px] text-red-600 font-semibold uppercase">Required</span>}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">{doc.description}</p>
                      {uploaded[doc.key] && (
                        <p className="text-green-600 text-xs mt-1 font-medium">
                          ✓ {doc.label.replace(/\(.*\)/, "").trim()}_FINAL.pdf — Stored in S3 evidence vault
                        </p>
                      )}
                    </div>
                    {!uploaded[doc.key] && <span className="text-xs text-slate-400 shrink-0">Drop file or click</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-5 mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-500 space-y-0.5">
                <p className="font-medium text-slate-600">Federal Evidence Vault — S3 Encrypted Storage</p>
                <p>Documents are stored in a private S3 bucket with AES-256 server-side encryption. Access requires signed backend requests — no public links are ever generated. Chain-of-custody is maintained per NIST SP 800-111.</p>
              </div>
            </div>
          </div>
        )}

        {/* Accepted formats */}
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Accepted: PDF, TIFF, PNG, JPG, handwritten forms (max 50MB)</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-amber-600">Do not upload documents containing PII beyond what payment processing requires</span>
          </div>
        </div>

        {/* Action row */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            {Object.values(uploaded).filter(Boolean).length} of {documentSlots.length} documents uploaded
            {activeChannel === "portal" && !requiredUploaded && (
              <span className="text-red-500 ml-2">• Required documents missing</span>
            )}
          </div>
          <button
            onClick={(activeChannel !== "portal" || requiredUploaded) ? onNext : undefined}
            className={`flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium transition-colors ${
              activeChannel !== "portal" || requiredUploaded
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Begin Classification & Extraction
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
