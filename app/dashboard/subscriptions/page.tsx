"use client";

import { useEffect, useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import {
  Repeat,
  Calendar,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Clock,
  BarChart3,
  Filter,
} from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RecurringTransactionGroup } from "@/types";
import { getRecurringGroups } from "@/lib/process-recurring";
import { getRecurringSummary } from "@/lib/recurring-detector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SubscriptionsPage() {
  const statements = useLiveQuery(() => db.statements.toArray());
  const [recurringGroups, setRecurringGroups] = useState<RecurringTransactionGroup[]>([]);
  const [filterType, setFilterType] = useState<"all" | "subscriptions" | "recurring">("all");
  const [sortBy, setSortBy] = useState<"amount" | "frequency" | "merchant">("amount");

  useEffect(() => {
    if (!statements || statements.length === 0) return;

    getRecurringGroups().then((groups) => {
      setRecurringGroups(groups);
    });
  }, [statements]);

  // Filter groups based on selected type
  const filteredGroups = useMemo(() => {
    let filtered = recurringGroups;

    if (filterType === "subscriptions") {
      filtered = filtered.filter((g) => g.isSubscription);
    } else if (filterType === "recurring") {
      filtered = filtered.filter((g) => !g.isSubscription);
    }

    // Sort groups
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "amount":
          return b.averageAmount - a.averageAmount;
        case "frequency":
          const freqOrder = { weekly: 1, monthly: 2, yearly: 3 };
          return freqOrder[a.frequency] - freqOrder[b.frequency];
        case "merchant":
          return a.merchantName.localeCompare(b.merchantName);
        default:
          return 0;
      }
    });
  }, [recurringGroups, filterType, sortBy]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (filteredGroups.length === 0) {
      return {
        totalSubscriptions: 0,
        totalRecurring: 0,
        monthlyTotal: 0,
        yearlyTotal: 0,
        byCategory: {},
        topSubscriptions: [],
      };
    }

    return getRecurringSummary(filteredGroups);
  }, [filteredGroups]);

  // Calculate next upcoming payments (within next 7 days)
  const upcomingPayments = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return filteredGroups
      .filter((g) => g.nextExpectedDate && new Date(g.nextExpectedDate) <= nextWeek)
      .sort((a, b) => {
        const dateA = a.nextExpectedDate ? new Date(a.nextExpectedDate).getTime() : Infinity;
        const dateB = b.nextExpectedDate ? new Date(b.nextExpectedDate).getTime() : Infinity;
        return dateA - dateB;
      });
  }, [filteredGroups]);

  if (!statements || statements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <Repeat className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Data Yet</h2>
        <p className="text-muted-foreground">
          Upload bank statements to detect recurring transactions
        </p>
      </div>
    );
  }

  if (recurringGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <Repeat className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Recurring Transactions Found</h2>
        <p className="text-muted-foreground">
          Upload more statements to detect recurring payment patterns
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subscriptions & Recurring Payments</h1>
            <p className="text-muted-foreground">
              Track and manage your recurring expenses and subscriptions
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Subscriptions</p>
                  <h3 className="text-2xl font-bold mt-2">{summary.totalSubscriptions}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Active subscriptions</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Repeat className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Cost</p>
                  <h3 className="text-2xl font-bold mt-2">
                    {formatCurrency(summary.monthlyTotal)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Per month average</p>
                </div>
                <div className="p-3 rounded-full bg-orange-500/10">
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Yearly Cost</p>
                  <h3 className="text-2xl font-bold mt-2">
                    {formatCurrency(summary.yearlyTotal)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Per year total</p>
                </div>
                <div className="p-3 rounded-full bg-red-500/10">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Payments</p>
                  <h3 className="text-2xl font-bold mt-2">{upcomingPayments.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Next 7 days</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Upcoming Payments
              </CardTitle>
              <CardDescription>
                Expected payments in the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingPayments.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-orange-500/5 border-orange-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{group.merchantName}</p>
                        <p className="text-sm text-muted-foreground">
                          Expected: {group.nextExpectedDate && formatDate(group.nextExpectedDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(group.averageAmount)}</p>
                      <Badge variant="outline" className="mt-1">
                        {group.frequency}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters and Sorting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Recurring Transactions</CardTitle>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({recurringGroups.length})</SelectItem>
                    <SelectItem value="subscriptions">
                      Subscriptions ({recurringGroups.filter((g) => g.isSubscription).length})
                    </SelectItem>
                    <SelectItem value="recurring">
                      Recurring ({recurringGroups.filter((g) => !g.isSubscription).length})
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[150px]">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">By Amount</SelectItem>
                    <SelectItem value="frequency">By Frequency</SelectItem>
                    <SelectItem value="merchant">By Merchant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Repeat className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium capitalize">{group.merchantName}</p>
                          {group.isSubscription && (
                            <Badge variant="secondary" className="text-xs">
                              Subscription
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {group.category} • {group.frequency} payment
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {group.transactions.length} payments detected
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last: {formatDate(group.lastTransactionDate)}
                          </span>
                          {group.nextExpectedDate && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Next: {formatDate(group.nextExpectedDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-lg font-bold">
                        {formatCurrency(group.averageAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        per {group.frequency === "weekly" ? "week" : group.frequency === "monthly" ? "month" : "year"}
                      </p>
                      {group.variance > 0 && (
                        <p className="text-xs text-orange-500 mt-1">
                          ±{group.variance.toFixed(1)}% variance
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Recent Transactions
                    </p>
                    <div className="space-y-1">
                      {group.transactions.slice(0, 3).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {formatDate(transaction.date)}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))}
                      {group.transactions.length > 3 && (
                        <p className="text-xs text-muted-foreground italic">
                          +{group.transactions.length - 3} more transactions
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Breakdown */}
      {Object.keys(summary.byCategory).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recurring Expenses by Category</CardTitle>
              <CardDescription>
                Monthly average spending on recurring payments per category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(summary.byCategory)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([category, data]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{category}</span>
                          <Badge variant="outline" className="text-xs">
                            {data.count} {data.count === 1 ? "subscription" : "subscriptions"}
                          </Badge>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency(data.amount)}/mo
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{
                            width: `${(data.amount / summary.monthlyTotal) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
