"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Statement, Transaction, TransactionFilters as FilterType } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, TrendingUp, Calendar, Wallet, BarChart3, PiggyBank } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState, useMemo } from "react";
import { TransactionFilters } from "@/components/transaction-filters";
import { applyTransactionFilters, sortTransactions } from "@/lib/filter-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function IncomePage() {
  const statements = useLiveQuery(() => db.statements.toArray()) || [];
  const [filters, setFilters] = useState<FilterType>({ type: "income" });
  const [sortBy, setSortBy] = useState("date-desc");

  // Get all income transactions
  const allIncome = useMemo(() => {
    const income: (Transaction & { statementMonth: string })[] = [];
    statements.forEach((statement) => {
      statement.transactions
        .filter((t) => t.type === "income")
        .forEach((transaction) => {
          income.push({
            ...transaction,
            statementMonth: `${statement.month} ${statement.year}`,
          });
        });
    });
    return income;
  }, [statements]);

  // Get income sources (unique descriptions)
  const incomeSources = useMemo(() => {
    const sources = new Map<string, { total: number; count: number }>();
    allIncome.forEach((inc) => {
      const existing = sources.get(inc.description) || { total: 0, count: 0 };
      sources.set(inc.description, {
        total: existing.total + inc.amount,
        count: existing.count + 1,
      });
    });
    return Array.from(sources.entries())
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [allIncome]);

  // Filter and sort income
  const filteredIncome = useMemo(() => {
    const filtered = applyTransactionFilters(allIncome, filters) as (Transaction & { statementMonth: string })[];
    return sortTransactions(filtered, sortBy) as (Transaction & { statementMonth: string })[];
  }, [allIncome, filters, sortBy]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (filteredIncome.length === 0) {
      return {
        total: 0,
        count: 0,
        average: 0,
        largest: 0,
        smallest: 0,
        monthlyAverage: 0,
        yearlyEstimate: 0,
        primarySource: "N/A",
        sourceCount: 0,
        consistency: 0,
      };
    }

    const total = filteredIncome.reduce((sum, i) => sum + i.amount, 0);
    const count = filteredIncome.length;
    const average = total / count;

    const amounts = filteredIncome.map((i) => i.amount);
    const largest = Math.max(...amounts);
    const smallest = Math.min(...amounts);

    // Calculate monthly average based on date range
    const dates = filteredIncome.map((i) => new Date(i.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const monthsDiff = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 30));

    const monthlyAverage = total / monthsDiff;
    const yearlyEstimate = monthlyAverage * 12;

    // Primary income source
    const primarySource = incomeSources[0]?.source || "N/A";
    const sourceCount = incomeSources.length;

    // Consistency score (lower standard deviation = more consistent)
    const mean = average;
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    const consistency = mean > 0 ? Math.max(0, 100 - (stdDev / mean) * 100) : 0;

    return {
      total,
      count,
      average,
      largest,
      smallest,
      monthlyAverage,
      yearlyEstimate,
      primarySource,
      sourceCount,
      consistency,
    };
  }, [filteredIncome, incomeSources]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Income</h1>
        <p className="text-muted-foreground">
          Detailed view of all your income with advanced metrics and analysis
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(metrics.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.count} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Income</CardTitle>
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
            <CardTitle className="text-sm font-medium">Largest Income</CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
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
            <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.monthlyAverage)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Yearly Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(metrics.yearlyEstimate)}</div>
            <p className="text-xs text-muted-foreground mt-1">Projected annual income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Income Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{metrics.sourceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique income streams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Consistency Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{metrics.consistency.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Income stability</p>
          </CardContent>
        </Card>
      </div>

      {/* Income Sources Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Income Sources</CardTitle>
          <CardDescription>Breakdown by source</CardDescription>
        </CardHeader>
        <CardContent>
          {incomeSources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No income sources found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomeSources.map((source, index) => {
                const percentage = (source.total / metrics.total) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate max-w-[200px]">
                          {source.source}
                        </span>
                        <Badge variant="outline" className="shrink-0">
                          {source.count}x
                        </Badge>
                      </div>
                      <span className="font-bold text-green-500">
                        {formatCurrency(source.total)}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% of total income
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onFiltersChange={setFilters}
        showTypeFilter={false}
      />

      {/* Sort and Results Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredIncome.length} of {allIncome.length} income transactions
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
          <CardTitle>All Income Transactions</CardTitle>
          <CardDescription>Complete list of income received</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredIncome.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No income found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIncome.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{income.description}</p>
                      <Badge variant="outline" className="shrink-0 bg-green-500/10 text-green-500 border-green-500/20">
                        {income.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatDate(income.date)}</span>
                      <span className="hidden sm:inline">{income.statementMonth}</span>
                      {income.originalCurrency && income.originalCurrency !== "EUR" && (
                        <span className="text-xs">
                          {income.originalAmount?.toFixed(2)} {income.originalCurrency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-500">
                      +{formatCurrency(income.amount)}
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
