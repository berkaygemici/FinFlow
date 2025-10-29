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
import { CategorySpending } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { PieChartIcon } from "lucide-react";

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(0, 84%, 60%)",
  "hsl(48, 96%, 53%)",
  "hsl(262, 52%, 47%)",
  "hsl(31, 97%, 72%)",
  "hsl(199, 89%, 48%)",
  "hsl(326, 78%, 68%)",
  "hsl(45, 93%, 47%)",
  "hsl(168, 76%, 42%)",
];

export default function CategoriesPage() {
  const statements = useLiveQuery(() => db.statements.toArray());
  const [categoryData, setCategoryData] = useState<CategorySpending[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

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
                        fill={COLORS[index % COLORS.length]}
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
              <div className="space-y-4">
                {categoryData.map((cat, idx) => (
                  <motion.div
                    key={cat.category}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <div>
                        <p className="font-medium">{cat.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {cat.count} transaction{cat.count > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(cat.amount)}</p>
                      <Badge variant="secondary">
                        {cat.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
