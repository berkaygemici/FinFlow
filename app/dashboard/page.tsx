"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Activity,
  CreditCard,
  Target,
} from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Statement, CategorySpending } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const statements = useLiveQuery(() => db.statements.toArray());
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    categorySpending: [] as CategorySpending[],
    savingsRate: 0,
    transactionCount: 0,
    avgTransactionAmount: 0,
    largestExpense: 0,
    monthlyBurnRate: 0,
  });

  useEffect(() => {
    if (!statements || statements.length === 0) return;

    const totalIncome = statements.reduce((sum, s) => sum + s.totalIncome, 0);
    const totalExpenses = statements.reduce((sum, s) => sum + s.totalExpenses, 0);
    const balance = totalIncome - totalExpenses;

    // Calculate category spending
    const categoryMap = new Map<string, { amount: number; count: number }>();
    let transactionCount = 0;
    let expenseAmounts: number[] = [];

    statements.forEach((statement) => {
      statement.transactions.forEach((t) => {
        transactionCount++;
        if (t.type === "expense") {
          expenseAmounts.push(Math.abs(t.amount));
          const existing = categoryMap.get(t.category) || { amount: 0, count: 0 };
          categoryMap.set(t.category, {
            amount: existing.amount + t.amount,
            count: existing.count + 1,
          });
        }
      });
    });

    const categorySpending: CategorySpending[] = Array.from(
      categoryMap.entries()
    ).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: (data.amount / totalExpenses) * 100,
    })).sort((a, b) => b.amount - a.amount);

    // Additional metrics
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    const avgTransactionAmount = transactionCount > 0 ? (totalIncome + Math.abs(totalExpenses)) / transactionCount : 0;
    const largestExpense = expenseAmounts.length > 0 ? Math.max(...expenseAmounts) : 0;

    // Calculate monthly burn rate (average expenses per month)
    const monthsSet = new Set(statements.map(s => `${s.month}-${s.year}`));
    const monthCount = Math.max(1, monthsSet.size);
    const monthlyBurnRate = Math.abs(totalExpenses) / monthCount;

    setStats({
      totalIncome,
      totalExpenses,
      balance,
      categorySpending,
      savingsRate,
      transactionCount,
      avgTransactionAmount,
      largestExpense,
      monthlyBurnRate,
    });
  }, [statements]);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    delay,
  }: {
    title: string;
    value: string;
    icon: any;
    trend?: "up" | "down";
    delay: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold mt-2">{value}</h3>
            </div>
            <div className={`p-3 rounded-full ${
              trend === "up" ? "bg-green-500/10" :
              trend === "down" ? "bg-red-500/10" :
              "bg-primary/10"
            }`}>
              <Icon className={`w-6 h-6 ${
                trend === "up" ? "text-green-500" :
                trend === "down" ? "text-red-500" :
                "text-primary"
              }`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (!statements || statements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <Wallet className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Data Yet</h2>
        <p className="text-muted-foreground">Upload your first bank statement to get started</p>
        <Link href="/dashboard/upload">
          <Button>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Upload Statement
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Financial Overview</h1>
            <p className="text-muted-foreground">
              Track your income, expenses, and financial health
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/income">
              <Button variant="outline" size="sm">
                <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                View Income
              </Button>
            </Link>
            <Link href="/dashboard/expenses">
              <Button variant="outline" size="sm">
                <TrendingDown className="w-4 h-4 mr-2 text-red-500" />
                View Expenses
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome)}
          icon={TrendingUp}
          trend="up"
          delay={0.1}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses)}
          icon={TrendingDown}
          trend="down"
          delay={0.2}
        />
        <StatCard
          title="Net Balance"
          value={formatCurrency(stats.balance)}
          icon={Wallet}
          delay={0.3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Savings Rate</p>
                  <h3 className="text-2xl font-bold mt-2">
                    {stats.savingsRate.toFixed(1)}%
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Of total income
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <PiggyBank className="w-6 h-6 text-blue-500" />
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
                  <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                  <h3 className="text-2xl font-bold mt-2">{stats.transactionCount}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total recorded
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Activity className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Transaction</p>
                  <h3 className="text-2xl font-bold mt-2">
                    {formatCurrency(stats.avgTransactionAmount)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per transaction
                  </p>
                </div>
                <div className="p-3 rounded-full bg-orange-500/10">
                  <CreditCard className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Burn</p>
                  <h3 className="text-2xl font-bold mt-2">
                    {formatCurrency(stats.monthlyBurnRate)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average per month
                  </p>
                </div>
                <div className="p-3 rounded-full bg-red-500/10">
                  <Target className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Top Spending Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.categorySpending.slice(0, 5).map((cat, idx) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{cat.category}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Statements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statements.slice(0, 5).map((statement) => (
                <div
                  key={statement.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{statement.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {statement.month} {statement.year}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-500">
                      <ArrowDownRight className="w-4 h-4 inline mr-1" />
                      {formatCurrency(statement.totalIncome)}
                    </p>
                    <p className="text-sm text-red-500">
                      <ArrowUpRight className="w-4 h-4 inline mr-1" />
                      {formatCurrency(statement.totalExpenses)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
