import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { Sidebar } from './components/navigation/Sidebar';
import { Header } from './components/navigation/Header';
import { DeleteConfirmationModal } from './components/common/DeleteConfirmationModal';
import { MobileTabBar } from './components/navigation/MobileTabBar';

// Primary Full-Page Views
import { DashboardView } from './components/views/DashboardView';
import { EntriesView } from './components/views/EntriesView';
import { ExpensesView } from './components/views/ExpensesView';
import { MoneyReceivedView } from './components/views/MoneyReceivedView';
import { MoneyPaidView } from './components/views/MoneyPaidView';
import { BankAccountsView } from './components/views/BankAccountsView';
import { CashView } from './components/views/CashView';
import { UpiView } from './components/views/UpiView';
import { CreditCardsView } from './components/views/CreditCardsView';
import { LoansAdvancesView } from './components/views/LoansAdvancesView';
import { CategoriesView } from './components/views/CategoriesView';
import { RecycleBinView } from './components/views/RecycleBinView';
import { SettingsView } from './components/views/SettingsView';
import { SaveCelebrationToast } from './components/common/SaveCelebrationToast';

// Full-Page Forms (Requirement 5 & 9: Strictly NO POPUPS, forms open as separate full pages)
import { ExpenseFormView } from './components/views/ExpenseFormView';
import { CreateNameFormView } from './components/views/CreateNameFormView';
import { MoneyReceivedFormView } from './components/views/MoneyReceivedFormView';
import { MoneyPaidFormView } from './components/views/MoneyPaidFormView';
import { BankAccountFormView } from './components/views/BankAccountFormView';
import { CreditCardFormView } from './components/views/CreditCardFormView';
import { CreditCardPaymentFormView } from './components/views/CreditCardPaymentFormView';
import { LoanFormView } from './components/views/LoanFormView';
import { LoanRepayFormView } from './components/views/LoanRepayFormView';
import { CategoryFormView } from './components/views/CategoryFormView';
import { BankEntryFormView } from './components/views/BankEntryFormView';
import { CreditCardEntryFormView } from './components/views/CreditCardEntryFormView';
import { UpiFormView } from './components/views/UpiFormView';

// Full-Page Detail Views (Requirement 5: Clicking an entry, category, bank, credit card, loan opens full page)
import { EntryDetailView } from './components/views/EntryDetailView';
import { CategoryDetailView } from './components/views/CategoryDetailView';
import { BankDetailView } from './components/views/BankDetailView';
import { CreditCardDetailView } from './components/views/CreditCardDetailView';
import { LoanDetailView } from './components/views/LoanDetailView';
import { NotificationsView } from './components/views/NotificationsView';

const MainLayout: React.FC = () => {
  const { pageView } = useFinancial();

  const renderActiveView = () => {
    switch (pageView.name) {
      // Primary Sections
      case 'section':
        switch (pageView.section) {
          case 'Dashboard':
            return <DashboardView />;
          case 'Entries':
            return <EntriesView />;
          case 'Expenses':
            return <ExpensesView />;
          case 'Money Received':
            return <MoneyReceivedView />;
          case 'Money Paid':
            return <MoneyPaidView />;
          case 'Bank Accounts':
            return <BankAccountsView />;
          case 'Cash':
            return <CashView />;
          case 'UPI':
            return <UpiView />;
          case 'Credit Cards':
            return <CreditCardsView />;
          case 'Loans & Advances':
            return <LoansAdvancesView />;
          case 'Categories':
            return <CategoriesView />;
          case 'Recycle Bin':
            return <RecycleBinView />;
          case 'Settings':
            return <SettingsView />;
          default:
            return <DashboardView />;
        }

      // Full-Page Forms
      case 'expense-form':
        return (
          <ExpenseFormView
            editId={pageView.editId}
            restoredState={pageView.restoredState}
            returnTo={pageView.returnTo}
          />
        );
      case 'create-name-form':
        return (
          <CreateNameFormView
            initialName={pageView.initialName}
            formStateToRestore={pageView.formStateToRestore}
            returnTo={pageView.returnTo}
          />
        );
      case 'money-received-form':
        return <MoneyReceivedFormView editId={pageView.editId} returnTo={pageView.returnTo} />;
      case 'money-paid-form':
        return (
          <MoneyPaidFormView
            editId={pageView.editId}
            restoredState={pageView.restoredState}
            returnTo={pageView.returnTo}
          />
        );
      case 'bank-entry-form':
        return (
          <BankEntryFormView
            bankId={pageView.bankId}
            editId={pageView.editId}
            restoredState={pageView.restoredState}
            returnTo={pageView.returnTo}
          />
        );
      case 'bank-account-form':
        return <BankAccountFormView editId={pageView.editId} returnTo={pageView.returnTo} />;
      case 'credit-card-entry-form':
        return (
          <CreditCardEntryFormView
            cardId={pageView.cardId}
            editId={pageView.editId}
            restoredState={pageView.restoredState}
            returnTo={pageView.returnTo}
          />
        );
      case 'credit-card-form':
        return <CreditCardFormView editId={pageView.editId} returnTo={pageView.returnTo} />;
      case 'credit-card-payment-form':
        return <CreditCardPaymentFormView cardId={pageView.cardId} returnTo={pageView.returnTo} />;
      case 'loan-form':
        return <LoanFormView editId={pageView.editId} defaultType={pageView.defaultType} returnTo={pageView.returnTo} />;
      case 'loan-repay-form':
        return <LoanRepayFormView loanId={pageView.loanId} returnTo={pageView.returnTo} />;
      case 'category-form':
        return <CategoryFormView editId={pageView.editId} defaultType={pageView.defaultType} returnTo={pageView.returnTo} />;
      case 'upi-form':
        return <UpiFormView editId={pageView.editId} returnTo={pageView.returnTo} />;

      // Full-Page Detail Screens
      case 'entry-detail':
        return <EntryDetailView entryId={pageView.entryId} returnTo={pageView.returnTo} />;
      case 'category-detail':
        return <CategoryDetailView categoryId={pageView.categoryId} returnTo={pageView.returnTo} />;
      case 'bank-detail':
        return <BankDetailView bankId={pageView.bankId} returnTo={pageView.returnTo} />;
      case 'credit-card-detail':
        return <CreditCardDetailView cardId={pageView.cardId} returnTo={pageView.returnTo} />;
      case 'loan-detail':
        return <LoanDetailView loanId={pageView.loanId} returnTo={pageView.returnTo} />;
      case 'notifications':
        return <NotificationsView returnTo={pageView.returnTo} />;

      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 selection:bg-indigo-500 selection:text-white">
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto lg:pl-64">
          {/* Top Header Bar */}
          <Header />

          {/* Main Viewport Container - Balanced, comfortable width for PC / Windows and mobile */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-6xl w-full mx-auto pb-24 lg:pb-12">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar (matching mobile mockup from user screenshot) */}
      <MobileTabBar />

      {/* Requirement 18: Confirmation dialog with 3.2s Tech Expenses loading animation */}
      <DeleteConfirmationModal />

      {/* Centered Save Celebration Modal (1–2s auto-dismiss, no top/bottom duplicate) */}
      <SaveCelebrationToast />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard>
        <FinancialProvider>
          <MainLayout />
        </FinancialProvider>
      </AuthGuard>
    </AuthProvider>
  );
}

