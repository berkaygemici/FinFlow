"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Statement, Transaction, TransactionFilters as FilterType } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownIcon, TrendingDown, Calendar, CreditCard, BarChart3, Repeat } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState, useMemo } from "react";
import { TransactionFilters } from "@/components/transaction-filters";
import { applyTransactionFilters, sortTransactions } from "@/lib/filter-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddSubscriptionDialog from "@/components/add-subscription-dialog";

export default function ExpensesPage() {
  const statements = useLiveQuery(() => db.statements.toArray()) || [];
  const [filters, setFilters] = useState<FilterType>({ type: "expense" });
  const [sortBy, setSortBy] = useState("date-desc");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAddSubscriptionDialog, setShowAddSubscriptionDialog] = useState(false);

  const handleMarkAsSubscription = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowAddSubscriptionDialog(true);
  };

  // Get all expense transactions
  const allExpenses = useMemo(() => {
    const expenses: (Transaction & { statementMonth: string })[] = [];
    statements.forEach((statement) => {
      statement.transactions
        .filter((t) => t.type === "expense")
        .forEach((transaction) => {
          expenses.push({
            ...transaction,
            statementMonth: `${statement.month} ${statement.year}`,
          });
        });
    });
    return expenses;
  }, [statements]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allExpenses.map((e) => e.category));
    return Array.from(cats).sort();
  }, [allExpenses]);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    const filtered = applyTransactionFilters(allExpenses, filters) as (Transaction & { statementMonth: string })[];
    return sortTransactions(filtered, sortBy) as (Transaction & { statementMonth: string })[];
  }, [allExpenses, filters, sortBy]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return {
        total: 0,
        count: 0,
        average: 0,
        largest: 0,
        smallest: 0,
        dailyAverage: 0,
        weeklyAverage: 0,
        monthlyAverage: 0,
        mostFrequentMerchant: "N/A",
      };
    }

    const total = filteredExpenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const count = filteredExpenses.length;
    const average = total / count;

    const amounts = filteredExpenses.map((e) => Math.abs(e.amount));
    const largest = Math.max(...amounts);
    const smallest = Math.min(...amounts);

    // Calculate date range
    const dates = filteredExpenses.map((e) => new Date(e.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const daysDiff = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));

    const dailyAverage = total / Math.max(1, daysDiff);
    const weeklyAverage = dailyAverage * 7;
    const monthlyAverage = dailyAverage * 30;

    // Most frequent merchant
    const merchantCounts: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      merchantCounts[e.description] = (merchantCounts[e.description] || 0) + 1;
    });
    const mostFrequentMerchant = Object.entries(merchantCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "N/A";

    return {
      total,
      count,
      average,
      largest,
      smallest,
      dailyAverage,
      weeklyAverage,
      monthlyAverage,
      mostFrequentMerchant,
    };
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Expenses</h1>
        <p className="text-muted-foreground">
          Detailed view of all your expenses with advanced metrics and filtering
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(metrics.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.count} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.average)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Expense</CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.largest)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Single transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.dailyAverage)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Weekly Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(metrics.weeklyAverage)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monthly Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(metrics.monthlyAverage)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Most Frequent Merchant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{metrics.mostFrequentMerchant}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableCategories={categories}
        showTypeFilter={false}
      />

      {/* Sort and Results Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredExpenses.length} of {allExpenses.length} expenses
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Date (Newest)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="amount-desc">Amount (Highest)</SelectItem>
                  <SelectItem value="amount-asc">Amount (Lowest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>Complete list of expense transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No expenses found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{expense.description}</p>
                      <Badge variant="outline" className="shrink-0">
                        {expense.category}
                      </Badge>
                      {expense.isRecurring && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          <Repeat className="w-3 h-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatDate(expense.date)}</span>
                      <span className="hidden sm:inline">{expense.statementMonth}</span>
                      {expense.originalCurrency && expense.originalCurrency !== "EUR" && (
                        <span className="text-xs">
                          {expense.originalAmount?.toFixed(2)} {expense.originalCurrency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsSubscription(expense)}
                    >
                      <Repeat className="w-4 h-4 mr-1" />
                      Mark as Subscription
                    </Button>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-500">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Subscription Dialog */}
      <AddSubscriptionDialog
        transaction={selectedTransaction}
        open={showAddSubscriptionDialog}
        onOpenChange={setShowAddSubscriptionDialog}
        onSuccess={() => {
          // Subscription added successfully
        }}
      />
    </div>
  );
}
