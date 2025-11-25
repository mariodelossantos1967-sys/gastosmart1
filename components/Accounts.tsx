import React, { useState } from 'react';
import { Plus, Wallet, CreditCard, PiggyBank, Briefcase, Trash2, TrendingUp, X } from 'lucide-react';
import { Account, AccountType, Currency } from '../types';

interface AccountsProps {
  accounts: Account[];
  onAddAccount: (account: Account) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  transactions: any[]; // To calculate current balance
  exchangeRates: { USD: number, UI: number };
}

export const Accounts: React.FC<AccountsProps> = ({ accounts, onAddAccount, onUpdateAccount, onDeleteAccount, transactions, exchangeRates }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // -- Add Form State --
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [currency, setCurrency] = useState<Currency>('UYU');
  const [initialBalance, setInitialBalance] = useState('');

  // -- Edit Modal State --
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Helper for conversion locally in this component
  const convertToUYU = (amount: number, currency: Currency): number => {
      if (currency === 'UYU') return amount;
      if (currency === 'USD') return amount * exchangeRates.USD;
      if (currency === 'UI') return amount * exchangeRates.UI;
      return amount;
  };

  const calculateBalance = (account: Account) => {
    const accountTx = transactions.filter(t => t.accountId === account.id || t.toAccountId === account.id);
    const balance = accountTx.reduce((acc, t) => {
      if (t.accountId === account.id) {
        // Outgoing money
        if (t.type === 'income') return acc + t.amount;
        if (t.type === 'expense') return acc - t.amount;
        if (t.type === 'transfer') return acc - t.amount;
      }
      if (t.toAccountId === account.id && t.type === 'transfer') {
        // Incoming transfer money
        // If currencies differ, convert
        const sourceAcc = accounts.find(a => a.id === t.accountId);
        let amountToAdd = t.amount;
        
        if (sourceAcc && sourceAcc.currency !== account.currency) {
            // Convert to UYU then to Target
            const amountInUYU = convertToUYU(t.amount, sourceAcc.currency);
            if (account.currency === 'USD') amountToAdd = amountInUYU / exchangeRates.USD;
            else if (account.currency === 'UI') amountToAdd = amountInUYU / exchangeRates.UI;
            else amountToAdd = amountInUYU;
        }
        return acc + amountToAdd;
      }
      return acc;
    }, account.initialBalance);
    return balance;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newAccount: Account = {
      id: Date.now().toString(),
      name,
      type,
      currency,
      initialBalance: parseFloat(initialBalance) || 0
    };

    onAddAccount(newAccount);
    setShowAddForm(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setName('');
    setType('checking');
    setCurrency('UYU');
    setInitialBalance('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      onUpdateAccount(editingAccount);
      setEditingAccount(null);
    }
  };

  const getIcon = (type: AccountType) => {
    switch (type) {
      case 'savings': return <PiggyBank size={24} />;
      case 'investment': return <TrendingUp size={24} />;
      case 'cash': return <Wallet size={24} />;
      case 'checking':
      default: return <CreditCard size={24} />;
    }
  };

  const getBgColor = (type: AccountType) => {
    switch (type) {
      case 'savings': return 'bg-purple-100 text-purple-600';
      case 'investment': return 'bg-indigo-100 text-indigo-600';
      case 'cash': return 'bg-green-100 text-green-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mis Cuentas</h2>
          <p className="text-gray-500">Gestiona tus cajas de ahorro, cuentas corrientes y plazos fijos.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={20} /> Nueva Cuenta
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6 animate-in slide-in-from-top-4">
          <h3 className="font-semibold text-lg mb-4">Agregar nueva cuenta</h3>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la cuenta</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ej: Santander UI, BROU Ahorro..." 
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="checking">Cuenta Corriente</option>
                  <option value="savings">Caja de Ahorro</option>
                  <option value="investment">Plazo Fijo / Inversión</option>
                  <option value="cash">Efectivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="UYU">Pesos Uruguayos ($)</option>
                  <option value="USD">Dólares (US$)</option>
                  <option value="UI">Unidades Indexadas (UI)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Inicial</label>
                <input 
                  type="number" 
                  value={initialBalance} 
                  onChange={e => setInitialBalance(e.target.value)} 
                  placeholder="0.00" 
                  step="0.01"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
              >
                Guardar Cuenta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const currentBal = calculateBalance(acc);
          return (
            <div 
              key={acc.id} 
              onClick={() => setEditingAccount(acc)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-brand-300 hover:shadow-md transition-all relative cursor-pointer"
            >
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAccount(acc.id);
                }}
                className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all z-10"
                title="Eliminar cuenta"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex items-center gap-4 mb-4 pr-8">
                <div className={`p-3 rounded-full ${getBgColor(acc.type)}`}>
                  {getIcon(acc.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 truncate" title={acc.name}>{acc.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                    {acc.type === 'investment' ? 'Plazo Fijo' : acc.type === 'savings' ? 'Caja Ahorro' : acc.type === 'checking' ? 'Cta. Corriente' : 'Efectivo'}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Saldo Actual</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-gray-500">
                    {acc.currency === 'UYU' ? '$' : acc.currency === 'USD' ? 'US$' : 'UI'}
                  </span>
                  <span className="text-2xl font-bold text-slate-800 tracking-tight">
                    {currentBal.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {accounts.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            No tienes cuentas configuradas. Crea una para empezar.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="text-lg font-bold text-slate-800">Editar Cuenta</h3>
               <button 
                 onClick={() => setEditingAccount(null)}
                 className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
               >
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={editingAccount.name} 
                  onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} 
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select 
                    value={editingAccount.type} 
                    onChange={(e) => setEditingAccount({...editingAccount, type: e.target.value as AccountType})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="checking">Cuenta Corriente</option>
                    <option value="savings">Caja de Ahorro</option>
                    <option value="investment">Plazo Fijo / Inversión</option>
                    <option value="cash">Efectivo</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                   <select 
                     value={editingAccount.currency} 
                     onChange={(e) => setEditingAccount({...editingAccount, currency: e.target.value as Currency})}
                     className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                   >
                     <option value="UYU">UYU ($)</option>
                     <option value="USD">USD (US$)</option>
                     <option value="UI">UI</option>
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Inicial</label>
                <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      value={editingAccount.initialBalance} 
                      onChange={e => setEditingAccount({...editingAccount, initialBalance: parseFloat(e.target.value) || 0})} 
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Modificar esto recalculará el saldo actual.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-sm font-medium"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};