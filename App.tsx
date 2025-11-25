import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, List, MessageSquareText, Wallet, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, Settings, CreditCard, RefreshCw, Banknote, LogOut, Loader2, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { Transaction, ViewState, Category, TransactionType, ReceiptData, Account, Currency, PaymentMethod } from './types';
import { ReceiptUploader } from './components/ReceiptUploader';
import { ExpensePieChart } from './components/Charts';
import { ChatAssistant } from './components/ChatAssistant';
import { Reports } from './components/Reports';
import { Accounts } from './components/Accounts';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { db } from './services/firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

const App: React.FC = () => {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const [view, setView] = useState<ViewState>('dashboard');
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // -- Data State --
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // -- Currency & Exchange Rates State --
  const [exchangeRates, setExchangeRates] = useState({
    USD: 42.50,
    UI: 6.16
  });

  // -- Form State --
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(Category.Food);
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>(''); // For transfers
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('debit');

  // -- Firestore Listeners --
  useEffect(() => {
    if (!currentUser) return;

    setIsLoadingData(true);

    // Accounts Listener
    const accountsRef = collection(db, 'users', currentUser.uid, 'accounts');
    
    const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Account[];
      setAccounts(accountsData);
      
      // Default selection if needed
      if (accountsData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsData[0].id);
      }
    }, (error) => {
      console.error("Error fetching accounts:", error);
      if (error.code === 'permission-denied') {
        alert("Error de Permisos: No se pudieron cargar las cuentas. Asegúrate de haber actualizado las Reglas en Firebase Console.");
      }
    });

    // Transactions Listener
    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));
    
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txData);
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setIsLoadingData(false);
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeTransactions();
    };
  }, [currentUser]); // Remove selectedAccountId from dependency to avoid loop

  // -- Auth Handling --
  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={40} /></div>;
  if (!currentUser) return <Login />;

  // -- Helper: Currency Conversion --
  const convertToUYU = (amount: number, currency: Currency): number => {
    if (currency === 'UYU') return amount;
    if (currency === 'USD') return amount * exchangeRates.USD;
    if (currency === 'UI') return amount * exchangeRates.UI;
    return amount;
  };

  const getAccountCurrency = (accId: string): Currency => {
    return accounts.find(a => a.id === accId)?.currency || 'UYU';
  };

  // -- Handlers --
  const handleAddTransaction = async () => {
    if (!amount || !description || !selectedAccountId) return;
    if (type === 'transfer' && (!toAccountId || toAccountId === selectedAccountId)) {
        alert("Por favor selecciona una cuenta destino válida.");
        return;
    }
    
    try {
        const newTxData = {
            date,
            amount: parseFloat(amount),
            description: type === 'transfer' ? 'Transferencia entre cuentas' : description,
            category: type === 'transfer' ? Category.Transfer : category,
            type,
            accountId: selectedAccountId,
            toAccountId: type === 'transfer' ? toAccountId : null,
            paymentMethod: type === 'expense' ? paymentMethod : null,
            createdAt: new Date()
        };

        const txCollectionRef = collection(db, 'users', currentUser.uid, 'transactions');
        await addDoc(txCollectionRef, newTxData);
        
        resetForm();
        setView('dashboard');
    } catch (error) {
        console.error("Error adding transaction", error);
        alert("Error al guardar la transacción. Verifica tu conexión o permisos.");
    }
  };

  const handleAddAccount = async (account: Account) => {
    try {
        // We remove ID because Firestore generates it
        const { id, ...accountData } = account;
        const accCollectionRef = collection(db, 'users', currentUser.uid, 'accounts');
        const docRef = await addDoc(accCollectionRef, accountData);
        if (!selectedAccountId) setSelectedAccountId(docRef.id);
    } catch (error) {
        console.error("Error adding account", error);
        alert("Error al crear la cuenta. Verifica permisos.");
    }
  };

  const handleUpdateAccount = async (updatedAccount: Account) => {
    try {
        const { id, ...data } = updatedAccount;
        const accDocRef = doc(db, 'users', currentUser.uid, 'accounts', id);
        await updateDoc(accDocRef, data);
    } catch (error) {
        console.error("Error updating account", error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('¿Estás seguro? Se eliminarán todas las transacciones asociadas a esta cuenta.')) {
        try {
            // Delete account
            const accDocRef = doc(db, 'users', currentUser.uid, 'accounts', id);
            await deleteDoc(accDocRef);
            
            // Delete associated transactions
            const relatedTx = transactions.filter(t => t.accountId === id || t.toAccountId === id);
            for (const tx of relatedTx) {
                const txDocRef = doc(db, 'users', currentUser.uid, 'transactions', tx.id);
                await deleteDoc(txDocRef);
            }

            if (selectedAccountId === id) setSelectedAccountId('');
        } catch (error) {
            console.error("Error deleting account", error);
        }
    }
  };

  const deleteTransaction = async (id: string) => {
      try {
          const txDocRef = doc(db, 'users', currentUser.uid, 'transactions', id);
          await deleteDoc(txDocRef);
      } catch (error) {
          console.error("Error deleting transaction", error);
      }
  };

  const handleReceiptScan = (data: ReceiptData) => {
    if (data.total) setAmount(data.total.toString());
    if (data.description) setDescription(data.description);
    if (data.date) setDate(data.date);
    if (data.category) {
      const matchedCat = Object.values(Category).find(c => c === data.category) || Category.Other;
      setCategory(matchedCat);
    }
    setType('expense');
    
    if (data.currency) {
        const matchAcc = accounts.find(a => a.currency === data.currency);
        if (matchAcc) setSelectedAccountId(matchAcc.id);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory(Category.Food);
    setDate(new Date().toISOString().split('T')[0]);
    setType('expense');
    setPaymentMethod('debit');
    setToAccountId('');
  };

  // -- Dashboard Calculations --
  const calculateTotalWealthInUYU = () => {
    let total = 0;
    accounts.forEach(acc => {
      // Calculate specific account balance including transfers
      const accTx = transactions.filter(t => t.accountId === acc.id || t.toAccountId === acc.id);
      
      const balance = accTx.reduce((sum, t) => {
         if (t.accountId === acc.id) {
             // Money leaving this account (Expense or Transfer Out)
             return (t.type === 'expense' || t.type === 'transfer') ? sum - t.amount : sum + t.amount;
         }
         if (t.toAccountId === acc.id && t.type === 'transfer') {
             // Money entering this account (Transfer In)
             // Handle basic currency conversion if source currency differs
             const sourceAcc = accounts.find(a => a.id === t.accountId);
             let amountToAdd = t.amount;
             
             if (sourceAcc && sourceAcc.currency !== acc.currency) {
                 const amountInUYU = convertToUYU(t.amount, sourceAcc.currency);
                 // Convert UYU to target currency
                 if (acc.currency === 'USD') amountToAdd = amountInUYU / exchangeRates.USD;
                 else if (acc.currency === 'UI') amountToAdd = amountInUYU / exchangeRates.UI;
                 else amountToAdd = amountInUYU;
             }
             return sum + amountToAdd;
         }
         return sum;
      }, acc.initialBalance);
      
      total += convertToUYU(balance, acc.currency);
    });
    return total;
  };

  const getMonthlyFlowUYU = () => {
    const now = new Date();
    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    let income = 0;
    let expense = 0;

    currentMonthTx.forEach(t => {
      // Skip transfers for flow calculation
      if (t.type === 'transfer') return;

      const currency = getAccountCurrency(t.accountId);
      const amountUYU = convertToUYU(t.amount, currency);
      if (t.type === 'income') income += amountUYU;
      if (t.type === 'expense') expense += amountUYU;
    });

    return { income, expense };
  };

  const totalWealth = calculateTotalWealthInUYU();
  const monthlyFlow = getMonthlyFlowUYU();

  // -- Views --
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Exchange Rates Banner */}
      <div className="flex flex-wrap gap-4 items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800">
        <div className="flex items-center gap-2">
            <RefreshCw size={14} />
            <span className="font-semibold">Cotizaciones Hoy:</span>
        </div>
        <div className="flex gap-4">
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm">
                <span className="text-gray-500">USD:</span>
                <input 
                    type="number" 
                    value={exchangeRates.USD}
                    onChange={(e) => setExchangeRates(prev => ({...prev, USD: parseFloat(e.target.value) || 0}))}
                    className="w-16 font-bold bg-transparent focus:outline-none border-b border-dashed border-indigo-300"
                />
            </div>
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm">
                <span className="text-gray-500">UI:</span>
                <input 
                    type="number" 
                    value={exchangeRates.UI}
                    onChange={(e) => setExchangeRates(prev => ({...prev, UI: parseFloat(e.target.value) || 0}))}
                    className="w-16 font-bold bg-transparent focus:outline-none border-b border-dashed border-indigo-300"
                />
            </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Patrimonio Total (Est. UYU)</p>
            {isLoadingData ? <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1"></div> : (
                <h3 className="text-3xl font-bold text-slate-800">${totalWealth.toLocaleString('es-UY', { maximumFractionDigits: 0 })}</h3>
            )}
          </div>
          <div className="p-3 bg-brand-50 rounded-full text-brand-600">
            <Wallet size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Ingresos (Mes)</p>
             {isLoadingData ? <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1"></div> : (
                <h3 className="text-2xl font-bold text-green-600">+${monthlyFlow.income.toLocaleString('es-UY', { maximumFractionDigits: 0 })}</h3>
             )}
          </div>
          <div className="p-3 bg-green-50 rounded-full text-green-600">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Gastos (Mes)</p>
             {isLoadingData ? <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1"></div> : (
                <h3 className="text-2xl font-bold text-red-500">-${monthlyFlow.expense.toLocaleString('es-UY', { maximumFractionDigits: 0 })}</h3>
             )}
          </div>
          <div className="p-3 bg-red-50 rounded-full text-red-500">
            <TrendingDown size={24} />
          </div>
        </div>
      </div>

      {/* Account Previews (Mini) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {accounts.slice(0, 3).map(acc => {
            // Recalculate balance for display
            const accTx = transactions.filter(t => t.accountId === acc.id || t.toAccountId === acc.id);
            const bal = accTx.reduce((sum, t) => {
                 if (t.accountId === acc.id) {
                     return (t.type === 'expense' || t.type === 'transfer') ? sum - t.amount : sum + t.amount;
                 }
                 if (t.toAccountId === acc.id && t.type === 'transfer') {
                     // Simplified view conversion for dashboard preview
                     const sourceAcc = accounts.find(a => a.id === t.accountId);
                     let amountToAdd = t.amount;
                     if (sourceAcc && sourceAcc.currency !== acc.currency) {
                         const amountInUYU = convertToUYU(t.amount, sourceAcc.currency);
                         if (acc.currency === 'USD') amountToAdd = amountInUYU / exchangeRates.USD;
                         else if (acc.currency === 'UI') amountToAdd = amountInUYU / exchangeRates.UI;
                         else amountToAdd = amountInUYU;
                     }
                     return sum + amountToAdd;
                 }
                 return sum;
             }, acc.initialBalance);

             return (
                 <div key={acc.id} onClick={() => setView('accounts')} className="cursor-pointer bg-white p-4 rounded-xl border border-gray-100 hover:border-brand-300 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${acc.currency === 'UI' ? 'bg-indigo-100 text-indigo-700' : acc.currency === 'USD' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {acc.currency}
                        </span>
                        {acc.type === 'investment' && <TrendingUp size={14} className="text-gray-400"/>}
                     </div>
                     <p className="font-semibold text-gray-700 truncate">{acc.name}</p>
                     <p className="text-lg font-bold text-slate-800">
                        {acc.currency === 'UYU' ? '$' : acc.currency === 'USD' ? 'US$' : 'UI'} {bal.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                     </p>
                 </div>
             )
         })}
         <button onClick={() => setView('accounts')} className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-colors">
             <PlusCircle size={24} className="mb-1"/>
             <span className="text-sm font-medium">Ver todas las cuentas</span>
         </button>
      </div>

      {/* Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg text-slate-800">Gastos (Global en UYU)</h3>
            <button onClick={() => setView('reports')} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Ver detalles
            </button>
          </div>
          <ExpensePieChart transactions={transactions.map(t => ({...t, amount: convertToUYU(t.amount, getAccountCurrency(t.accountId))}))} />
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg text-slate-800">Actividad Reciente</h3>
            <button onClick={() => setView('transactions')} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Ver todo
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] pr-2">
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-10">No hay movimientos aún</p>
            ) : (
              transactions.slice(0, 5).map(t => {
                const currency = getAccountCurrency(t.accountId);
                const toAccount = t.toAccountId ? accounts.find(a => a.id === t.toAccountId) : null;
                
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : t.type === 'transfer' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'}`}>
                        {t.type === 'income' ? <TrendingUp size={18} /> : t.type === 'transfer' ? <ArrowRightLeft size={18} /> : <DollarSign size={18} />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                            {t.type === 'transfer' && toAccount 
                             ? `A: ${toAccount.name}` 
                             : t.description}
                        </p>
                        <p className="text-xs text-gray-500">{t.category} • {t.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                        <span className={`font-bold block ${t.type === 'income' ? 'text-green-600' : t.type === 'transfer' ? 'text-slate-600' : 'text-slate-800'}`}>
                            {t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '-'}{currency === 'UYU' ? '$' : currency === 'USD' ? 'US$' : 'UI'} {t.amount.toFixed(2)}
                        </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="max-w-2xl mx-auto animate-in zoom-in-50 duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Nuevo Movimiento</h2>
        <p className="text-gray-500 mb-8">Registra ingresos, gastos o transferencias.</p>
        
        {type === 'expense' && (
           <ReceiptUploader onScanComplete={handleReceiptScan} />
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2">
             <button
                onClick={() => { setType('expense'); setToAccountId(''); }}
                className={`p-3 rounded-xl text-center font-medium transition-all text-sm ${type === 'expense' ? 'bg-red-50 text-red-600 ring-2 ring-red-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
             >
                Gasto
             </button>
             <button
                onClick={() => { setType('income'); setToAccountId(''); }}
                className={`p-3 rounded-xl text-center font-medium transition-all text-sm ${type === 'income' ? 'bg-green-50 text-green-600 ring-2 ring-green-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
             >
                Ingreso
             </button>
             <button
                onClick={() => setType('transfer')}
                className={`p-3 rounded-xl text-center font-medium transition-all text-sm ${type === 'transfer' ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
             >
                Transferencia
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                    {type === 'transfer' ? 'Cuenta Origen' : 'Cuenta'}
                 </label>
                 {accounts.length === 0 ? (
                     <div className="text-red-500 text-sm mb-2">Debes crear una cuenta primero.</div>
                 ) : (
                     <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                     >
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.currency})
                            </option>
                        ))}
                     </select>
                 )}
              </div>
              
              {type === 'transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta Destino</label>
                    <div className="flex items-center gap-2">
                        <ArrowRight className="text-gray-400" />
                        <select
                           value={toAccountId}
                           onChange={(e) => setToAccountId(e.target.value)}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        >
                           <option value="">Seleccionar...</option>
                           {accounts
                             .filter(acc => acc.id !== selectedAccountId)
                             .map(acc => (
                               <option key={acc.id} value={acc.id}>
                                   {acc.name} ({acc.currency})
                               </option>
                           ))}
                        </select>
                    </div>
                  </div>
              )}
          </div>
          
          {type === 'expense' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
              <div className="flex bg-gray-50 p-1 rounded-xl">
                 <button 
                   onClick={() => setPaymentMethod('cash')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === 'cash' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <Banknote size={16} /> Efectivo
                 </button>
                 <button 
                   onClick={() => setPaymentMethod('debit')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === 'debit' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <CreditCard size={16} /> Débito
                 </button>
                 <button 
                   onClick={() => setPaymentMethod('credit')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === 'credit' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <CreditCard size={16} /> Crédito
                 </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 font-bold">
                  {getAccountCurrency(selectedAccountId) === 'UYU' ? '$' : getAccountCurrency(selectedAccountId) === 'USD' ? 'US$' : 'UI'}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-lg"
              />
            </div>
            {type === 'transfer' && toAccountId && getAccountCurrency(selectedAccountId) !== getAccountCurrency(toAccountId) && (
                <p className="text-xs text-orange-500 mt-2">
                    * Nota: Se registrará el valor en la moneda de origen. Al ver el saldo en la cuenta destino, se aplicará una conversión estimada.
                </p>
            )}
          </div>

          {type !== 'transfer' && (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Compra supermercado"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {type !== 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {Object.values(Category).filter(c => c !== Category.Transfer).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
            )}
            <div className={type === 'transfer' ? 'col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              onClick={() => setView('dashboard')}
              className="flex-1 py-3 px-6 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddTransaction}
              disabled={accounts.length === 0}
              className="flex-1 py-3 px-6 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Historial de Transacciones</h2>
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
          {transactions.length} movimientos
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cuenta</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => {
                const acc = accounts.find(a => a.id === t.accountId);
                const toAcc = t.toAccountId ? accounts.find(a => a.id === t.toAccountId) : null;
                
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center gap-2">
                       <Calendar size={14} className="text-gray-400" />
                       {t.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex flex-col">
                            <span>{acc ? acc.name : 'Cuenta eliminada'}</span>
                            {t.type === 'transfer' && toAcc && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <ArrowRight size={10} /> {toAcc.name}
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                        <div className="flex flex-col">
                            <span>{t.description}</span>
                            {t.paymentMethod && t.type === 'expense' && (
                                <span className="text-[10px] text-gray-400 font-normal flex items-center gap-1 mt-0.5">
                                    {t.paymentMethod === 'cash' && <Banknote size={10} />}
                                    {t.paymentMethod === 'debit' && <CreditCard size={10} />}
                                    {t.paymentMethod === 'credit' && <CreditCard size={10} className="text-orange-400" />}
                                    {t.paymentMethod === 'cash' ? 'Efectivo' : t.paymentMethod === 'debit' ? 'Débito' : 'Crédito'}
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.type === 'transfer' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${t.type === 'income' ? 'text-green-600' : t.type === 'transfer' ? 'text-slate-600' : 'text-slate-700'}`}>
                      {t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '-'}{acc?.currency === 'UYU' ? '$' : acc?.currency === 'USD' ? 'US$' : 'UI'} {t.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button onClick={() => deleteTransaction(t.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
            })}
            {transactions.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No hay transacciones registradas
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 pb-20 md:pb-0 font-sans">
      {/* Sidebar / Desktop Nav */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:bg-white md:border-r md:border-gray-200">
        <div className="flex items-center justify-center h-20 border-b border-gray-100">
          <h1 className="text-2xl font-black bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
            GastoSmart
          </h1>
        </div>
        <div className="flex-1 flex flex-col p-4 gap-2">
          <button onClick={() => setView('dashboard')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setView('accounts')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'accounts' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            <CreditCard size={20} /> Cuentas
          </button>
          <button onClick={() => setView('add')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'add' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            <PlusCircle size={20} /> Nuevo Movimiento
          </button>
          <button onClick={() => setView('transactions')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'transactions' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            <List size={20} /> Transacciones
          </button>
          <button onClick={() => setView('reports')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'reports' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            <PieChart size={20} /> Informes
          </button>
          <button onClick={() => setView('chat')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'chat' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            <MessageSquareText size={20} /> Asistente IA
          </button>
        </div>
        <div className="p-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold shrink-0">
                    {currentUser.displayName?.charAt(0) || "U"}
                </div>
                <span className="truncate">{currentUser.displayName || "Usuario"}</span>
            </div>
            <button 
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30 flex justify-between items-center">
            <h1 className="text-xl font-black bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
            GastoSmart
          </h1>
          <button onClick={logout} className="p-2 bg-gray-100 rounded-full text-gray-600">
             <LogOut size={16} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {view === 'dashboard' && renderDashboard()}
          {view === 'accounts' && <Accounts accounts={accounts} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount} transactions={transactions} exchangeRates={exchangeRates} />}
          {view === 'add' && renderForm()}
          {view === 'transactions' && renderTransactions()}
          {/* We pass convertToUYU helper so reports can normalize data if needed, or we just pass transactions and let it calculate based on simplified assumptions for now */}
          {view === 'reports' && <Reports transactions={transactions.map(t => {
              // Normalize for reports temporarily so pie charts work with mixed currencies
              const curr = getAccountCurrency(t.accountId);
              return { ...t, amount: convertToUYU(t.amount, curr) }; 
          })} />}
          {view === 'chat' && (
             <div className="h-[calc(100vh-8rem)]">
                <ChatAssistant />
             </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 pb-safe z-50">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 text-xs ${view === 'dashboard' ? 'text-brand-600' : 'text-gray-400'}`}>
          <LayoutDashboard size={24} />
        </button>
        <button onClick={() => setView('accounts')} className={`flex flex-col items-center gap-1 text-xs ${view === 'accounts' ? 'text-brand-600' : 'text-gray-400'}`}>
          <CreditCard size={24} />
        </button>
        <button onClick={() => setView('add')} className="relative -top-8 bg-brand-600 text-white p-4 rounded-full shadow-lg shadow-brand-500/30 transform transition-transform hover:scale-110 active:scale-95">
          <PlusCircle size={28} />
        </button>
        <button onClick={() => setView('reports')} className={`flex flex-col items-center gap-1 text-xs ${view === 'reports' ? 'text-brand-600' : 'text-gray-400'}`}>
          <PieChart size={24} />
        </button>
        <button onClick={() => setView('chat')} className={`flex flex-col items-center gap-1 text-xs ${view === 'chat' ? 'text-brand-600' : 'text-gray-400'}`}>
          <MessageSquareText size={24} />
        </button>
      </div>
    </div>
  );
};

export default App;