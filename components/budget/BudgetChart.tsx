"use client";

// Person 2: Implement budget visualizations with Recharts
//
// import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
//
// Example donut chart for category breakdown:
//
// const CATEGORY_COLORS = {
//   flight: '#2D5A8E',
//   hotel: '#8250DF',
//   transport: '#2DA478',
//   food: '#D2464B',
//   activity: '#EA961E',
//   shopping: '#E8453C',
//   other: '#999',
// };
//
// export function BudgetDonut({ expenses }) {
//   const byCategory = Object.entries(
//     expenses.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + e.amount }), {})
//   ).map(([category, amount]) => ({ category, amount }));
//
//   return (
//     <ResponsiveContainer width="100%" height={240}>
//       <PieChart>
//         <Pie data={byCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
//           {byCategory.map(entry => (
//             <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
//           ))}
//         </Pie>
//         <Tooltip />
//       </PieChart>
//     </ResponsiveContainer>
//   );
// }

export function BudgetChart() {
  return (
    <div className="text-center py-8 text-sand-400 text-sm">
      Budget charts will render here once Recharts data is wired up.
    </div>
  );
}

export function ExpenseRow() {
  return null;
}
