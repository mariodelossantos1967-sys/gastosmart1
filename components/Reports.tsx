import React, { useState, useMemo } from 'react';
import { Filter, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { Transaction } from '../types';
import { ExpensePieChart, IncomePieChart, CashFlowChart } from './Charts';

interface ReportsProps {
  transactions: Transaction[];
}

type TimeFilter = 'current-month' | 'last-month' | 'last-3-months' | 'all';

export const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [filter, setFilter] = useState<TimeFilter>('current-month');

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter(t => {
      // Exclude transfers from P&L reports
      if (t.type === 'transfer') return false;

      const tDate = new Date(t.date);
      const tYear = tDate.getFullYear();
      const tMonth = tDate.getMonth();

      switch (filter) {
        case 'current-month':
          return tYear === currentYear && tMonth === currentMonth;
        case 'last-month':
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return tYear === lastMonthDate.getFullYear() && tMonth === lastMonthDate.getMonth();
        case 'last-3-months':
           const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
           return tDate >= threeMonthsAgo;
        case 'all':
        default:
          return true;
      }
    });
  }, [transactions, filter]);

  // Calculations
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Informes y Análisis</h2>
          <p className="text-gray-500 text-sm mt-1">Valores normalizados a Pesos Uruguayos ($) según cotización actual.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
          <Filter size={16} className="text-gray-400 ml-2" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as TimeFilter)}
            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer py-1 pr-8"
          >
            <option value="current-month">Este Mes</option>
            <option value="last-month">Mes Pasado</option>
            <option value="last-3-months">Últimos 3 Meses</option>
            <option value="all">Todo el Historial</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ingresos (Est.)</p>
          <div className="flex items-center gap-2 text-green-600">
             <TrendingUp size={20} />
             <span className="text-2xl font-bold">${totalIncome.toLocaleString('es-UY', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Gastos (Est.)</p>
          <div className="flex items-center gap-2 text-red-500">
             <TrendingDown size={20} />
             <span className="text-2xl font-bold">${totalExpense.toLocaleString('es-UY', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Flujo Neto</p>
          <div className={`flex items-center gap-2 ${netIncome >= 0 ? 'text-brand-600' : 'text-orange-500'}`}>
             <DollarSign size={20} />
             <span className="text-2xl font-bold">${netIncome.toLocaleString('es-UY', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tasa Ahorro</p>
          <div className="flex items-center gap-2 text-purple-600">
             <span className="text-2xl font-bold">{savingsRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cash Flow */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-slate-800">Flujo de Caja (Ingresos vs Gastos)</h3>
              <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                 <Calendar size={18} />
              </div>
           </div>
           <CashFlowChart transactions={filteredTransactions} />
        </div>

        {/* Expenses */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-semibold text-lg text-slate-800 mb-6 border-b border-gray-100 pb-2">Gastos por Categoría</h3>
           <ExpensePieChart transactions={filteredTransactions} />
        </div>

        {/* Income */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-semibold text-lg text-slate-800 mb-6 border-b border-gray-100 pb-2">Ingresos por Fuente</h3>
           <IncomePieChart transactions={filteredTransactions} />
        </div>

      </div>
    </div>
  );
};