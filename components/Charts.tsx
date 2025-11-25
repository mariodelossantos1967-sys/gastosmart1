import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction } from '../types';

interface ChartsProps {
  transactions: Transaction[];
}

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'];
const INCOME_COLORS = ['#22c55e', '#10b981', '#34d399', '#6ee7b7'];

const CustomTooltip = ({ active, payload, label, prefix = '$' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p className="text-sm text-brand-600">
          {prefix}{Number(payload[0].value).toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export const ExpensePieChart: React.FC<ChartsProps> = ({ transactions }) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const dataMap = expenses.reduce((acc, curr) => {
    const cat = curr.category;
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(dataMap).map(key => ({
    name: key,
    value: dataMap[key]
  })).sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        No hay datos de gastos
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const IncomePieChart: React.FC<ChartsProps> = ({ transactions }) => {
  const income = transactions.filter(t => t.type === 'income');
  
  const dataMap = income.reduce((acc, curr) => {
    const cat = curr.category;
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(dataMap).map(key => ({
    name: key,
    value: dataMap[key]
  })).sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        No hay datos de ingresos
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CashFlowChart: React.FC<ChartsProps> = ({ transactions }) => {
  // Group by Month YYYY-MM
  const dataMap = transactions.reduce((acc, curr) => {
    // curr.date is YYYY-MM-DD
    const monthKey = curr.date.substring(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = { name: monthKey, income: 0, expense: 0 };
    }
    if (curr.type === 'income') {
      acc[monthKey].income += curr.amount;
    } else {
      acc[monthKey].expense += curr.amount;
    }
    return acc;
  }, {} as Record<string, { name: string, income: number, expense: number }>);

  const data = (Object.values(dataMap) as { name: string, income: number, expense: number }[])
    .sort((a, b) => a.name.localeCompare(b.name));

  // Format month names for display
  const formattedData = data.map(item => {
    const [year, month] = item.name.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      ...item,
      shortName: date.toLocaleDateString('es-ES', { month: 'short' }), // Ene, Feb
    };
  });

  if (formattedData.length === 0) {
     return (
      <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        No hay suficiente historial
      </div>
    );
  }

  return (
    <div className="h-80 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="shortName" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b' }} 
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
          <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
