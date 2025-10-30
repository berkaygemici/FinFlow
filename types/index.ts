export interface Transaction {
  id: string;
  description: string;
  date: Date;
  amount: number;
  currency: string;
  category: string;
  type: "income" | "expense";
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  iban?: string;
  reference?: string;
  // Recurring transaction fields
  isRecurring?: boolean;
  recurringGroupId?: string;
  recurringFrequency?: "weekly" | "monthly" | "yearly";
  merchantName?: string;
}

export interface Statement {
  id: string;
  fileName: string;
  uploadDate: Date;
  month: string;
  year: number;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactions: Transaction[];
}

export interface CategoryRule {
  id: string;
  pattern: string;
  category: string;
  isRegex: boolean;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: "monthly" | "yearly";
}

export interface BudgetAlert {
  category: string;
  budget: number;
  spent: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
}

import categoriesConfig from "../config/categories.json";

export const DEFAULT_CATEGORIES = categoriesConfig.categories as readonly string[];

export type CategoryType = typeof DEFAULT_CATEGORIES[number];

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface Settings {
  id: string;
  aiCategorizationEnabled: boolean;
}

export interface TransactionFilters {
  searchTerm?: string;
  categories?: string[];
  type?: "income" | "expense" | "all";
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  month?: number;
  year?: number;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: TransactionFilters;
  createdAt: Date;
  lastUsed?: Date;
}

export interface RecurringTransactionGroup {
  id: string;
  merchantName: string;
  category: string;
  averageAmount: number;
  frequency: "weekly" | "monthly" | "yearly";
  transactions: Transaction[];
  isSubscription: boolean;
  nextExpectedDate?: Date;
  lastTransactionDate: Date;
  variance: number; // Amount variance percentage
}
