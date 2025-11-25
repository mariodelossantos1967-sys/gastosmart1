export type TransactionType = 'expense' | 'income' | 'transfer';

export enum Category {
  Food = 'Alimentación',
  Transport = 'Transporte',
  Housing = 'Vivienda',
  Utilities = 'Servicios',
  Entertainment = 'Entretenimiento',
  Health = 'Salud',
  Shopping = 'Compras',
  Salary = 'Salario',
  Investment = 'Inversiones',
  Transfer = 'Transferencia',
  Other = 'Otros'
}

export type Currency = 'UYU' | 'USD' | 'UI';

export type AccountType = 'checking' | 'savings' | 'investment' | 'cash';

export type PaymentMethod = 'cash' | 'debit' | 'credit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
  icon?: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  amount: number;
  type: TransactionType;
  category: Category | string;
  description: string;
  merchant?: string;
  accountId: string; // Linked account
  toAccountId?: string; // For transfers
  paymentMethod?: PaymentMethod;
}

export interface ReceiptData {
  date?: string;
  total?: number;
  merchant?: string;
  items?: string[];
  category?: string;
  description?: string;
  currency?: Currency;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isSearch?: boolean;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export type ViewState = 'dashboard' | 'transactions' | 'add' | 'chat' | 'reports' | 'accounts';