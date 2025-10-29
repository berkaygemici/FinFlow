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

export const DEFAULT_CATEGORIES = [
  "Bars & Restaurants",
  "Transport",
  "Groceries",
  "Shopping",
  "Media & Telecom",
  "Automotive",
  "Leisure",
  "Health & Insurance",
  "Salary",
  "Other",
] as const;

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
