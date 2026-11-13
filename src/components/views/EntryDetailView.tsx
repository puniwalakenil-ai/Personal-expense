import React from 'react';
import {
  Calendar,
  Tag,
  CreditCard,
  Landmark,
  Banknote,
  QrCode,
  Edit2,
  Trash2,
  ArrowLeft,
  Receipt,
  User,
  FileText,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Props {
  entryId: string;
  returnTo?: PageView;
}

export const EntryDetailView: React.FC<Props> = ({ entryId, returnTo }) => {
  const {
    transactions,
    deleteTransaction,
    requestDelete,
    navigateTo,
    goBack,
  } = useFinancial();

  const txn = transactions.find((t) => t.id === entryId);

  if (!txn) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-slate-200 text-center">
        <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Transaction Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">This record may have been deleted.</p>
        <button
          type="button"
          onClick={goBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isOutflow =
    txn.type === 'Expense' ||
    txn.type === 'Money Paid' ||
    txn.type === 'Loan Given' ||
    txn.type === 'Credit Card Payment';

  const handleDelete = () => {
    requestDelete(
      'Transaction Entry',
      txn.id,
      `${txn.title} (${formatCurrency(txn.amount)})`,
      () => {
        deleteTransaction(txn.id);
        if (returnTo) {
          navigateTo(returnTo);
        } else {
          navigateTo({ name: 'section', section: 'Entries' });
        }
      }
    );
  };

  const handleEdit = () => {
    if (txn.bankAccountId) {
      navigateTo({ name: 'bank-entry-form', bankId: txn.bankAccountId, editId: txn.id, returnTo });
      return;
    }
    if (txn.type === 'Expense') {
      navigateTo({ name: 'expense-form', editId: txn.id, returnTo });
    } else if (txn.type === 'Money Received') {
      navigateTo({ name: 'money-received-form', editId: txn.id, returnTo });
    } else if (txn.type === 'Money Paid') {
      navigateTo({ name: 'money-paid-form', editId: txn.id, returnTo });
    } else {
      navigateTo({ name: 'expense-form', editId: txn.id, returnTo });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Detail Card (Requirement 5: Full-Page Screen) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <div className="inline-block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {txn.type}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">{txn.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{formatDate(txn.date)}</p>
          </div>

          <div className="text-right">
            <div
              className={`text-2xl font-black font-mono tracking-tight ${
                isOutflow ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isOutflow ? '-' : '+'}
              {formatCurrency(txn.amount)}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Category</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {txn.categoryName || '—'}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Payment Method</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                {txn.paymentMethod === 'Bank Account' && <Landmark className="w-4 h-4 text-blue-600" />}
                {txn.paymentMethod === 'Credit Card' && <CreditCard className="w-4 h-4 text-purple-600" />}
                {txn.paymentMethod === 'UPI' && <QrCode className="w-4 h-4 text-indigo-600" />}
                {txn.paymentMethod === 'Cash' && <Banknote className="w-4 h-4 text-amber-600" />}
                <span>{txn.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Account Details */}
          {(txn.bankAccountName || txn.creditCardName || txn.upiId || txn.personName) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              {txn.bankAccountName && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Bank Account</span>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{txn.bankAccountName}</div>
                </div>
              )}

              {txn.creditCardName && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Credit Card</span>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{txn.creditCardName}</div>
                </div>
              )}

              {txn.upiId && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">UPI Identifier</span>
                  <div className="text-xs font-mono font-semibold text-slate-800 mt-0.5">{txn.upiId}</div>
                </div>
              )}

              {txn.personName && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Party / Person</span>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{txn.personName}</div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {txn.notes && (
            <div className="pb-4 border-b border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Notes</span>
              <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{txn.notes}</p>
            </div>
          )}

          {/* Created Timestamp */}
          <div className="text-[11px] text-slate-400 font-mono">
            Transaction ID: {txn.id} · Created: {new Date(txn.createdAt).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Bottom Actions: Edit & Delete (Requirement 18) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            ← Return to list
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs shadow-rose-600/20 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
