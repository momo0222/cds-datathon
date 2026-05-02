"use client";

import { useEffect, useState, useCallback } from "react";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string | null;
}

interface ItemCost {
  cost: number;
  currency: string;
  type: string;
  title: string;
}

interface Props {
  tripId: string;
  canEdit: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  transport: "🚄",
  food: "🍽️",
  activity: "📍",
  shopping: "🛍️",
  other: "📦",
};

function CategoryBreakdown({
  expenses,
  itemCosts,
  totalSpent,
  currency,
}: {
  expenses: Expense[];
  itemCosts: ItemCost[];
  totalSpent: number;
  currency: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Group all line items by category
  const allItems = [
    ...itemCosts
      .filter(i => Number(i.cost) > 0)
      .map(i => ({ cat: i.type, name: i.title, amt: Number(i.cost), source: "booked item" })),
    ...expenses.map(e => ({ cat: e.category, name: e.description, amt: Number(e.amount), source: "expense" })),
  ];

  const grouped: Record<string, { total: number; items: typeof allItems }> = {};
  for (const item of allItems) {
    if (!grouped[item.cat]) grouped[item.cat] = { total: 0, items: [] };
    grouped[item.cat].total += item.amt;
    grouped[item.cat].items.push(item);
  }

  const sorted = Object.entries(grouped).sort(([, a], [, b]) => b.total - a.total);

  return (
    <div className="mb-6 rounded-lg border border-sand-100 bg-white p-5 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_18px_44px_rgba(29,158,117,0.08)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ocean-dark">
        Breakdown
      </p>
      <h3 className="mb-3 font-display text-xl font-semibold text-sand-900">Spending by Category</h3>
      <div className="flex flex-col gap-1">
        {sorted.map(([cat, { total, items }]) => {
          const isOpen = expanded === cat;
          return (
            <div key={cat}>
              <button
                onClick={() => setExpanded(isOpen ? null : cat)}
                className="flex w-full items-center gap-3 rounded-sm px-1 py-2.5 transition-colors hover:bg-sand-50"
              >
                <span className="text-base w-6 text-center">{CATEGORY_ICONS[cat] ?? "📦"}</span>
                <span className="text-sm font-medium text-sand-700 capitalize w-20 text-left">{cat}</span>
                <div className="h-2 flex-1 overflow-hidden bg-sand-100">
                  <div
                    className="h-full bg-ocean/60"
                    style={{ width: `${totalSpent > 0 ? (total / totalSpent) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-sand-500 w-24 text-right">
                  {currency} {total.toFixed(2)}
                </span>
                <span className="text-sand-400 text-xs w-4">{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen && (
                <div className="ml-10 mb-2 flex flex-col gap-0.5">
                  {items
                    .sort((a, b) => b.amt - a.amt)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-sm px-2 py-1.5 hover:bg-sand-50/80">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-sand-700 truncate">{item.name}</p>
                          <p className="text-[10px] text-sand-400">{item.source}</p>
                        </div>
                        <span className="text-xs font-mono text-sand-500 shrink-0 ml-3">
                          {currency} {item.amt.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BudgetPageClient({ tripId, canEdit }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [itemCosts, setItemCosts] = useState<ItemCost[]>([]);
  const [tripBudget, setTripBudget] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [showAdd, setShowAdd] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // Add form
  const [cat, setCat] = useState("food");
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/expenses`);
    const data = await res.json();
    if (res.ok) {
      setExpenses(data.expenses);
      setItemCosts(data.item_costs);
      setTripBudget(data.trip_budget);
      setCurrency(data.currency);
    }
  }, [tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalItemCosts = itemCosts.reduce((s, i) => s + Number(i.cost), 0);
  const totalSpent = totalExpenses + totalItemCosts;
  const remaining = tripBudget - totalSpent;
  const pct = tripBudget > 0 ? Math.min((totalSpent / tripBudget) * 100, 100) : 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/expenses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: cat,
        description: desc,
        amount: parseFloat(amt),
        currency,
        date: date || null,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(typeof d.error === "string" ? d.error : "Failed");
    } else {
      setDesc("");
      setAmt("");
      setDate("");
      setShowAdd(false);
      fetchData();
    }
    setSaving(false);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysis(null);
    const res = await fetch("/api/ai/budget-analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trip_id: tripId }),
    });
    const data = await res.json();
    if (res.ok) {
      setAnalysis(data.analysis);
    } else {
      setAnalysis("Could not analyze: " + (data.error || "unknown error"));
    }
    setAnalyzing(false);
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-sand-100 bg-white p-5 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_16px_36px_rgba(29,158,117,0.07)]">
          <p className="font-mono text-xs text-sand-400 uppercase tracking-wide mb-1">Budget</p>
          {editingBudget ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const val = parseFloat(budgetInput);
                if (isNaN(val) || val < 0) return;
                await fetch(`/api/trips/${tripId}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ total_budget: val }),
                });
                setTripBudget(val);
                setEditingBudget(false);
              }}
              className="flex items-baseline gap-1"
            >
              <span className="font-display text-2xl font-semibold text-sand-900">{currency}</span>
              <input
                type="number"
                step="0.01"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={async () => {
                  const val = parseFloat(budgetInput);
                  if (isNaN(val) || val < 0) { setEditingBudget(false); return; }
                  await fetch(`/api/trips/${tripId}`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ total_budget: val }),
                  });
                  setTripBudget(val);
                  setEditingBudget(false);
                }}
                onKeyDown={(e) => { if (e.key === "Escape") setEditingBudget(false); }}
                className="w-28 appearance-none border-b-2 border-ocean bg-transparent font-display text-2xl font-semibold text-sand-900 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                autoFocus
              />
            </form>
          ) : (
            <p
              className={`font-display text-2xl font-semibold text-sand-900 ${canEdit ? "cursor-pointer group" : ""}`}
              onClick={() => {
                if (!canEdit) return;
                setBudgetInput(String(tripBudget));
                setEditingBudget(true);
              }}
            >
              {currency} {tripBudget.toLocaleString()}
              {canEdit && <span className="inline-block ml-1.5 text-sand-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm">✎</span>}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-sand-100 bg-white p-5 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_16px_36px_rgba(29,158,117,0.07)]">
          <p className="font-mono text-xs text-sand-400 uppercase tracking-wide mb-1">Spent</p>
          <p className="font-display text-2xl font-semibold text-sand-900">
            {currency} {totalSpent.toFixed(2)}
          </p>
          <p className="text-xs text-sand-400 mt-1">
            {expenses.length} expenses + {itemCosts.filter(i => i.cost > 0).length} booked items
          </p>
        </div>
        <div className="rounded-lg border border-sand-100 bg-white p-5 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_16px_36px_rgba(29,158,117,0.07)]">
          <p className="font-mono text-xs text-sand-400 uppercase tracking-wide mb-1">Remaining</p>
          <p className={`font-display text-2xl font-semibold ${remaining >= 0 ? "text-ocean-dark" : "text-amber-dark"}`}>
            {currency} {remaining.toFixed(2)}
          </p>
          <p className="text-xs text-sand-400 mt-1">
            {remaining >= 0 ? "On track" : "Over budget!"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {tripBudget > 0 && (
        <div className="mb-6 rounded-lg border border-sand-100 bg-white p-4 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_14px_34px_rgba(29,158,117,0.07)]">
          <div className="flex justify-between text-xs text-sand-400 mb-2">
            <span>{pct.toFixed(0)}% used</span>
            <span>{currency} {totalSpent.toFixed(2)} / {tripBudget.toLocaleString()}</span>
          </div>
          <div className="h-3 w-full overflow-hidden bg-sand-100">
            <div
              className={`h-full transition-all duration-500 ${pct > 90 ? "bg-amber-dark" : pct > 70 ? "bg-amber" : "bg-moss"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="mb-6 rounded-lg border border-ocean/15 bg-white p-5 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_18px_44px_rgba(29,158,117,0.09)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ocean-dark">
              Advisor
            </p>
            <h3 className="font-display text-xl font-semibold text-sand-900">AI Budget Analysis</h3>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="btn-primary text-sm"
          >
            {analyzing ? "Analyzing..." : "Analyze Spending"}
          </button>
        </div>
        {analysis && (
          <div className="whitespace-pre-wrap rounded-sm bg-sand-50 p-4 text-sm leading-relaxed text-sand-700">
            {analysis}
          </div>
        )}
        {!analysis && !analyzing && (
          <p className="text-sm text-sand-400">
            Click &quot;Analyze Spending&quot; to get AI-powered budget tips for this trip.
          </p>
        )}
      </div>

      {/* Category breakdown with expandable details */}
      {(expenses.length > 0 || itemCosts.some(i => i.cost > 0)) && (
        <CategoryBreakdown
          expenses={expenses}
          itemCosts={itemCosts}
          totalSpent={totalSpent}
          currency={currency}
        />
      )}

      {/* Expense list */}
      <div className="rounded-lg border border-sand-100 bg-white p-5 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_18px_44px_rgba(29,158,117,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sand-400">
              Ledger
            </p>
            <h3 className="font-display text-xl font-semibold text-sand-900">
              Expenses ({expenses.length})
            </h3>
          </div>
          {canEdit && (
            <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
              {showAdd ? "Cancel" : "+ Add Expense"}
            </button>
          )}
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-3 rounded-sm bg-sand-50 p-4">
            <div className="flex gap-3">
              <select value={cat} onChange={e => setCat(e.target.value)} className="input w-36">
                {Object.entries(CATEGORY_ICONS).map(([k, v]) => (
                  <option key={k} value={k}>{v} {k}</option>
                ))}
              </select>
              <input
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Description"
                className="input flex-1"
                required
              />
            </div>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                value={amt}
                onChange={e => setAmt(e.target.value)}
                placeholder="Amount"
                className="input w-32"
                required
              />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input w-40"
              />
              <button type="submit" disabled={saving} className="btn-primary whitespace-nowrap">
                {saving ? "Saving..." : "Add"}
              </button>
            </div>
            {error && <p className="text-sm font-medium text-amber-dark">{error}</p>}
          </form>
        )}

        {expenses.length === 0 ? (
          <p className="text-sm text-sand-400">No expenses tracked yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center gap-3 rounded-sm bg-sand-50/50 p-3 transition-colors hover:bg-sand-50">
                <span className="text-base">{CATEGORY_ICONS[exp.category] ?? "📦"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sand-900 truncate">{exp.description}</p>
                  <p className="text-xs text-sand-400">
                    {exp.category} {exp.date ? `· ${exp.date}` : ""}
                  </p>
                </div>
                <span className="text-sm font-mono font-semibold text-sand-700">
                  {exp.currency} {Number(exp.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
