"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Statement, Transaction } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowDownIcon, TrendingDown, Calendar, CreditCard, BarChart3, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExpensesPage() {
  const statements = useLiveQuery(() => db.statements.toArray()) || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [amountFilter, setAmountFilter] = useState("all");

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
    let filtered = allExpenses.filter((expense) => {
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;

      let matchesAmount = true;
      if (amountFilter === "small") {
        matchesAmount = Math.abs(expense.amount) < 20;
      } else if (amountFilter === "medium") {
        matchesAmount = Math.abs(expense.amount) >= 20 && Math.abs(expense.amount) < 100;
      } else if (amountFilter === "large") {
        matchesAmount = Math.abs(expense.amount) >= 100;
      }

      return matchesSearch && matchesCategory && matchesAmount;
    });

    // Sort
    filtered.sort((a, b) => {
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

    return filtered;
  }, [allExpenses, searchTerm, categoryFilter, sortBy, amountFilter]);

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
      <Card>
        <CardHeader>
          <CardTitle>Filter & Sort</CardTitle>
          <CardDescription>Refine your expense view</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search by description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Amount Range</label>
              <Select value={amountFilter} onValueChange={setAmountFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Amounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Amounts</SelectItem>
                  <SelectItem value="small">&lt; €20</SelectItem>
                  <SelectItem value="medium">€20 - €100</SelectItem>
                  <SelectItem value="large">&gt; €100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
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

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredExpenses.length} of {allExpenses.length} expenses
            </span>
            {(searchTerm || categoryFilter !== "all" || amountFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setAmountFilter("all");
                }}
                className="text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
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
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-red-500">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
