/**
 * Format currency with Indian Rupee (₹) symbol and tabular-friendly formatting
 */
export const formatCurrency = (amount: number | undefined | null, showSymbol = true): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showSymbol ? '₹0.00' : '0.00';
  }

  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(absAmount);

  const prefix = showSymbol ? '₹' : '';
  const sign = amount < 0 ? '-' : '';

  return `${sign}${prefix}${formatted}`;
};

/**
 * Compact currency for cards/headers (e.g. ₹50k, ₹1.5L, ₹2.4Cr)
 */
export const formatCompactCurrency = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount);
};

/**
 * Format Date strings: "05 Oct 2026"
 */
export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/**
 * Get current date formatted as YYYY-MM-DD
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Mask account number for security e.g. "•••• 4092"
 */
export const maskAccountNumber = (accountNumber: string | undefined): string => {
  if (!accountNumber) return '••••';
  const clean = accountNumber.replace(/\s+/g, '');
  if (clean.length <= 4) return `•••• ${clean}`;
  const lastFour = clean.slice(-4);
  return `•••• ${lastFour}`;
};

/**
 * Generate unique IDs
 */
export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Calculate due status text & urgency
 */
export const getDueStatus = (dueDateStr?: string): { text: string; isOverdue: boolean; daysRemaining: number } => {
  if (!dueDateStr) return { text: 'No due date', isOverdue: false, daysRemaining: 999 };

  try {
    const due = new Date(dueDateStr + (dueDateStr.length === 10 ? 'T00:00:00' : ''));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`, isOverdue: true, daysRemaining: diffDays };
    }
    if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false, daysRemaining: 0 };
    }
    if (diffDays === 1) {
      return { text: 'Due tomorrow', isOverdue: false, daysRemaining: 1 };
    }
    return { text: `Due in ${diffDays} days`, isOverdue: false, daysRemaining: diffDays };
  } catch {
    return { text: dueDateStr, isOverdue: false, daysRemaining: 999 };
  }
};

/**
 * Normalize category name to prevent duplicates: trim spaces, collapse multiple spaces, lowercase
 */
export const normalizeCategoryName = (name: string | undefined | null): string => {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};
