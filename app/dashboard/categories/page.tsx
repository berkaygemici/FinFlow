"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategorySpending, Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PieChartIcon, ChevronDown, ChevronUp } from "lucide-react";
import categoriesConfig from "@/config/categories.json";

const getCategoryColor = (category: string): string => {
  return categoriesConfig.categoryColors[category as keyof typeof categoriesConfig.categoryColors] || "hsl(0, 0%, 60%)";
};

export default function CategoriesPage() {
  const statements = useLiveQuery(() => db.statements.toArray());
  const [categoryData, setCategoryData] = useState<CategorySpending[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!statements || statements.length === 0) return;

    const categoryMap = new Map<string, { amount: number; count: number }>();
    let total = 0;

    statements.forEach((statement) => {
      statement.transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const existing = categoryMap.get(t.category) || { amount: 0, count: 0 };
          categoryMap.set(t.category, {
            amount: existing.amount + t.amount,
            count: existing.count + 1,
          });
          total += t.amount;
        });
    });

    const data: CategorySpending[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / total) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    setCategoryData(data);
    setTotalExpenses(total);
  }, [statements]);

  // Get transactions for a specific category
  const getCategoryTransactions = (category: string) => {
    if (!statements) return [];

    const transactions: (Transaction & { statementMonth: string })[] = [];
    statements.forEach((statement) => {
      statement.transactions
        .filter((t) => t.type === "expense" && t.category === category)
        .forEach((transaction) => {
          transactions.push({
            ...transaction,
            statementMonth: `${statement.month} ${statement.year}`,
          });
        });
    });

    // Sort by date (newest first)
    return transactions.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  if (!statements || statements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <PieChartIcon className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Category Data</h2>
        <p className="text-muted-foreground">Upload statements to see category breakdown</p>
      </div>
    );
  }

  const pieData = categoryData.map((cat) => ({
    name: cat.category,
    value: cat.amount,
  }));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold">Spending by Category</h1>
        <p className="text-muted-foreground">
          Analyze where your money goes
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>
                Total Expenses: {formatCurrency(totalExpenses)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getCategoryColor(entry.name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoryData.map((cat, idx) => {
                  const isExpanded = selectedCategory === cat.category;
                  const transactions = isExpanded ? getCategoryTransactions(cat.category) : [];

                  return (
                    <motion.div
                      key={cat.category}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      className="rounded-lg border overflow-hidden"
                    >
                      <div
                        onClick={() => handleCategoryClick(cat.category)}
                        className={`flex items-center justify-between p-4 hover:bg-accent transition-colors cursor-pointer ${
                          isExpanded ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: getCategoryColor(cat.category) }}
                          />
                          <div>
                            <p className="font-medium">{cat.category}</p>
                            <p className="text-sm text-muted-foreground">
                              {cat.count} transaction{cat.count > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(cat.amount)}</p>
                            <Badge variant="secondary">
                              {cat.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t bg-muted/30"
                        >
                          <div className="p-4 space-y-2">
                            {transactions.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between p-3 rounded-md bg-card border hover:bg-accent transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate text-sm">{transaction.description}</p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span>{formatDate(transaction.date)}</span>
                                    <span className="hidden sm:inline">{transaction.statementMonth}</span>
                                    {transaction.originalCurrency && transaction.originalCurrency !== "EUR" && (
                                      <span>
                                        {transaction.originalAmount?.toFixed(2)} {transaction.originalCurrency}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="font-bold text-red-500">
                                    {formatCurrency(transaction.amount)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
