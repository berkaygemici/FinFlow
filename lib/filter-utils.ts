import { Transaction, TransactionFilters } from "@/types";

export function applyTransactionFilters(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return transactions.filter((transaction) => {
    // Search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (!transaction.description.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Categories
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(transaction.category)) {
        return false;
      }
    }

    // Type
    if (filters.type && filters.type !== "all") {
      if (transaction.type !== filters.type) {
        return false;
      }
    }

    // Date range
    const transactionDate = new Date(transaction.date);
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (transactionDate < fromDate) {
        return false;
      }
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (transactionDate > toDate) {
        return false;
      }
    }

    // Amount range
    const amount = Math.abs(transaction.amount);
    if (filters.amountMin !== undefined && amount < filters.amountMin) {
      return false;
    }
    if (filters.amountMax !== undefined && amount > filters.amountMax) {
      return false;
    }

    // Month filter
    if (filters.month !== undefined) {
      const month = transactionDate.getMonth() + 1; // JS months are 0-indexed
      if (month !== filters.month) {
        return false;
      }
    }

    // Year filter
    if (filters.year !== undefined) {
      const year = transactionDate.getFullYear();
      if (year !== filters.year) {
        return false;
      }
    }

    return true;
  });
}

export function sortTransactions(
  transactions: Transaction[],
  sortBy: string
): Transaction[] {
  const sorted = [...transactions];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "date-asc":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "amount-desc":
        return Math.abs(b.amount) - Math.abs(a.amount);
      case "amount-asc":
        return Math.abs(a.amount) - Math.abs(b.amount);
      default:
        return 0;
    }
  });
  return sorted;
}
