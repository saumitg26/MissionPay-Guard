import { AlertTriangle, Clock, FileText, TrendingUp, Zap, ArrowUpRight, Filter, Download } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { RiskBadge } from "./RiskBadge";
import { caseTable, dashboardSummary } from "../data/mockData";

// Summary card display config — labels and icons are UI concerns, not data
const summaryCardConfig = [
  { key: "totalCases"       as const, label: "Total Payment Cases", icon: FileText,    color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  { key: "pendingReview"    as const, label: "Pending Review",      icon: Clock,        color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "highRiskCases"    as const, label: "High-Risk Cases",     icon: AlertTriangle,color: "text-red-600",   bg: "bg-red-50",   border: "border-red-200" },
  { key: "autoRouted"       as const, label: "Auto-Routed Cases",   icon: Zap,          color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-200" },
  { key: "avgProcessingHrs" as const, label: "Avg Processing Time", icon: TrendingUp,   color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
];

interface DashboardProps {
  onOpenCase: () => void;
}

export function Dashboard({ onOpenCase }: DashboardProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="p-6 space-y-6">
        {/* System notice */}
        <div className="bg-blue-50 border border-blue-200 rounded px-4 py-2.5 flex items-center gap-3">
          <span className="text-blue-700 text-xs font-semibold">SYSTEM NOTICE</span>
          <span className="text-blue-600 text-xs">FY2025 Q1 period closes Jan 31, 2025. All pending disbursements must be approved by Jan 28. Contact Finance Operations for extensions.</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-4">
          {summaryCardConfig.map((card) => {
            const Icon = card.icon;
            const data = dashboardSummary[card.key];
            return (
              <div key={card.key} className={`bg-white border ${card.border} rounded-lg p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-slate-500 text-xs leading-tight">{card.label}</span>
                  <div className={`p-1.5 rounded ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="text-slate-900 text-2xl font-semibold mt-1">{data.value}</div>
                <div className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {data.delta}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cases table */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-slate-900 text-sm font-semibold">Payment Cases</h2>
              <p className="text-slate-400 text-xs mt-0.5">All active payment cases requiring analyst action</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                <Filter className="w-3.5 h-3.5" />
                Filter
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Case ID</th>
                  <th className="text-left px-5 py-2.5 text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Vendor</th>
                  <th className="text-right px-5 py-2.5 text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Amount</th>
                  <th className="text-left px-5 py-2.5 text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Status</th>
                  <th className="text-left px-5 py-2.5 text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Risk Level</th>
                  <th className="text-left px-5 py-2.5 text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Last Updated</th>
                  <th className="text-left px-5 py-2.5 text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {caseTable.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={onOpenCase}
                    className={`cursor-pointer transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-blue-600 font-medium hover:underline">{c.id}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-700 max-w-[200px] truncate">{c.vendor}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-900 font-medium">{c.amount}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3"><RiskBadge risk={c.risk} /></td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-[10px]">{c.updated}</td>
                    <td className="px-5 py-3 text-slate-600">{c.reviewer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 text-xs">Showing {caseTable.length} of {dashboardSummary.totalCases.value} cases</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(p => (
                <button key={p} className={`w-7 h-7 text-xs rounded ${p === 1 ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
