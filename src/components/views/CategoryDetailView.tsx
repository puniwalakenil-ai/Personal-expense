import React, { useState } from 'react';
import { Tags, Plus, Edit2, Trash2, ArrowLeft, Receipt, Landmark, FileText } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PageView } from '../../types';
import { formatCurrency, formatDate, normalizeCategoryName } from '../../utils/formatters';
import { ExportPdfLedgerModal } from '../common/ExportPdfLedgerModal';

interface Props {
  categoryId: string;
  returnTo?: PageView;
}

export const CategoryDetailView: React.FC<Props> = ({ categoryId, returnTo }) => {
  const {
    categories,
    transactions,
    deleteCategory,
    requestDelete,
    navigateTo,
    goBack,
  } = useFinancial();

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const category = categories.find((c) => c.id === categoryId);
  const categoryTransactions = transactions.filter(
    (t) =>
      t.categoryId === categoryId ||
      (category && t.categoryName && normalizeCategoryName(t.categoryName) === normalizeCategoryName(category.name))
  );

  const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);

  if (!category) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-slate-200 text-center">
        <Tags className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Category Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">This category may have been deleted.</p>
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

  const handleDelete = () => {
    requestDelete(
      'Category',
      category.id,
      category.name,
      () => {
        deleteCategory(category.id);
        if (returnTo) {
          navigateTo(returnTo);
        } else {
          navigateTo({ name: 'section', section: 'Categories' });
        }
      }
    );
  };

  const handleEdit = () => {
    navigateTo({
      name: 'category-form',
      editId: category.id,
      returnTo: { name: 'category-detail', categoryId: category.id, returnTo },
    });
  };

  return (
    <div className="space-y-6">
      {/* Requirement 16: Category Full-Page Summary */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Category Summary · {category.type}
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{category.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Total of {categoryTransactions.length} transaction{categoryTransactions.length === 1 ? '' : 's'} recorded
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-xs text-slate-400 font-medium">Total Category Spend / Volume</div>
          <div className="text-3xl font-extrabold font-mono text-white mt-1">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
            title="Export category ledger as PDF"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Category</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer shadow-rose-600/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Category</span>
          </button>
        </div>
      </div>

      {/* Requirement 16: Show all transactions belonging to that category */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
          Transactions in "{category.name}"
        </h3>

        {categoryTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No transactions in this category yet</p>
            <button
              type="button"
              onClick={() => navigateTo({ name: 'section', section: 'Bank Accounts' })}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-700 shadow-xs"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Select Bank to Add Entry</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categoryTransactions.map((txn) => {
              const isOutflow =
                txn.type === 'Expense' || txn.type === 'Money Paid' || txn.type === 'Loan Given';
              return (
                <div
                  key={txn.id}
                  onClick={() =>
                    navigateTo({
                      name: 'entry-detail',
                      entryId: txn.id,
                      returnTo: { name: 'category-detail', categoryId: category.id, returnTo },
                    })
                  }
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 truncate">{txn.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      <span>{formatDate(txn.date)}</span>
                      <span> · </span>
                      <span>{txn.paymentMethod}</span>
                      {txn.personName && <span> · {txn.personName}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-bold font-mono ${
                        isOutflow ? 'text-slate-900' : 'text-emerald-600'
                      }`}
                    >
                      {isOutflow ? '-' : '+'}
                      {formatCurrency(txn.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{txn.type}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {category && (
        <ExportPdfLedgerModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          title={`${category.name} Category Ledger`}
          subtitle={`Category Type: ${category.type} · ${categoryTransactions.length} Transactions`}
          ledgerType="category"
          transactions={categoryTransactions}
          baseOpeningBalance={0}
        />
      )}
    </div>
  );
};
