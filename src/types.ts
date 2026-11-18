export type NavSection =
  | 'Dashboard'
  | 'Entries'
  | 'Expenses'
  | 'Money Received'
  | 'Money Paid'
  | 'Bank Accounts'
  | 'Cash'
  | 'UPI'
  | 'Credit Cards'
  | 'Loans & Advances'
  | 'Categories'
  | 'Recycle Bin'
  | 'Settings';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Account' | 'Credit Card' | 'Adjustment';

export type TransactionType =
  | 'Expense'
  | 'Money Received'
  | 'Money Paid'
  | 'Credit Card Payment'
  | 'Loan Given'
  | 'Loan Taken'
  | 'Loan Repayment'
  | 'ATM Withdrawal'
  | 'Adjustment';

export type CategoryType =
  | 'Expense'
  | 'Income'
  | 'Capital'
  | 'Loan'
  | 'Advance'
  | 'Investment'
  | 'Both'
  | 'Other';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  createdAt: string;
}

export type BankAccountType = 'Savings' | 'Current' | 'Salary' | 'Fixed Deposit';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: BankAccountType;
  openingBalance: number;
  currentBalance: number;
  ifscCode?: string;
  upiId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
}

export type CreditCardBillStatus = 'Unpaid' | 'Partially Paid' | 'Paid';

export interface CreditCardStatementHistory {
  id: string;
  cardId: string;
  cardName: string;
  statementDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  cycleStartDate: string; // YYYY-MM-DD
  totalBilledAmount: number;
  amountPaid: number;
  outstandingAmount: number;
  status: CreditCardBillStatus;
  isOverdue: boolean;
  daysRemaining: number;
}

export interface CreditCard {
  id: string;
  cardName: string;
  cardIdentifier: string; // e.g. "•••• 8821" or "8821"
  creditLimit: number;
  billingDate: number; // Recurring Billing Statement Generation Day of month (1 to 31)
  dueDays?: number; // Payment Due Days after statement generation (e.g. 20)
  billingStatementDate?: string; // Current/latest generated statement date YYYY-MM-DD
  paymentDueDate: string; // Current/latest payment due date YYYY-MM-DD
  outstandingAmount: number;
  createdAt: string;
}

export type LoanType =
  | 'Money Given' // You lent money (They owe you)
  | 'Money Taken' // You borrowed money (You owe them)
  | 'Secured Loan'
  | 'Unsecured Loan'
  | 'Loan & Advance';

export type LoanDirection = 'Receivable' | 'Payable';

export type LoanStatus = 'Pending' | 'Partially Settled' | 'Settled';

export interface LoanRepaymentRecord {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  bankAccountName?: string;
  linkedTransactionId?: string;
  repaymentType?: 'Paid' | 'Received';
  notes?: string;
}

export interface LoanEntry {
  id: string;
  personName: string;
  loanType: LoanType;
  direction?: LoanDirection;
  entryKind?: 'Money Given' | 'Money Owed' | 'Adjustment';
  reason?: string;
  categoryId?: string;
  categoryName?: string;
  originalAmount: number;
  settledAmount: number;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  status: LoanStatus;
  paymentMethod?: PaymentMethod;
  bankAccountId?: string;
  linkedTransactionId?: string;
  repayments?: LoanRepaymentRecord[];
  createdAt: string;
}

export interface UpiAccount {
  id: string;
  upiId: string; // e.g. user@okhdfcbank
  label: string; // e.g. Primary GPay
  bankAccountId?: string;
  createdAt: string;
}

export type AttachmentSourceMethod = 'pdf' | 'camera' | 'gallery';
export type AttachmentModuleType = 'bank' | 'cash' | 'credit-card';

export interface TransactionAttachmentMeta {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  originalSize?: number;
  sourceMethod: AttachmentSourceMethod;
  contentHash: string;
  moduleType: AttachmentModuleType;
  accountScopeId?: string;
  chunkCount: number;
  thumbnailDataUrl?: string;
  createdAt: string;
}

export interface PendingAttachmentDraft {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  originalSize?: number;
  sourceMethod: AttachmentSourceMethod;
  contentHash: string;
  base64Data: string;
  previewUrl: string;
  thumbnailDataUrl?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  title: string;
  narration?: string; // Optional narration as per passbook requirements
  categoryId?: string;
  categoryName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  bankAccountName?: string;
  creditCardId?: string;
  creditCardName?: string;
  upiId?: string;
  loanId?: string;
  loanDirection?: LoanDirection;
  personName?: string;
  notes?: string;
  attachments?: TransactionAttachmentMeta[];
  linkedTransactionId?: string;
  transferGroupId?: string;
  isInternalTransfer?: boolean;
  transferDirection?: 'in' | 'out';
  relatedBankAccountId?: string;
  relatedBankAccountName?: string;
  isAdjustment?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface ExpenseItemName {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  createdAt: string;
}

export type PageView =
  | { name: 'section'; section: NavSection }
  | {
      name: 'expense-form';
      editId?: string;
      restoredState?: {
        title: string;
        categoryId: string;
        date: string;
        amount: string;
        paymentMethod: PaymentMethod;
        bankAccountId?: string;
        creditCardId?: string;
        upiId?: string;
        notes?: string;
      };
      returnTo?: PageView;
    }
  | {
      name: 'bank-entry-form';
      bankId: string;
      editId?: string;
      restoredState?: {
        date: string;
        title: string;
        amount: string;
        direction: 'Money Out' | 'Money In';
        paymentMethod: PaymentMethod;
        categoryId: string;
        narration?: string;
        notes?: string;
        pendingAttachments?: PendingAttachmentDraft[];
        removedAttachmentIds?: string[];
      };
      returnTo?: PageView;
    }
  | {
      name: 'cash-entry-form';
      editId?: string;
      defaultDirection?: 'Cash In' | 'Cash Out';
      restoredState?: {
        date: string;
        title: string;
        amount: string;
        direction: 'Cash In' | 'Cash Out';
        cashOutType?: 'Expense' | 'Money Paid';
        categoryId: string;
        narration?: string;
        notes?: string;
        pendingAttachments?: PendingAttachmentDraft[];
        removedAttachmentIds?: string[];
      };
      returnTo?: PageView;
    }
  | {
      name: 'atm-withdrawal-form';
      defaultBankId?: string;
      returnTo?: PageView;
    }
  | {
      name: 'credit-card-entry-form';
      cardId: string;
      editId?: string;
      restoredState?: {
        date: string;
        title: string;
        amount: string;
        direction: 'Money Out' | 'Money In';
        paymentMethod: PaymentMethod;
        categoryId: string;
        narration?: string;
        notes?: string;
        pendingAttachments?: PendingAttachmentDraft[];
        removedAttachmentIds?: string[];
      };
      returnTo?: PageView;
    }
  | {
      name: 'create-name-form';
      initialName: string;
      formStateToRestore?: {
        formType: 'expense' | 'money-paid' | 'money-received' | 'bank-entry' | 'credit-card-entry' | 'cash-entry';
        bankId?: string;
        cardId?: string;
        date: string;
        amount: string;
        direction?: 'Money Out' | 'Money In';
        cashDirection?: 'Cash In' | 'Cash Out';
        cashOutType?: 'Expense' | 'Money Paid';
        paymentMethod: PaymentMethod;
        bankAccountId?: string;
        creditCardId?: string;
        upiId?: string;
        personName?: string;
        narration?: string;
        notes?: string;
        pendingAttachments?: PendingAttachmentDraft[];
        removedAttachmentIds?: string[];
        editId?: string;
      };
      returnTo?: PageView;
    }
  | { name: 'money-received-form'; editId?: string; returnTo?: PageView }
  | {
      name: 'money-paid-form';
      editId?: string;
      restoredState?: {
        title: string;
        personName?: string;
        categoryId?: string;
        date: string;
        amount: string;
        paymentMethod: PaymentMethod;
        bankAccountId?: string;
        creditCardId?: string;
        upiId?: string;
        notes?: string;
      };
      returnTo?: PageView;
    }
  | { name: 'bank-account-form'; editId?: string; returnTo?: PageView }
  | { name: 'credit-card-form'; editId?: string; returnTo?: PageView }
  | { name: 'credit-card-payment-form'; cardId: string; returnTo?: PageView }
  | {
      name: 'loan-form';
      editId?: string;
      defaultType?: LoanType;
      defaultDirection?: LoanDirection;
      defaultPersonName?: string;
      returnTo?: PageView;
    }
  | {
      name: 'loan-repay-form';
      loanId?: string;
      personName?: string;
      mode?: 'pay' | 'receive';
      returnTo?: PageView;
    }
  | { name: 'category-form'; editId?: string; defaultType?: CategoryType; returnTo?: PageView }
  | { name: 'upi-form'; editId?: string; returnTo?: PageView }
  | { name: 'entry-detail'; entryId: string; returnTo?: PageView }
  | { name: 'category-detail'; categoryId: string; returnTo?: PageView }
  | { name: 'bank-detail'; bankId: string; returnTo?: PageView }
  | { name: 'credit-card-detail'; cardId: string; returnTo?: PageView }
  | { name: 'loan-detail'; loanId: string; returnTo?: PageView }
  | { name: 'person-loan-detail'; personName: string; returnTo?: PageView }
  | { name: 'notifications'; returnTo?: PageView };

export interface DeleteModalState {
  isOpen: boolean;
  itemType: string;
  itemId: string;
  itemTitle: string;
  onConfirm: () => void;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}
