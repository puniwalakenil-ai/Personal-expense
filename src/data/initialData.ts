import {
  Category,
  BankAccount,
  CreditCard,
  LoanEntry,
  UpiAccount,
  Transaction,
} from '../types';

/**
 * Clean Zero-Data Initial State (Requirement 1)
 * Every new user starts with ZERO data.
 * No demo data, sample transactions, default expenses, or dummy accounts.
 * Everything is created by the user manually.
 */

export const initialCategories: Category[] = [];
export const initialBankAccounts: BankAccount[] = [];
export const initialCreditCards: CreditCard[] = [];
export const initialLoans: LoanEntry[] = [];
export const initialUpiAccounts: UpiAccount[] = [];
export const initialTransactions: Transaction[] = [];
export const initialCashBalance: number = 0;

/**
 * Optional preset categories that user can optionally initialize from Settings
 */
export const defaultPersonalCategories: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'Petrol & Fuel', type: 'Expense' },
  { name: 'Food & Groceries', type: 'Expense' },
  { name: 'Dining & Cafe', type: 'Expense' },
  { name: 'Home & Utilities', type: 'Expense' },
  { name: 'Shopping & Clothes', type: 'Expense' },
  { name: 'D-Mart & Household', type: 'Expense' },
  { name: 'Travel & Commute', type: 'Expense' },
  { name: 'Health & Medical', type: 'Expense' },
  { name: 'Entertainment & OTT', type: 'Expense' },
  { name: 'Salary & Earnings', type: 'Income' },
  { name: 'Freelance & Business', type: 'Income' },
  { name: 'Investments & Returns', type: 'Income' },
  { name: 'Gifts & Cashback', type: 'Income' },
];
