import { AlertTriangle, Clock, FileText, TrendingUp, Zap, ArrowUpRight, Filter, Download } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { RiskBadge } from "./RiskBadge";

const summaryCards = [
  { label: "Total Payment Cases", value: "1,284", delta: "+12 this week", icon: FileText, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  { label: "Pending Review", value: "47", delta: "8 require action", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { label: "High-Risk Cases", value: "11", delta: "3 escalated today", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  { label: "Auto-Routed Cases", value: "821", delta: "64% of total", icon: Zap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { label: "Avg Processing Time", value: "2.4 hrs", delta: "-0.3 hrs vs last week", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
];

const cases = [
  { id: "MPG-2024-008471", vendor: "Northgate Defense Systems LLC",     amount: "$847,250.00",  status: "Review Required" as const, risk: "High" as const,   updated: "2024-12-18 14:32", reviewer: "M. Anderson" },
  { id: "MPG-2024-008468", vendor: "Apex Government Solutions Inc.",    amount: "$124,800.00",  status: "Validating" as const,      risk: "Medium" as const, updated: "2024-12-18 13:15", reviewer: "J. Thornton" },
  { id: "MPG-2024-008465", vendor: "Federal Logistics Partners LLC",    amount: "$56,200.00",   status: "Approved" as const,        risk: "Low" as const,    updated: "2024-12-18 11:42", reviewer: "S. Patel" },
  { id: "MPG-2024-008462", vendor: "Sentinel IT Services Inc.",         amount: "$1,204,000.00",status: "Review Required" as const, risk: "High" as const,   updated: "2024-12-18 10:08", reviewer: "M. Anderson" },
  { id: "MPG-2024-008459", vendor: "CapStone Infrastructure Group",     amount: "$339,750.00",  status: "Payment Ready" as const,   risk: "Low" as const,    updated: "2024-12-18 09:55", reviewer: "D. Williams" },
  { id: "MPG-2024-008455", vendor: "BlueStar Consulting Associates",    amount: "$88,450.00",   status: "Audit Generated" as const, risk: "Low" as const,    updated: "2024-12-17 16:30", reviewer: "J. Thornton" },
  { id: "MPG-2024-008451", vendor: "Vanguard Technical Systems LLC",    amount: "$472,900.00",  status: "Extracting" as const,      risk: "Medium" as const, updated: "2024-12-17 15:12", reviewer: "Unassigned" },
  { id: "MPG-2024-008447", vendor: "National Security Contractors Inc.",amount: "$2,100,000.00",status: "Review Required" as const, risk: "High" as const,   updated: "2024-12-17 14:01", reviewer: "C. Nguyen" },
  { id: "MPG-2024-008443", vendor: "Meridian Supply Chain Solutions",   amount: "$215,300.00",  status: "Received" as const,        risk: "Low" as const,    updated: "2024-12-17 12:44", reviewer: "Unassigned" },
  { id: "MPG-2024-008439", vendor: "Horizon Federal Services LLC",      amount: "$67,100.00",   status: "Approved" as const,        risk: "Low" as const,    updated: "2024-12-17 11:20", reviewer: "S. Patel" },
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
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`bg-white border ${card.border} rounded-lg p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-slate-500 text-xs leading-tight">{card.label}</span>
                  <div className={`p-1.5 rounded ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="text-slate-900 text-2xl font-semibold mt-1">{card.value}</div>
                <div className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {card.delta}
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
                {cases.map((c, i) => (
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
                    <td className="px-5 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3">
                      <RiskBadge risk={c.risk} />
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-[10px]">{c.updated}</td>
                    <td className="px-5 py-3 text-slate-600">{c.reviewer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 text-xs">Showing 10 of 1,284 cases</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(p => (
                <button key={p} className={`w-7 h-7 text-xs rounded ${p === 1 ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
