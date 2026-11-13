import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Category,
  BankAccount,
  CreditCard,
  LoanEntry,
  UpiAccount,
  Transaction,
  NavSection,
  PageView,
  PaymentMethod,
  ExpenseItemName,
  CreditCardBillStatus,
} from '../types';
import {
  defaultPersonalCategories,
  initialCategories,
  initialBankAccounts,
  initialCreditCards,
  initialLoans,
  initialUpiAccounts,
  initialTransactions,
  initialCashBalance,
} from '../data/initialData';
import { generateId, getTodayDateString, formatCurrency, formatDate, normalizeCategoryName } from '../utils/formatters';
import { getCurrentAndUpcomingBillingDates, parseYMD } from '../utils/creditCardBilling';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

const STORAGE_KEY = 'tech_expenses_finance_v1';

export interface UpcomingBillReminder {
  cardId: string;
  cardName: string;
  cardIdentifier: string;
  outstandingAmount: number;
  statementDate?: string;
  paymentDueDate: string;
  rawStatementDate?: string;
  rawDueDate?: string;
  reminderText: string;
  isOverdue: boolean;
  daysRemaining: number;
  status?: CreditCardBillStatus;
  totalBilledAmount?: number;
  amountPaid?: number;
}

interface FinancialContextType {
  // Navigation
  pageView: PageView;
  activeSection: NavSection;
  navigateTo: (page: PageView) => void;
  goBack: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;

  // Master Data
  categories: Category[];
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  loans: LoanEntry[];
  upiAccounts: UpiAccount[];
  transactions: Transaction[];
  cashOpeningBalance: number;
  savedExpenseDetails: string[];
  addSavedExpenseDetail: (detail: string) => void;
  savedItemNames: ExpenseItemName[];
  addSavedItemName: (name: string, categoryId: string) => ExpenseItemName;
  getItemNameCategory: (name: string) => string | undefined;
  ensureDefaultExpenseCategories: () => Category[];

  // Dynamic Real-Time Calculations
  currentCashBalance: number;
  bankAccountsWithBalances: BankAccount[];
  creditCardsWithOutstanding: CreditCard[];
  totalExpenses: number;
  totalMoneyReceived: number;
  totalMoneyPaid: number;
  totalBankBalances: number;
  totalCreditCardOutstanding: number;
  totalLoansGivenPending: number;
  totalLoansTakenPending: number;
  upcomingCreditCardBills: UpcomingBillReminder[];
  categoryExpenseTotals: { categoryId: string; categoryName: string; total: number; count: number }[];

  // CRUD Actions
  addExpense: (data: {
    date: string;
    title: string;
    categoryId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    creditCardId?: string;
    upiId?: string;
    notes?: string;
  }) => Transaction;

  addMoneyReceived: (data: {
    date: string;
    title: string;
    categoryId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    upiId?: string;
    personName?: string;
    notes?: string;
  }) => Transaction;

  addMoneyPaid: (data: {
    date: string;
    title: string;
    categoryId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    creditCardId?: string;
    upiId?: string;
    personName?: string;
    notes?: string;
  }) => Transaction;

  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;

  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Soft Deletion & Dedicated Recycle Bin (Requirement 2)
  deletedTransactions: Transaction[];
  deletedBankAccounts: BankAccount[];
  softDeleteTransaction: (id: string) => void;
  restoreTransaction: (id: string) => void;
  permanentlyDeleteTransaction: (id: string) => void;
  softDeleteBankAccount: (id: string) => void;
  restoreBankAccount: (id: string) => void;
  permanentlyDeleteBankAccount: (id: string) => void;
  emptyRecycleBin: () => void;

  // Unique Save Celebration (Requirement 1)
  saveCelebration: {
    visible: boolean;
    title: string;
    subtitle?: string;
    amount?: number;
    direction?: 'Money In' | 'Money Out';
    bankName?: string;
    bankId?: string;
  } | null;
  triggerSaveCelebration: (data: {
    title?: string;
    subtitle?: string;
    amount?: number;
    direction?: 'Money In' | 'Money Out';
    bankName?: string;
    bankId?: string;
  }) => void;
  dismissSaveCelebration: () => void;

  addCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addBankAccount: (data: Omit<BankAccount, 'id' | 'createdAt' | 'currentBalance'>) => BankAccount;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;

  addCreditCard: (data: Omit<CreditCard, 'id' | 'createdAt' | 'outstandingAmount'>) => CreditCard;
  updateCreditCard: (id: string, updates: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  recordCreditCardPayment: (cardId: string, amount: number, paymentMethod: PaymentMethod, bankAccountId?: string, date?: string, notes?: string) => void;

  addLoan: (data: Omit<LoanEntry, 'id' | 'createdAt' | 'settledAmount' | 'status' | 'repayments'>) => LoanEntry;
  updateLoan: (id: string, updates: Partial<LoanEntry>) => void;
  deleteLoan: (id: string) => void;
  recordLoanRepayment: (loanId: string, amount: number, paymentMethod: PaymentMethod, bankAccountId?: string, date?: string, notes?: string) => void;

  addUpiAccount: (data: Omit<UpiAccount, 'id' | 'createdAt'>) => UpiAccount;
  updateUpiAccount: (id: string, updates: Partial<UpiAccount>) => void;
  deleteUpiAccount: (id: string) => void;

  setCashOpeningBalance: (amount: number) => void;

  // Deletion UI Flow with 3-4s Tech Expenses loading state (Requirement 18)
  deleteModalState: {
    isOpen: boolean;
    itemType: string;
    itemId: string;
    itemTitle: string;
    isDeleting: boolean;
    onConfirm: () => void;
  };
  requestDelete: (itemType: string, itemId: string, itemTitle: string, onConfirm: () => void) => void;
  confirmDelete: () => void;
  cancelDelete: () => void;

  // Save Success Feedback (Requirement 19)
  successFeedback: { visible: boolean; title: string; subtitle?: string } | null;
  showSuccessFeedback: (title: string, subtitle?: string) => void;

  // Cloud Firestore Sync State
  cloudSyncActive: boolean;
  cloudSyncError: string | null;

  // Utilities
  loadDefaultCategories: () => void;
  resetAllData: () => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isAuthorized } = useAuth();
  const [cloudSyncActive, setCloudSyncActive] = useState<boolean>(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Navigation State - Full Page views (Zero popup architecture)
  const [pageView, setPageView] = useState<PageView>({ name: 'section', section: 'Dashboard' });
  const [navigationHistory, setNavigationHistory] = useState<PageView[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Helper to deduplicate category list by normalized name and unique ID (Requirement 1)
  const deduplicateCategoryList = (raw: Category[]): {
    uniqueCategories: Category[];
    remap: Map<string, string>;
  } => {
    const uniqueCategories: Category[] = [];
    const seen = new Map<string, Category>();
    const remap = new Map<string, string>();

    raw.forEach((cat) => {
      const norm = normalizeCategoryName(cat.name);
      if (!norm) return;
      const existing = seen.get(norm);
      if (!existing) {
        seen.set(norm, cat);
        uniqueCategories.push({
          ...cat,
          name: cat.name.trim().replace(/\s+/g, ' '),
        });
      } else {
        // Map duplicate category ID to the canonical category ID
        remap.set(cat.id, existing.id);
      }
    });

    return { uniqueCategories, remap };
  };

  // Raw persisted state
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
      if (!saved) return initialCategories;
      const parsed: Category[] = JSON.parse(saved);
      const { uniqueCategories } = deduplicateCategoryList(parsed);
      return uniqueCategories;
    } catch {
      return initialCategories;
    }
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_banks`);
      return saved ? JSON.parse(saved) : initialBankAccounts;
    } catch {
      return initialBankAccounts;
    }
  });

  const [creditCards, setCreditCards] = useState<CreditCard[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_cards`);
      return saved ? JSON.parse(saved) : initialCreditCards;
    } catch {
      return initialCreditCards;
    }
  });

  const [loans, setLoans] = useState<LoanEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_loans`);
      return saved ? JSON.parse(saved) : initialLoans;
    } catch {
      return initialLoans;
    }
  });

  const [upiAccounts, setUpiAccounts] = useState<UpiAccount[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_upi`);
      return saved ? JSON.parse(saved) : initialUpiAccounts;
    } catch {
      return initialUpiAccounts;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
      return saved ? JSON.parse(saved) : initialTransactions;
    } catch {
      return initialTransactions;
    }
  });

  const [cashOpeningBalance, setCashOpeningBalanceState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_cash_opening`);
      return saved ? JSON.parse(saved) : initialCashBalance;
    } catch {
      return initialCashBalance;
    }
  });

  const [savedExpenseDetails, setSavedExpenseDetails] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_saved_details`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [savedItemNames, setSavedItemNames] = useState<ExpenseItemName[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_saved_item_names`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_saved_item_names`, JSON.stringify(savedItemNames));
    } catch (e) {
      console.error(e);
    }
  }, [savedItemNames]);

  // Data healing effect: guarantees transactions & saved names link to canonical category IDs
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
      if (saved) {
        const parsed: Category[] = JSON.parse(saved);
        const { uniqueCategories, remap } = deduplicateCategoryList(parsed);
        if (remap.size > 0 || uniqueCategories.length !== parsed.length) {
          setCategories(uniqueCategories);
          setTransactions((prev) =>
            prev.map((t) => {
              if (t.categoryId && remap.has(t.categoryId)) {
                const canonicalId = remap.get(t.categoryId)!;
                const cat = uniqueCategories.find((c) => c.id === canonicalId);
                return {
                  ...t,
                  categoryId: canonicalId,
                  categoryName: cat?.name || t.categoryName,
                };
              }
              return t;
            })
          );
          setSavedItemNames((prev) =>
            prev.map((item) => {
              if (item.categoryId && remap.has(item.categoryId)) {
                const canonicalId = remap.get(item.categoryId)!;
                const cat = uniqueCategories.find((c) => c.id === canonicalId);
                return {
                  ...item,
                  categoryId: canonicalId,
                  categoryName: cat?.name || item.categoryName,
                };
              }
              return item;
            })
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const ensureDefaultExpenseCategories = (): Category[] => {
    const existingNorms = new Set(categories.map((c) => normalizeCategoryName(c.name)));
    const defaultsToAdd: Category[] = [];

    const defaultList = [
      { name: 'Home & Expenses', type: 'Expense' as const, color: '#4f46e5' },
      { name: 'Food & Dining', type: 'Expense' as const, color: '#10b981' },
      { name: 'Petrol & Fuel', type: 'Expense' as const, color: '#f59e0b' },
      { name: 'Shopping & Household', type: 'Expense' as const, color: '#ec4899' },
      { name: 'Bills & Utilities', type: 'Expense' as const, color: '#06b6d4' },
      { name: 'Travel & Transport', type: 'Expense' as const, color: '#8b5cf6' },
      { name: 'Health & Medical', type: 'Expense' as const, color: '#ef4444' },
    ];

    for (const def of defaultList) {
      const norm = normalizeCategoryName(def.name);
      if (!existingNorms.has(norm)) {
        const newCat: Category = {
          id: generateId('cat'),
          name: def.name,
          type: def.type,
          color: def.color,
          createdAt: new Date().toISOString(),
        };
        defaultsToAdd.push(newCat);
        existingNorms.add(norm);
        persistDoc('categories', newCat.id, newCat);
      }
    }

    if (defaultsToAdd.length > 0) {
      const updated = [...categories, ...defaultsToAdd];
      setCategories(updated);
      try {
        localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(updated));
      } catch {}
      return updated;
    }
    return categories;
  };

  const addSavedItemName = (name: string, categoryId: string): ExpenseItemName => {
    const trimmed = name.trim();
    const cat = categories.find((c) => c.id === categoryId);
    const existingIndex = savedItemNames.findIndex((item) => item.name.toLowerCase() === trimmed.toLowerCase());

    let result: ExpenseItemName;
    if (existingIndex >= 0) {
      result = {
        ...savedItemNames[existingIndex],
        categoryId,
        categoryName: cat?.name || savedItemNames[existingIndex].categoryName,
      };
      setSavedItemNames((prev) => {
        const next = [...prev];
        next[existingIndex] = result;
        return next;
      });
    } else {
      result = {
        id: generateId('item'),
        name: trimmed,
        categoryId,
        categoryName: cat?.name,
        createdAt: new Date().toISOString(),
      };
      setSavedItemNames((prev) => [result, ...prev]);
    }

    persistDoc('savedItemNames', result.id, result);
    addSavedExpenseDetail(trimmed);
    showSuccessFeedback('Successfully Created', `Saved "${trimmed}" with category`);
    return result;
  };

  const getItemNameCategory = (name: string): string | undefined => {
    const trimmed = name.trim().toLowerCase();
    const item = savedItemNames.find((i) => i.name.toLowerCase() === trimmed);
    return item?.categoryId;
  };

  const addSavedExpenseDetail = (detail: string) => {
    const trimmed = detail.trim();
    if (!trimmed) return;
    setSavedExpenseDetails((prev) => {
      if (prev.some((d) => d.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [trimmed, ...prev];
      try {
        localStorage.setItem(`${STORAGE_KEY}_saved_details`, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Success Feedback state (Requirement 19)
  const [successFeedback, setSuccessFeedback] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Delete modal & 3-4s animation state (Requirement 18)
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    itemType: string;
    itemId: string;
    itemTitle: string;
    isDeleting: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    itemType: '',
    itemId: '',
    itemTitle: '',
    isDeleting: false,
    onConfirm: () => {},
  });

  // Persist whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_banks`, JSON.stringify(bankAccounts));
    } catch (e) {
      console.error(e);
    }
  }, [bankAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(creditCards));
    } catch (e) {
      console.error(e);
    }
  }, [creditCards]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_loans`, JSON.stringify(loans));
    } catch (e) {
      console.error(e);
    }
  }, [loans]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_upi`, JSON.stringify(upiAccounts));
    } catch (e) {
      console.error(e);
    }
  }, [upiAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
    } catch (e) {
      console.error(e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_cash_opening`, JSON.stringify(cashOpeningBalance));
    } catch (e) {
      console.error(e);
    }
  }, [cashOpeningBalance]);

  // Helper to remove undefined fields recursively so Firestore setDoc never fails
  const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): T => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => (item && typeof item === 'object' ? sanitizeForFirestore(item) : item)) as unknown as T;
    }
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !(value instanceof Date)) {
          clean[key] = sanitizeForFirestore(value);
        } else {
          clean[key] = value;
        }
      }
    }
    return clean as T;
  };

  // Helper to persist document mutations to private Cloud Firestore vault
  const persistDoc = async <T extends Record<string, any>>(
    subcollection: string,
    docId: string,
    data: T,
    isMerge: boolean = false
  ) => {
    if (!isAuthorized || !currentUser?.uid) return;
    const cleanData = sanitizeForFirestore(data);
    const path = `users/${currentUser.uid}/${subcollection}/${docId}`;
    try {
      await setDoc(doc(db, 'users', currentUser.uid, subcollection, docId), cleanData, { merge: isMerge });
    } catch (error) {
      handleFirestoreError(error, isMerge ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const deleteFirestoreDoc = async (subcollection: string, docId: string) => {
    if (!isAuthorized || !currentUser?.uid) return;
    const path = `users/${currentUser.uid}/${subcollection}/${docId}`;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, subcollection, docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Real-time Firestore synchronization & safe initial migration
  useEffect(() => {
    if (!isAuthorized || !currentUser?.uid) {
      setCloudSyncActive(false);
      return;
    }

    const userId = currentUser.uid;
    let isMounted = true;

    const initializeCloudData = async () => {
      try {
        setCloudSyncActive(true);
        setCloudSyncError(null);

        // 1. Proactively and independently fetch categories from Cloud Firestore
        const catsRef = collection(db, 'users', userId, 'categories');
        const catsSnap = await getDocs(catsRef);

        if (!catsSnap.empty) {
          const cloudCats: Category[] = [];
          catsSnap.docs.forEach((d) => {
            const data = d.data() as any;
            cloudCats.push({
              id: d.id || data.id,
              name: (data.name || '').trim().replace(/\s+/g, ' '),
              type: data.type || 'Expense',
              color: data.color || '#4f46e5',
              icon: data.icon,
              createdAt: data.createdAt || new Date().toISOString(),
              ...data,
            } as Category);
          });
          const { uniqueCategories } = deduplicateCategoryList(cloudCats);
          if (uniqueCategories.length > 0) {
            setCategories(uniqueCategories);
            try {
              localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(uniqueCategories));
            } catch {}
          }
        } else {
          // If Firestore categories collection is empty:
          // Check if local storage or memory has categories; otherwise seed baseline default categories
          let catsToSeed: Category[] = [];
          if (categories.length > 0) {
            catsToSeed = categories;
          } else {
            const baseline = [
              { name: 'Home & Expenses', type: 'Expense' as const, color: '#4f46e5' },
              { name: 'Food & Dining', type: 'Expense' as const, color: '#10b981' },
              { name: 'Petrol & Fuel', type: 'Expense' as const, color: '#f59e0b' },
              { name: 'Shopping & Household', type: 'Expense' as const, color: '#ec4899' },
              { name: 'Bills & Utilities', type: 'Expense' as const, color: '#06b6d4' },
              { name: 'Travel & Transport', type: 'Expense' as const, color: '#8b5cf6' },
              { name: 'Health & Medical', type: 'Expense' as const, color: '#ef4444' },
              { name: 'Entertainment & OTT', type: 'Expense' as const, color: '#d946ef' },
              { name: 'Salary & Earnings', type: 'Income' as const, color: '#059669' },
              { name: 'Freelance & Business', type: 'Income' as const, color: '#2563eb' },
              { name: 'Investments & Returns', type: 'Income' as const, color: '#16a34a' },
              { name: 'Gifts & Cashback', type: 'Income' as const, color: '#eab308' },
            ];
            catsToSeed = baseline.map((b) => ({
              id: generateId('cat'),
              name: b.name,
              type: b.type,
              color: b.color,
              createdAt: new Date().toISOString(),
            }));
          }

          const catBatch = writeBatch(db);
          catsToSeed.forEach((c) => {
            catBatch.set(doc(db, 'users', userId, 'categories', c.id), sanitizeForFirestore(c));
          });
          await catBatch.commit();
          setCategories(catsToSeed);
          try {
            localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(catsToSeed));
          } catch {}
        }

        // 2. Check bank accounts and migrate local records if cloud vault is empty
        const banksRef = collection(db, 'users', userId, 'bankAccounts');
        const snap = await getDocs(banksRef);

        if (snap.empty && bankAccounts.length > 0) {
          console.log('Migrating active local accounts and transactions to Cloud Firestore...');
          const batch = writeBatch(db);

          bankAccounts.forEach((b) => {
            batch.set(doc(db, 'users', userId, 'bankAccounts', b.id), sanitizeForFirestore(b));
          });
          transactions.forEach((t) => {
            batch.set(doc(db, 'users', userId, 'transactions', t.id), sanitizeForFirestore(t));
          });
          creditCards.forEach((c) => {
            batch.set(doc(db, 'users', userId, 'creditCards', c.id), sanitizeForFirestore(c));
          });
          loans.forEach((l) => {
            batch.set(doc(db, 'users', userId, 'loans', l.id), sanitizeForFirestore(l));
          });
          upiAccounts.forEach((u) => {
            batch.set(doc(db, 'users', userId, 'upiAccounts', u.id), sanitizeForFirestore(u));
          });
          savedItemNames.forEach((item) => {
            batch.set(doc(db, 'users', userId, 'savedItemNames', item.id), sanitizeForFirestore(item));
          });
          batch.set(doc(db, 'users', userId, 'meta', 'settings'), sanitizeForFirestore({
            cashOpeningBalance,
            savedExpenseDetails,
            updatedAt: new Date().toISOString(),
          }));

          await batch.commit();
        }
      } catch (err) {
        console.error('Cloud initialization / migration error:', err);
        setCloudSyncError('Could not sync with Firestore. Offline mode active.');
      }
    };

    initializeCloudData();

    // Setup real-time snapshot listeners for multi-device sync (iPhone and Laptop)
    const unsubBanks = onSnapshot(
      collection(db, 'users', userId, 'bankAccounts'),
      (snapshot) => {
        if (!isMounted) return;
        const items: BankAccount[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as BankAccount));
        if (items.length > 0) {
          setBankAccounts(items);
          try { localStorage.setItem(`${STORAGE_KEY}_banks`, JSON.stringify(items)); } catch {}
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/bankAccounts`)
    );

    const unsubTx = onSnapshot(
      collection(db, 'users', userId, 'transactions'),
      (snapshot) => {
        if (!isMounted) return;
        const items: Transaction[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Transaction));
        if (items.length > 0) {
          items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
          setTransactions(items);
          try { localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(items)); } catch {}
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/transactions`)
    );

    const unsubCats = onSnapshot(
      collection(db, 'users', userId, 'categories'),
      (snapshot) => {
        if (!isMounted) return;
        const items: Category[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          items.push({
            id: d.id || data.id,
            name: (data.name || '').trim().replace(/\s+/g, ' '),
            type: data.type || 'Expense',
            color: data.color || '#4f46e5',
            icon: data.icon,
            createdAt: data.createdAt || new Date().toISOString(),
            ...data,
          } as Category);
        });

        const { uniqueCategories } = deduplicateCategoryList(items);
        if (uniqueCategories.length > 0) {
          setCategories(uniqueCategories);
          try { localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(uniqueCategories)); } catch {}
        } else if (snapshot.empty) {
          setCategories([]);
          try { localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify([])); } catch {}
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/categories`)
    );

    const unsubCards = onSnapshot(
      collection(db, 'users', userId, 'creditCards'),
      (snapshot) => {
        if (!isMounted) return;
        const items: CreditCard[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as CreditCard));
        if (items.length > 0) {
          setCreditCards(items);
          try { localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(items)); } catch {}
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/creditCards`)
    );

    const unsubLoans = onSnapshot(
      collection(db, 'users', userId, 'loans'),
      (snapshot) => {
        if (!isMounted) return;
        const items: LoanEntry[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as LoanEntry));
        if (items.length > 0) {
          setLoans(items);
          try { localStorage.setItem(`${STORAGE_KEY}_loans`, JSON.stringify(items)); } catch {}
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/loans`)
    );

    const unsubUpi = onSnapshot(
      collection(db, 'users', userId, 'upiAccounts'),
      (snapshot) => {
        if (!isMounted) return;
        const items: UpiAccount[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as UpiAccount));
        if (items.length > 0) {
          setUpiAccounts(items);
          try { localStorage.setItem(`${STORAGE_KEY}_upi`, JSON.stringify(items)); } catch {}
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/upiAccounts`)
    );

    const unsubItems = onSnapshot(
      collection(db, 'users', userId, 'savedItemNames'),
      (snapshot) => {
        if (!isMounted) return;
        const items: ExpenseItemName[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ExpenseItemName));
        if (items.length > 0) {
          setSavedItemNames(items);
          try { localStorage.setItem(`${STORAGE_KEY}_saved_item_names`, JSON.stringify(items)); } catch {}
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/savedItemNames`)
    );

    const unsubMeta = onSnapshot(
      doc(db, 'users', userId, 'meta', 'settings'),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.cashOpeningBalance === 'number') {
            setCashOpeningBalanceState(data.cashOpeningBalance);
          }
          if (Array.isArray(data.savedExpenseDetails)) {
            setSavedExpenseDetails(data.savedExpenseDetails);
          }
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/meta/settings`)
    );

    return () => {
      isMounted = false;
      unsubBanks();
      unsubTx();
      unsubCats();
      unsubCards();
      unsubLoans();
      unsubUpi();
      unsubItems();
      unsubMeta();
    };
  }, [isAuthorized, currentUser?.uid]);

  // Success Feedback Helper
  const showSuccessFeedback = (title: string, subtitle?: string) => {
    setSuccessFeedback({ visible: true, title, subtitle });
    setTimeout(() => {
      setSuccessFeedback(null);
    }, 2800);
  };

  // Navigation handlers
  const navigateTo = (nextPage: PageView) => {
    setNavigationHistory((prev) => [...prev, pageView]);
    setPageView(nextPage);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (pageView.name !== 'section' && (pageView as any).returnTo) {
      setPageView((pageView as any).returnTo);
      return;
    }
    if (navigationHistory.length > 0) {
      const prev = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((h) => h.slice(0, -1));
      setPageView(prev);
    } else {
      setPageView({ name: 'section', section: 'Dashboard' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeSection: NavSection = useMemo(() => {
    if (pageView.name === 'section') return pageView.section;
    if (pageView.name.startsWith('expense')) return 'Expenses';
    if (pageView.name.startsWith('money-received')) return 'Money Received';
    if (pageView.name.startsWith('money-paid')) return 'Money Paid';
    if (pageView.name.startsWith('bank')) return 'Bank Accounts';
    if (pageView.name.startsWith('credit-card')) return 'Credit Cards';
    if (pageView.name.startsWith('loan')) return 'Loans & Advances';
    if (pageView.name.startsWith('category')) return 'Categories';
    if (pageView.name.startsWith('upi')) return 'UPI';
    if (pageView.name.startsWith('entry')) return 'Entries';
    return 'Dashboard';
  }, [pageView]);

  // Active vs Soft-Deleted records separation (Requirement 2 & 8)
  const activeTransactions = useMemo(
    () => transactions.filter((t) => !t.isDeleted),
    [transactions]
  );
  const deletedTransactions = useMemo(
    () => transactions.filter((t) => !!t.isDeleted),
    [transactions]
  );

  const activeBankAccounts = useMemo(
    () => bankAccounts.filter((b) => !b.isDeleted),
    [bankAccounts]
  );
  const deletedBankAccounts = useMemo(
    () => bankAccounts.filter((b) => !!b.isDeleted),
    [bankAccounts]
  );

  // Dynamic Bank Balances
  const bankAccountsWithBalances = useMemo(() => {
    return activeBankAccounts.map((bank) => {
      let balance = Number(bank.openingBalance) || 0;

      activeTransactions.forEach((txn) => {
        if (txn.bankAccountId === bank.id) {
          if (txn.type === 'Money Received' || txn.type === 'Loan Taken') {
            balance += txn.amount;
          } else if (
            txn.type === 'Expense' ||
            txn.type === 'Money Paid' ||
            txn.type === 'Credit Card Payment' ||
            txn.type === 'Loan Given'
          ) {
            balance -= txn.amount;
          }
        }
      });

      // Also check loan repayments received into this bank
      loans.forEach((loan) => {
        if (loan.repayments) {
          loan.repayments.forEach((rep) => {
            if (rep.bankAccountId === bank.id) {
              if (loan.loanType === 'Money Given') {
                // They repaid us -> Inflow
                balance += rep.amount;
              } else if (loan.loanType === 'Money Taken') {
                // We repaid them -> Outflow
                balance -= rep.amount;
              }
            }
          });
        }
      });

      return {
        ...bank,
        currentBalance: balance,
      };
    });
  }, [activeBankAccounts, activeTransactions, loans]);

  // Dynamic Cash Balance
  const currentCashBalance = useMemo(() => {
    let balance = Number(cashOpeningBalance) || 0;

    activeTransactions.forEach((txn) => {
      if (txn.paymentMethod === 'Cash') {
        if (txn.type === 'Money Received' || txn.type === 'Loan Taken') {
          balance += txn.amount;
        } else if (
          txn.type === 'Expense' ||
          txn.type === 'Money Paid' ||
          txn.type === 'Credit Card Payment' ||
          txn.type === 'Loan Given'
        ) {
          balance -= txn.amount;
        }
      }
    });

    // Check loan repayments made in cash
    loans.forEach((loan) => {
      if (loan.repayments) {
        loan.repayments.forEach((rep) => {
          if (rep.paymentMethod === 'Cash') {
            if (loan.loanType === 'Money Given') {
              // Cash received from borrower
              balance += rep.amount;
            } else if (loan.loanType === 'Money Taken') {
              // Cash paid to lender
              balance -= rep.amount;
            }
          }
        });
      }
    });

    return balance;
  }, [cashOpeningBalance, activeTransactions, loans]);

  // Dynamic Credit Card Outstanding & Automatic Billing Dates
  const creditCardsWithOutstanding = useMemo(() => {
    return creditCards.map((card) => {
      let outstanding = 0;

      activeTransactions.forEach((txn) => {
        if (txn.creditCardId === card.id) {
          if (txn.type === 'Expense' || txn.type === 'Money Paid') {
            outstanding += txn.amount;
          } else if (txn.type === 'Credit Card Payment' || txn.type === 'Money Received') {
            outstanding -= txn.amount;
          }
        }
      });

      const bDay = card.billingDate || 15;
      const dDays = card.dueDays || 20;
      const { currentStatementDate, currentDueDate } = getCurrentAndUpcomingBillingDates(bDay, dDays);

      return {
        ...card,
        billingDate: bDay,
        dueDays: dDays,
        billingStatementDate: currentStatementDate,
        paymentDueDate: currentDueDate,
        outstandingAmount: Math.max(0, outstanding),
      };
    });
  }, [creditCards, activeTransactions]);

  // Aggregates (using only active non-deleted transactions)
  const totalExpenses = useMemo(() => {
    return activeTransactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [activeTransactions]);

  const totalMoneyReceived = useMemo(() => {
    return activeTransactions
      .filter((t) => t.type === 'Money Received')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [activeTransactions]);

  const totalMoneyPaid = useMemo(() => {
    return activeTransactions
      .filter((t) => t.type === 'Money Paid')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [activeTransactions]);

  const totalBankBalances = useMemo(() => {
    return bankAccountsWithBalances.reduce((sum, b) => sum + b.currentBalance, 0);
  }, [bankAccountsWithBalances]);

  const totalCreditCardOutstanding = useMemo(() => {
    return creditCardsWithOutstanding.reduce((sum, c) => sum + c.outstandingAmount, 0);
  }, [creditCardsWithOutstanding]);

  // Loans: Money Given (Who owes me) vs Money Taken (Whom I owe)
  const totalLoansGivenPending = useMemo(() => {
    return loans
      .filter((l) => l.loanType === 'Money Given' || l.loanType === 'Loan & Advance')
      .reduce((sum, l) => sum + Math.max(0, l.originalAmount - (l.settledAmount || 0)), 0);
  }, [loans]);

  const totalLoansTakenPending = useMemo(() => {
    return loans
      .filter((l) => l.loanType === 'Money Taken' || l.loanType === 'Secured Loan' || l.loanType === 'Unsecured Loan')
      .reduce((sum, l) => sum + Math.max(0, l.originalAmount - (l.settledAmount || 0)), 0);
  }, [loans]);

  // Upcoming Credit Card Bills & Pending Notifications (Requirement 1 & 2)
  // Fully paid bills automatically disappear from pending notifications.
  // Partially paid and unpaid bills remain visible.
  const upcomingCreditCardBills = useMemo(() => {
    const list: UpcomingBillReminder[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    creditCardsWithOutstanding.forEach((card) => {
      if (card.outstandingAmount > 0) {
        const bDay = card.billingDate || 15;
        const dDays = card.dueDays || 20;
        const { currentStatementDate, currentDueDate } = getCurrentAndUpcomingBillingDates(bDay, dDays, today);

        const dueObj = parseYMD(currentDueDate);
        const diffTime = dueObj.getTime() - today.getTime();
        const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0;

        // Calculate card's total debits (spends) and total credits (payments)
        const cardTxns = activeTransactions.filter((t) => t.creditCardId === card.id);
        const totalDebits = cardTxns
          .filter((t) => t.type === 'Expense' || t.type === 'Money Paid')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const totalCredits = cardTxns
          .filter((t) => t.type === 'Credit Card Payment' || t.type === 'Money Received')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        let status: CreditCardBillStatus = 'Unpaid';
        if (card.outstandingAmount <= 0) {
          status = 'Paid';
        } else if (totalCredits > 0 && card.outstandingAmount < totalDebits) {
          status = 'Partially Paid';
        } else {
          status = 'Unpaid';
        }

        const reminderText = `Your credit card payment of ${formatCurrency(
          card.outstandingAmount
        )} for ${card.cardName} is due on ${formatDate(currentDueDate)}.`;

        list.push({
          cardId: card.id,
          cardName: card.cardName,
          cardIdentifier: card.cardIdentifier,
          outstandingAmount: card.outstandingAmount,
          statementDate: formatDate(currentStatementDate),
          paymentDueDate: formatDate(currentDueDate),
          rawStatementDate: currentStatementDate,
          rawDueDate: currentDueDate,
          reminderText,
          isOverdue,
          daysRemaining,
          status,
          totalBilledAmount: Math.max(totalDebits, card.outstandingAmount),
          amountPaid: totalCredits,
        });
      }
    });

    return list;
  }, [creditCardsWithOutstanding, activeTransactions]);

  // Category expense breakdown (Requirement 1: All transactions assigned to the same category must be grouped under that single category)
  const categoryExpenseTotals = useMemo(() => {
    const map = new Map<string, { categoryId: string; categoryName: string; total: number; count: number }>();

    activeTransactions
      .filter((t) => t.type === 'Expense')
      .forEach((t) => {
        // Resolve canonical category by ID first, then by normalized name
        let matchedCat = categories.find((c) => c.id === t.categoryId);
        if (!matchedCat && t.categoryName) {
          const norm = normalizeCategoryName(t.categoryName);
          matchedCat = categories.find((c) => normalizeCategoryName(c.name) === norm);
        }

        const catId = matchedCat ? matchedCat.id : (t.categoryId || 'uncategorized');
        const catName = matchedCat ? matchedCat.name : (t.categoryName || 'Uncategorized');

        const current = map.get(catId) || { categoryId: catId, categoryName: catName, total: 0, count: 0 };
        current.total += Number(t.amount) || 0;
        current.count += 1;
        map.set(catId, current);
      });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activeTransactions, categories]);

  // CRUD Actions
  const addExpense = (data: {
    date: string;
    title: string;
    categoryId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    creditCardId?: string;
    upiId?: string;
    notes?: string;
  }): Transaction => {
    const category = categories.find((c) => c.id === data.categoryId);
    const bank = bankAccounts.find((b) => b.id === data.bankAccountId);
    const card = creditCards.find((c) => c.id === data.creditCardId);

    const newTxn: Transaction = {
      id: generateId('exp'),
      date: data.date || getTodayDateString(),
      type: 'Expense',
      title: data.title.trim(),
      categoryId: data.categoryId,
      categoryName: category?.name || 'General Expense',
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod,
      bankAccountId: data.paymentMethod === 'Bank Account' || data.paymentMethod === 'UPI' ? data.bankAccountId : undefined,
      bankAccountName: bank?.bankName,
      creditCardId: data.paymentMethod === 'Credit Card' ? data.creditCardId : undefined,
      creditCardName: card?.cardName,
      upiId: data.upiId,
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTxn, ...prev]);
    persistDoc('transactions', newTxn.id, newTxn);
    addSavedExpenseDetail(data.title);
    showSuccessFeedback('Successfully Created', 'Expense entry saved');
    return newTxn;
  };

  const addMoneyReceived = (data: {
    date: string;
    title: string;
    categoryId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    upiId?: string;
    personName?: string;
    notes?: string;
  }): Transaction => {
    const category = categories.find((c) => c.id === data.categoryId);
    const bank = bankAccounts.find((b) => b.id === data.bankAccountId);

    const newTxn: Transaction = {
      id: generateId('rec'),
      date: data.date || getTodayDateString(),
      type: 'Money Received',
      title: data.title.trim(),
      categoryId: data.categoryId,
      categoryName: category?.name,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod,
      bankAccountId: data.paymentMethod === 'Bank Account' || data.paymentMethod === 'UPI' ? data.bankAccountId : undefined,
      bankAccountName: bank?.bankName,
      upiId: data.upiId,
      personName: data.personName?.trim(),
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTxn, ...prev]);
    persistDoc('transactions', newTxn.id, newTxn);
    showSuccessFeedback('Successfully Saved', 'Money received recorded');
    return newTxn;
  };

  const addMoneyPaid = (data: {
    date: string;
    title: string;
    categoryId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    creditCardId?: string;
    upiId?: string;
    personName?: string;
    notes?: string;
  }): Transaction => {
    const category = categories.find((c) => c.id === data.categoryId);
    const bank = bankAccounts.find((b) => b.id === data.bankAccountId);
    const card = creditCards.find((c) => c.id === data.creditCardId);

    const newTxn: Transaction = {
      id: generateId('paid'),
      date: data.date || getTodayDateString(),
      type: 'Money Paid',
      title: data.title.trim(),
      categoryId: data.categoryId,
      categoryName: category?.name,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod,
      bankAccountId: data.paymentMethod === 'Bank Account' || data.paymentMethod === 'UPI' ? data.bankAccountId : undefined,
      bankAccountName: bank?.bankName,
      creditCardId: data.paymentMethod === 'Credit Card' ? data.creditCardId : undefined,
      creditCardName: card?.cardName,
      upiId: data.upiId,
      personName: data.personName?.trim(),
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTxn, ...prev]);
    persistDoc('transactions', newTxn.id, newTxn);
    showSuccessFeedback('Successfully Saved', 'Money paid entry recorded');
    return newTxn;
  };

  const addTransaction = (data: Omit<Transaction, 'id' | 'createdAt'>): Transaction => {
    const category = data.categoryId ? categories.find((c) => c.id === data.categoryId) : undefined;
    const bank = data.bankAccountId ? bankAccounts.find((b) => b.id === data.bankAccountId) : undefined;
    const card = data.creditCardId ? creditCards.find((c) => c.id === data.creditCardId) : undefined;

    const newTxn: Transaction = {
      ...data,
      id: generateId(data.type === 'Money Received' ? 'rec' : 'exp'),
      date: data.date || getTodayDateString(),
      title: data.title.trim(),
      categoryName: data.categoryName || category?.name || (data.type === 'Expense' ? 'General Expense' : undefined),
      bankAccountName: data.bankAccountName || bank?.bankName,
      creditCardName: data.creditCardName || card?.cardName,
      amount: Number(data.amount),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTxn, ...prev]);
    persistDoc('transactions', newTxn.id, newTxn);
    if (data.title) {
      addSavedExpenseDetail(data.title);
    }
    showSuccessFeedback('Successfully Saved', 'Transaction entry recorded');
    return newTxn;
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const category = updates.categoryId ? categories.find((c) => c.id === updates.categoryId) : undefined;
        const bank = updates.bankAccountId ? bankAccounts.find((b) => b.id === updates.bankAccountId) : undefined;
        const card = updates.creditCardId ? creditCards.find((c) => c.id === updates.creditCardId) : undefined;
        return {
          ...t,
          ...updates,
          categoryName: category ? category.name : t.categoryName,
          bankAccountName: bank ? bank.bankName : t.bankAccountName,
          creditCardName: card ? card.cardName : t.creditCardName,
        };
      })
    );
    persistDoc('transactions', id, updates, true);
    showSuccessFeedback('Successfully Updated', 'Transaction updated');
  };

  // Requirement 2: Soft Deletion and Dedicated Recycle Bin
  const softDeleteTransaction = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() } : t))
    );
    persistDoc('transactions', id, { isDeleted: true, deletedAt: new Date().toISOString() }, true);
    showSuccessFeedback('Moved to Recycle Bin', 'Transaction can be restored anytime');
  };

  const restoreTransaction = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDeleted: false, deletedAt: undefined } : t))
    );
    persistDoc('transactions', id, { isDeleted: false, deletedAt: null }, true);
    showSuccessFeedback('Restored Successfully', 'Transaction restored to active passbook');
  };

  const permanentlyDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    deleteFirestoreDoc('transactions', id);
    showSuccessFeedback('Permanently Deleted', 'Transaction purged from Recycle Bin');
  };

  const deleteTransaction = (id: string) => {
    softDeleteTransaction(id);
  };

  const addCategory = (data: Omit<Category, 'id' | 'createdAt'>): Category => {
    const trimmedName = data.name.trim().replace(/\s+/g, ' ');
    const norm = normalizeCategoryName(trimmedName);
    if (!norm) {
      throw new Error('Category name cannot be empty');
    }

    // Requirement 1: Prevent duplicate category creation, including differences caused by capitalization or accidental spaces.
    // Reuse existing categories instead of creating duplicates.
    const existing = categories.find((c) => normalizeCategoryName(c.name) === norm);
    if (existing) {
      showSuccessFeedback('Successfully Saved', `Using existing category "${existing.name}"`);
      return existing;
    }

    const newCat: Category = {
      id: generateId('cat'),
      name: trimmedName,
      type: data.type || 'Expense',
      color: data.color || '#4f46e5',
      icon: data.icon,
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
    persistDoc('categories', newCat.id, newCat);
    showSuccessFeedback('Successfully Created', `Category "${newCat.name}" created`);
    return newCat;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    if (updates.name) {
      const trimmedName = updates.name.trim().replace(/\s+/g, ' ');
      const norm = normalizeCategoryName(trimmedName);
      // Check if another category already has this name
      const duplicate = categories.find((c) => c.id !== id && normalizeCategoryName(c.name) === norm);
      if (duplicate) {
        // Merge with existing category
        setTransactions((prev) =>
          prev.map((t) => (t.categoryId === id ? { ...t, categoryId: duplicate.id, categoryName: duplicate.name } : t))
        );
        setSavedItemNames((prev) =>
          prev.map((item) => (item.categoryId === id ? { ...item, categoryId: duplicate.id, categoryName: duplicate.name } : item))
        );
        setCategories((prev) => prev.filter((c) => c.id !== id));
        deleteFirestoreDoc('categories', id);
        showSuccessFeedback('Successfully Updated', `Merged into existing "${duplicate.name}"`);
        return;
      }
      updates.name = trimmedName;
    }

    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    persistDoc('categories', id, updates, true);
    if (updates.name) {
      setTransactions((prev) =>
        prev.map((t) => (t.categoryId === id ? { ...t, categoryName: updates.name } : t))
      );
    }
    showSuccessFeedback('Successfully Updated', 'Category updated');
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    deleteFirestoreDoc('categories', id);
  };

  const addBankAccount = (data: Omit<BankAccount, 'id' | 'createdAt' | 'currentBalance'>): BankAccount => {
    const newBank: BankAccount = {
      id: generateId('bank'),
      bankName: data.bankName.trim(),
      accountNumber: data.accountNumber.trim(),
      accountType: data.accountType,
      openingBalance: Number(data.openingBalance) || 0,
      currentBalance: Number(data.openingBalance) || 0,
      ifscCode: data.ifscCode?.trim(),
      upiId: data.upiId?.trim(),
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    setBankAccounts((prev) => [...prev, newBank]);
    persistDoc('bankAccounts', newBank.id, newBank);
    showSuccessFeedback('Successfully Created', `Bank Account "${newBank.bankName}" added`);
    return newBank;
  };

  const updateBankAccount = (id: string, updates: Partial<BankAccount>) => {
    setBankAccounts((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    persistDoc('bankAccounts', id, updates, true);
    showSuccessFeedback('Successfully Updated', 'Bank account updated');
  };

  const softDeleteBankAccount = (id: string) => {
    setBankAccounts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isDeleted: true, deletedAt: new Date().toISOString() } : b))
    );
    persistDoc('bankAccounts', id, { isDeleted: true, deletedAt: new Date().toISOString() }, true);
    showSuccessFeedback('Moved to Recycle Bin', 'Bank account can be restored from Recycle Bin');
  };

  const restoreBankAccount = (id: string) => {
    setBankAccounts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isDeleted: false, deletedAt: undefined } : b))
    );
    persistDoc('bankAccounts', id, { isDeleted: false, deletedAt: null }, true);
    showSuccessFeedback('Restored Successfully', 'Bank account restored to active accounts');
  };

  const permanentlyDeleteBankAccount = (id: string) => {
    setBankAccounts((prev) => prev.filter((b) => b.id !== id));
    deleteFirestoreDoc('bankAccounts', id);
    showSuccessFeedback('Permanently Deleted', 'Bank account purged from Recycle Bin');
  };

  const emptyRecycleBin = () => {
    deletedTransactions.forEach((t) => deleteFirestoreDoc('transactions', t.id));
    deletedBankAccounts.forEach((b) => deleteFirestoreDoc('bankAccounts', b.id));
    setTransactions((prev) => prev.filter((t) => !t.isDeleted));
    setBankAccounts((prev) => prev.filter((b) => !b.isDeleted));
    showSuccessFeedback('Recycle Bin Emptied', 'All deleted records permanently purged');
  };

  const deleteBankAccount = (id: string) => {
    softDeleteBankAccount(id);
  };

  const addCreditCard = (data: Omit<CreditCard, 'id' | 'createdAt' | 'outstandingAmount'>): CreditCard => {
    const newCard: CreditCard = {
      id: generateId('card'),
      cardName: data.cardName.trim(),
      cardIdentifier: data.cardIdentifier.trim(),
      creditLimit: Number(data.creditLimit) || 0,
      billingDate: Number(data.billingDate) || 15,
      dueDays: Number(data.dueDays) || 20,
      billingStatementDate: data.billingStatementDate?.trim() || undefined,
      paymentDueDate: data.paymentDueDate.trim(),
      outstandingAmount: 0,
      createdAt: new Date().toISOString(),
    };
    setCreditCards((prev) => [...prev, newCard]);
    persistDoc('creditCards', newCard.id, newCard);
    showSuccessFeedback('Successfully Created', `Credit Card "${newCard.cardName}" added`);
    return newCard;
  };

  const updateCreditCard = (id: string, updates: Partial<CreditCard>) => {
    setCreditCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    persistDoc('creditCards', id, updates, true);
    showSuccessFeedback('Successfully Updated', 'Credit card updated');
  };

  const deleteCreditCard = (id: string) => {
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
    deleteFirestoreDoc('creditCards', id);
  };

  const recordCreditCardPayment = (
    cardId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    bankAccountId?: string,
    date?: string,
    notes?: string
  ) => {
    const card = creditCards.find((c) => c.id === cardId);
    const bank = bankAccounts.find((b) => b.id === bankAccountId);

    const paymentTxn: Transaction = {
      id: generateId('ccpay'),
      date: date || getTodayDateString(),
      type: 'Credit Card Payment',
      title: `Bill Payment - ${card?.cardName || 'Credit Card'}`,
      narration: bank ? `Paid via ${bank.bankName}` : (notes?.trim() || undefined),
      amount: Number(amount),
      paymentMethod,
      bankAccountId: paymentMethod === 'Bank Account' || paymentMethod === 'UPI' ? bankAccountId : undefined,
      bankAccountName: bank?.bankName,
      creditCardId: cardId,
      creditCardName: card?.cardName,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [paymentTxn, ...prev]);
    persistDoc('transactions', paymentTxn.id, paymentTxn);
    showSuccessFeedback('Successfully Saved', `Credit card payment of ${formatCurrency(amount)} recorded`);
  };

  const addLoan = (data: Omit<LoanEntry, 'id' | 'createdAt' | 'settledAmount' | 'status' | 'repayments'>): LoanEntry => {
    const newLoan: LoanEntry = {
      id: generateId('loan'),
      personName: data.personName.trim(),
      loanType: data.loanType,
      originalAmount: Number(data.originalAmount),
      settledAmount: 0,
      date: data.date || getTodayDateString(),
      dueDate: data.dueDate,
      notes: data.notes?.trim(),
      status: 'Pending',
      paymentMethod: data.paymentMethod,
      bankAccountId: data.bankAccountId,
      repayments: [],
      createdAt: new Date().toISOString(),
    };

    setLoans((prev) => [newLoan, ...prev]);
    persistDoc('loans', newLoan.id, newLoan);

    // Also record transaction for disbursement so cash/bank reflects it immediately
    const bank = bankAccounts.find((b) => b.id === data.bankAccountId);
    const isMoneyGiven = data.loanType === 'Money Given' || data.loanType === 'Loan & Advance';

    const disbursementTxn: Transaction = {
      id: generateId('loantxn'),
      date: data.date || getTodayDateString(),
      type: isMoneyGiven ? 'Loan Given' : 'Loan Taken',
      title: isMoneyGiven ? `Loan given to ${data.personName}` : `Loan taken from ${data.personName}`,
      amount: Number(data.originalAmount),
      paymentMethod: data.paymentMethod || 'Cash',
      bankAccountId: data.paymentMethod === 'Bank Account' || data.paymentMethod === 'UPI' ? data.bankAccountId : undefined,
      bankAccountName: bank?.bankName,
      personName: data.personName,
      loanId: newLoan.id,
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [disbursementTxn, ...prev]);
    persistDoc('transactions', disbursementTxn.id, disbursementTxn);
    showSuccessFeedback('Successfully Created', `Loan entry for ${newLoan.personName} saved`);
    return newLoan;
  };

  const updateLoan = (id: string, updates: Partial<LoanEntry>) => {
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...updates };
        const settled = updated.settledAmount || 0;
        let status: LoanEntry['status'] = 'Pending';
        if (settled >= updated.originalAmount) {
          status = 'Settled';
        } else if (settled > 0) {
          status = 'Partially Settled';
        }
        return { ...updated, status };
      })
    );
    persistDoc('loans', id, updates, true);
    showSuccessFeedback('Successfully Updated', 'Loan record updated');
  };

  const deleteLoan = (id: string) => {
    setLoans((prev) => prev.filter((l) => l.id !== id));
    deleteFirestoreDoc('loans', id);
    // Also remove linked transactions
    setTransactions((prev) => prev.filter((t) => t.loanId !== id));
  };

  const recordLoanRepayment = (
    loanId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    bankAccountId?: string,
    date?: string,
    notes?: string
  ) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    const repAmount = Number(amount);
    const newSettled = (loan.settledAmount || 0) + repAmount;
    let newStatus: LoanEntry['status'] = 'Pending';
    if (newSettled >= loan.originalAmount) {
      newStatus = 'Settled';
    } else if (newSettled > 0) {
      newStatus = 'Partially Settled';
    }

    const newRep: LoanEntry['repayments'] = [
      ...(loan.repayments || []),
      {
        id: generateId('rep'),
        date: date || getTodayDateString(),
        amount: repAmount,
        paymentMethod,
        bankAccountId,
        notes,
      },
    ];

    setLoans((prev) =>
      prev.map((l) =>
        l.id === loanId
          ? {
              ...l,
              settledAmount: newSettled,
              status: newStatus,
              repayments: newRep,
            }
          : l
      )
    );
    persistDoc('loans', loanId, { settledAmount: newSettled, status: newStatus, repayments: newRep }, true);

    // Record repayment transaction
    const bank = bankAccounts.find((b) => b.id === bankAccountId);
    const isMoneyGiven = loan.loanType === 'Money Given' || loan.loanType === 'Loan & Advance';

    const repTxn: Transaction = {
      id: generateId('loanrep'),
      date: date || getTodayDateString(),
      type: isMoneyGiven ? 'Money Received' : 'Money Paid',
      title: isMoneyGiven ? `Loan Repayment received from ${loan.personName}` : `Loan Repayment paid to ${loan.personName}`,
      amount: repAmount,
      paymentMethod,
      bankAccountId: paymentMethod === 'Bank Account' || paymentMethod === 'UPI' ? bankAccountId : undefined,
      bankAccountName: bank?.bankName,
      personName: loan.personName,
      loanId: loan.id,
      notes: notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [repTxn, ...prev]);
    persistDoc('transactions', repTxn.id, repTxn);
    showSuccessFeedback('Successfully Saved', `Repayment of ${formatCurrency(repAmount)} recorded`);
  };

  const addUpiAccount = (data: Omit<UpiAccount, 'id' | 'createdAt'>): UpiAccount => {
    const newUpi: UpiAccount = {
      id: generateId('upi'),
      upiId: data.upiId.trim(),
      label: data.label.trim(),
      bankAccountId: data.bankAccountId,
      createdAt: new Date().toISOString(),
    };
    setUpiAccounts((prev) => [...prev, newUpi]);
    persistDoc('upiAccounts', newUpi.id, newUpi);
    showSuccessFeedback('Successfully Created', `UPI ID "${newUpi.upiId}" registered`);
    return newUpi;
  };

  const updateUpiAccount = (id: string, updates: Partial<UpiAccount>) => {
    setUpiAccounts((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    persistDoc('upiAccounts', id, updates, true);
    showSuccessFeedback('Successfully Updated', 'UPI record updated');
  };

  const deleteUpiAccount = (id: string) => {
    setUpiAccounts((prev) => prev.filter((u) => u.id !== id));
    deleteFirestoreDoc('upiAccounts', id);
  };

  const setCashOpeningBalance = (amount: number) => {
    const num = Number(amount) || 0;
    setCashOpeningBalanceState(num);
    persistDoc('meta', 'settings', { cashOpeningBalance: num, updatedAt: new Date().toISOString() }, true);
    showSuccessFeedback('Successfully Saved', 'Cash opening balance updated');
  };

  // Requirement 18: Delete Flow with 3-4s Tech Expenses loading animation
  const requestDelete = (itemType: string, itemId: string, itemTitle: string, onConfirm: () => void) => {
    setDeleteModalState({
      isOpen: true,
      itemType,
      itemId,
      itemTitle,
      isDeleting: false,
      onConfirm,
    });
  };

  const confirmDelete = () => {
    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }));

    // Requirement 18: "Loading duration should feel approximately 3–4 seconds"
    setTimeout(() => {
      deleteModalState.onConfirm();
      setDeleteModalState({
        isOpen: false,
        itemType: '',
        itemId: '',
        itemTitle: '',
        isDeleting: false,
        onConfirm: () => {},
      });
      // Requirement 18: "After deletion, show a success confirmation such as: Successfully Deleted"
      showSuccessFeedback('Successfully Deleted', 'Item has been removed');
    }, 3200);
  };

  const cancelDelete = () => {
    if (deleteModalState.isDeleting) return; // Cannot cancel while in delete progress
    setDeleteModalState({
      isOpen: false,
      itemType: '',
      itemId: '',
      itemTitle: '',
      isDeleting: false,
      onConfirm: () => {},
    });
  };

  // Preset Utilities
  const loadDefaultCategories = () => {
    const existingNames = new Set(categories.map((c) => c.name.toLowerCase()));
    const newCats: Category[] = defaultPersonalCategories
      .filter((p) => !existingNames.has(p.name.toLowerCase()))
      .map((p) => ({
        id: generateId('cat'),
        name: p.name,
        type: p.type,
        color: '#4f46e5',
        createdAt: new Date().toISOString(),
      }));

    if (newCats.length > 0) {
      setCategories((prev) => {
        const updated = [...prev, ...newCats];
        try {
          localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      newCats.forEach((c) => {
        persistDoc('categories', c.id, c);
      });
      showSuccessFeedback('Successfully Created', `${newCats.length} default categories added`);
    } else {
      showSuccessFeedback('Already Added', 'Default categories already exist');
    }
  };

  const resetAllData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_categories`);
    localStorage.removeItem(`${STORAGE_KEY}_banks`);
    localStorage.removeItem(`${STORAGE_KEY}_cards`);
    localStorage.removeItem(`${STORAGE_KEY}_loans`);
    localStorage.removeItem(`${STORAGE_KEY}_upi`);
    localStorage.removeItem(`${STORAGE_KEY}_transactions`);
    localStorage.removeItem(`${STORAGE_KEY}_cash_opening`);
    localStorage.removeItem(`${STORAGE_KEY}_saved_details`);
    localStorage.removeItem(`${STORAGE_KEY}_saved_item_names`);

    setCategories(initialCategories);
    setBankAccounts(initialBankAccounts);
    setCreditCards(initialCreditCards);
    setLoans(initialLoans);
    setUpiAccounts(initialUpiAccounts);
    setTransactions(initialTransactions);
    setCashOpeningBalanceState(initialCashBalance);
    setSavedExpenseDetails([]);
    setSavedItemNames([]);
    setPageView({ name: 'section', section: 'Dashboard' });

    showSuccessFeedback('Successfully Reset', 'All data reset to zero clean state');
  };

  // Requirement 1: Centered Bank Entry Success Message State
  const [saveCelebration, setSaveCelebration] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    amount?: number;
    direction?: 'Money In' | 'Money Out';
    bankName?: string;
    bankId?: string;
  } | null>(null);

  const triggerSaveCelebration = (data: {
    title?: string;
    subtitle?: string;
    amount?: number;
    direction?: 'Money In' | 'Money Out';
    bankName?: string;
    bankId?: string;
  }) => {
    setSaveCelebration({
      visible: true,
      title: data.title || 'Saved Successfully!',
      subtitle: data.subtitle,
      amount: data.amount,
      direction: data.direction,
      bankName: data.bankName,
      bankId: data.bankId,
    });
  };

  const dismissSaveCelebration = () => {
    setSaveCelebration(null);
  };

  return (
    <FinancialContext.Provider
      value={{
        pageView,
        activeSection,
        navigateTo,
        goBack,
        isSidebarOpen,
        setIsSidebarOpen,

        categories,
        bankAccounts: activeBankAccounts,
        creditCards,
        loans,
        upiAccounts,
        transactions: activeTransactions,
        deletedTransactions,
        deletedBankAccounts,
        cashOpeningBalance,
        savedExpenseDetails,
        addSavedExpenseDetail,
        savedItemNames,
        addSavedItemName,
        getItemNameCategory,
        ensureDefaultExpenseCategories,

        currentCashBalance,
        bankAccountsWithBalances,
        creditCardsWithOutstanding,
        totalExpenses,
        totalMoneyReceived,
        totalMoneyPaid,
        totalBankBalances,
        totalCreditCardOutstanding,
        totalLoansGivenPending,
        totalLoansTakenPending,
        upcomingCreditCardBills,
        categoryExpenseTotals,

        addTransaction,
        addExpense,
        addMoneyReceived,
        addMoneyPaid,
        updateTransaction,
        deleteTransaction,
        softDeleteTransaction,
        restoreTransaction,
        permanentlyDeleteTransaction,
        softDeleteBankAccount,
        restoreBankAccount,
        permanentlyDeleteBankAccount,
        emptyRecycleBin,

        saveCelebration,
        triggerSaveCelebration,
        dismissSaveCelebration,

        addCategory,
        updateCategory,
        deleteCategory,

        addBankAccount,
        updateBankAccount,
        deleteBankAccount,

        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        recordCreditCardPayment,

        addLoan,
        updateLoan,
        deleteLoan,
        recordLoanRepayment,

        addUpiAccount,
        updateUpiAccount,
        deleteUpiAccount,

        setCashOpeningBalance,

        deleteModalState,
        requestDelete,
        confirmDelete,
        cancelDelete,

        successFeedback,
        showSuccessFeedback,

        cloudSyncActive,
        cloudSyncError,

        loadDefaultCategories,
        resetAllData,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
