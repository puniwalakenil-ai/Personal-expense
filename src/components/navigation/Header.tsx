import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  ArrowLeft,
  Plus,
  Landmark,
  ShieldCheck,
  LogOut,
  Bell,
  MoreVertical,
  CreditCard as CardIcon,
  FileText,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getBillDueStatusText } from '../../utils/creditCardBilling';

export const Header: React.FC = () => {
  const {
    pageView,
    activeSection,
    goBack,
    navigateTo,
    setIsSidebarOpen,
    cloudSyncActive,
    upcomingCreditCardBills,
  } = useFinancial();
  const { currentUser, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const pendingCount = upcomingCreditCardBills.length;
  const isSubPage = pageView.name !== 'section';

  const totalPendingAmount = upcomingCreditCardBills.reduce(
    (sum, b) => sum + (Number(b.outstandingAmount) || 0),
    0
  );

  // Close 3-dot dropdown menu & notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    if (isMenuOpen || isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isNotificationOpen]);

  const getPageTitle = (): string => {
    switch (pageView.name) {
      case 'section':
        return pageView.section;
      case 'notifications':
        return 'Credit Card Notifications';
      case 'bank-entry-form':
        return pageView.editId ? 'Edit Bank Entry' : 'Record Bank Entry';
      case 'expense-form':
        return pageView.editId ? 'Edit Expense' : 'Record Expense';
      case 'create-name-form':
        return 'Create New Name';
      case 'money-received-form':
        return pageView.editId ? 'Edit Money Received' : 'Record Money Received';
      case 'money-paid-form':
        return pageView.editId ? 'Edit Money Paid' : 'Record Money Paid';
      case 'bank-account-form':
        return pageView.editId ? 'Edit Bank Account' : 'Create New Bank';
      case 'credit-card-form':
        return pageView.editId ? 'Edit Credit Card' : 'Add Credit Card';
      case 'credit-card-payment-form':
        return 'Pay Credit Card Bill';
      case 'loan-form':
        return pageView.editId ? 'Edit Loan Record' : 'Record Loan or Advance';
      case 'loan-repay-form':
        return 'Record Loan Repayment';
      case 'category-form':
        return pageView.editId ? 'Edit Category' : 'Create Category';
      case 'upi-form':
        return pageView.editId ? 'Edit UPI Account' : 'Add UPI ID';
      case 'entry-detail':
        return 'Entry Details';
      case 'category-detail':
        return 'Category Summary';
      case 'bank-detail':
        return 'Bank Account Statement';
      case 'credit-card-detail':
        return 'Credit Card Statement';
      case 'loan-detail':
        return 'Loan Statement';
      default:
        return 'Tech Expenses';
    }
  };

  return (
    /* 
      Requirement 1: Dashboard Header
      - Increased height for spacious, balanced, premium appearance (h-20 / min-h-[80px])
      - Clean, aligned, responsive layout across mobile, tablet, laptop, desktop
      - Enhanced branding and improved spacing around corner action icons
    */
    <header className="sticky top-0 z-30 min-h-[72px] sm:h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between transition-all">
      {/* Zone 1: Mobile Hamburger + Breadcrumb / Title with Back Navigation */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isSubPage ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="hidden sm:block text-slate-300 font-light">/</div>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {activeSection}
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-bold text-purple-700 uppercase tracking-wider border border-purple-100">
                <ShieldCheck className="w-3 h-3 text-purple-600" />
                Personal Vault
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block mt-0.5">
              Tech Expenses · Private Personal Finance
            </p>
          </div>
        )}
      </div>

      {/* Zone 2: Right Corner Action Icons with Generous Balanced Spacing */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0 pl-3">
        {pageView.name === 'section' && activeSection === 'Bank Accounts' && (
          <button
            type="button"
            onClick={() => navigateTo({ name: 'bank-account-form' })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Create New Bank</span>
            <span className="sm:hidden">New Bank</span>
          </button>
        )}

        {pageView.name === 'bank-detail' && (
          <button
            type="button"
            onClick={() =>
              navigateTo({
                name: 'bank-entry-form',
                bankId: pageView.bankId,
                returnTo: pageView,
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New</span>
          </button>
        )}

        {pageView.name === 'section' && activeSection === 'Categories' && (
          <button
            type="button"
            onClick={() => navigateTo({ name: 'category-form' })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-purple-600/30"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Category</span>
          </button>
        )}

        {pageView.name === 'section' && activeSection === 'Credit Cards' && (
          <button
            type="button"
            onClick={() => navigateTo({ name: 'credit-card-form' })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Card</span>
          </button>
        )}

        {pageView.name === 'section' && activeSection === 'Loans & Advances' && (
          <button
            type="button"
            onClick={() => navigateTo({ name: 'loan-form' })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Loan</span>
          </button>
        )}

        {pageView.name === 'section' && activeSection === 'UPI' && (
          <button
            type="button"
            onClick={() => navigateTo({ name: 'upi-form' })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add UPI</span>
          </button>
        )}

        {/* 
          Requirement 1: Dashboard top-right area remains clean and uncluttered.
          Bank-only transaction navigation for secondary overview tabs (Expenses, Money Received, Money Paid, Entries)
        */}
        {pageView.name === 'section' &&
          (activeSection === 'Expenses' ||
            activeSection === 'Money Received' ||
            activeSection === 'Money Paid' ||
            activeSection === 'Entries') && (
            <button
              type="button"
              onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Open Bank Accounts to add entries"
            >
              <Landmark className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Bank Accounts</span>
              <span className="sm:hidden">Banks</span>
            </button>
          )}

        {/* Cloud Sync Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600 text-xs">
          <span className={`w-2 h-2 rounded-full ${cloudSyncActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="hidden xl:inline text-[11px] font-medium text-slate-500">
            {currentUser?.email || 'puniwalakenil@gmail.com'}
          </span>
        </div>

        {/* Action Controls: Bell, 3-Dot Menu, Logout (Requirement 1) */}
        <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l border-slate-200/80">
          {/* Notification Bell with Badge & Interactive Toggle Panel */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => {
                if (pageView.name === 'notifications') {
                  goBack();
                } else {
                  setIsNotificationOpen((prev) => !prev);
                  setIsMenuOpen(false);
                }
              }}
              className={`relative p-2.5 rounded-xl transition-all cursor-pointer ${
                isNotificationOpen || pageView.name === 'notifications'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={
                pendingCount > 0
                  ? `${pendingCount} Pending Credit Card Bill${pendingCount > 1 ? 's' : ''}`
                  : 'Credit Card Notifications'
              }
              aria-label="Credit card notifications"
            >
              <Bell className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-sm animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Floating Notification Panel */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-tight">
                        Bill Notifications
                      </h4>
                      <p className="text-[10px] text-purple-200">
                        {pendingCount > 0
                          ? `${pendingCount} bill${pendingCount > 1 ? 's' : ''} awaiting payment`
                          : 'All bills settled'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {pendingCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                        {pendingCount} Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        All Paid
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsNotificationOpen(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 overflow-y-auto max-h-[380px] divide-y divide-slate-100">
                  {pendingCount === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
                        <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-900">
                        All Credit Card Bills Are Settled!
                      </h5>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                        You have 0 pending dues. Unpaid and partially paid bills will automatically appear here.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Summary strip */}
                      <div className="pb-2.5 mb-1 px-1 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-medium">Total Pending Dues</span>
                        <span className="font-mono font-extrabold text-amber-600 text-sm">
                          {formatCurrency(totalPendingAmount)}
                        </span>
                      </div>

                      {upcomingCreditCardBills.map((bill) => {
                        const statusBadge = getBillDueStatusText(
                          bill.daysRemaining,
                          bill.isOverdue,
                          bill.status || 'Unpaid'
                        );
                        return (
                          <div
                            key={bill.cardId}
                            className="py-3 first:pt-1 last:pb-1 space-y-2 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                                  {bill.cardName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  •••• {bill.cardIdentifier.slice(-4)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-extrabold font-mono text-amber-600">
                                  {formatCurrency(bill.outstandingAmount)}
                                </div>
                                <div className="text-[10px] text-slate-400">Due Amount</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusBadge.colorClass}`}
                              >
                                {statusBadge.text}
                              </span>

                              <div className="text-[10px] text-slate-400">
                                Due:{' '}
                                <strong className="text-slate-700">
                                  {formatDate(bill.rawDueDate || bill.dueDate)}
                                </strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setIsNotificationOpen(false);
                                navigateTo({
                                  name: 'credit-card-payment-form',
                                  cardId: bill.cardId,
                                  returnTo: pageView,
                                });
                              }}
                              className="w-full mt-1 py-1.5 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center shadow-xs"
                            >
                              Pay Bill Now
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationOpen(false);
                      navigateTo({ name: 'notifications', returnTo: pageView });
                    }}
                    className="font-bold text-purple-700 hover:text-purple-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Notification Center</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationOpen(false);
                      navigateTo({ name: 'section', section: 'Credit Cards' });
                    }}
                    className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    Manage Cards
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Three-Dot Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                isMenuOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="More Actions"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Quick Menu
                  </div>
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {currentUser?.email || 'puniwalakenil@gmail.com'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigateTo({ name: 'notifications', returnTo: pageView });
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-purple-600" />
                    <span>Bill Notifications</span>
                  </div>
                  {pendingCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">0 pending</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigateTo({ name: 'section', section: 'Credit Cards' });
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <CardIcon className="w-4 h-4 text-slate-500" />
                  <span>Credit Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigateTo({ name: 'section', section: 'Bank Accounts' });
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Landmark className="w-4 h-4 text-slate-500" />
                  <span>Bank Accounts</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigateTo({ name: 'section', section: 'Settings' });
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            className="p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Sign Out of Private Vault"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
