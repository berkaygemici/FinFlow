"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { Plus, AlertCircle, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Budget, BudgetAlert, DEFAULT_CATEGORIES } from "@/types";
import { formatCurrency } from "@/lib/utils";

export default function BudgetsPage() {
  const budgets = useLiveQuery(() => db.budgets.toArray());
  const statements = useLiveQuery(() => db.statements.toArray());

  const [showAddForm, setShowAddForm] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category: "",
    amount: "",
  });

  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

  useEffect(() => {
    if (!budgets || !statements || statements.length === 0) return;

    // Calculate spending per category from all statements
    const categorySpending = new Map<string, number>();
    statements.forEach((statement) => {
      statement.transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const current = categorySpending.get(t.category) || 0;
          categorySpending.set(t.category, current + t.amount);
        });
    });

    // Create alerts for each budget
    const alerts: BudgetAlert[] = budgets.map((budget) => {
      const spent = categorySpending.get(budget.category) || 0;
      const percentage = (spent / budget.amount) * 100;

      let status: "ok" | "warning" | "exceeded" = "ok";
      if (percentage >= 100) status = "exceeded";
      else if (percentage >= 80) status = "warning";

      return {
        category: budget.category,
        budget: budget.amount,
        spent,
        percentage,
        status,
      };
    });

    setBudgetAlerts(alerts);
  }, [budgets, statements]);

  const handleAddBudget = async () => {
    if (!newBudget.category || !newBudget.amount) return;

    const budget: Budget = {
      id: `budget-${Date.now()}`,
      category: newBudget.category,
      amount: parseFloat(newBudget.amount),
      period: "monthly",
    };

    await db.budgets.add(budget);
    setNewBudget({ category: "", amount: "" });
    setShowAddForm(false);
  };

  const handleDeleteBudget = async (id: string) => {
    await db.budgets.delete(id);
  };

  const getStatusIcon = (status: BudgetAlert["status"]) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "exceeded":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: BudgetAlert["status"]) => {
    switch (status) {
      case "ok":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "exceeded":
        return "bg-red-500";
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Budget Tracking</h1>
          <p className="text-muted-foreground">
            Set spending limits and track your progress
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </motion.div>

      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Create New Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <select
                    value={newBudget.category}
                    onChange={(e) =>
                      setNewBudget({ ...newBudget, category: e.target.value })
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select category</option>
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Amount (€)</label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={newBudget.amount}
                    onChange={(e) =>
                      setNewBudget({ ...newBudget, amount: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleAddBudget} className="flex-1">
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!budgets || budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Budgets Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first budget to start tracking your spending limits
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgetAlerts.map((alert, idx) => {
            const budget = budgets?.find((b) => b.category === alert.category);
            if (!budget) return null;

            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(alert.status)}
                        <CardTitle className="text-lg">{alert.category}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBudget(budget.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(alert.spent)} of {formatCurrency(alert.budget)}
                        </span>
                        <Badge
                          variant={alert.status === "exceeded" ? "destructive" : "secondary"}
                        >
                          {alert.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress
                        value={alert.spent}
                        max={alert.budget}
                        indicatorClassName={getStatusColor(alert.status)}
                      />
                    </div>

                    {alert.status === "warning" && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                          You've used {alert.percentage.toFixed(0)}% of your budget
                        </p>
                      </div>
                    )}

                    {alert.status === "exceeded" && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Budget exceeded by {formatCurrency(alert.spent - alert.budget)}
                        </p>
                      </div>
                    )}

                    {alert.status === "ok" && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <p className="text-sm text-green-600 dark:text-green-400">
                          You're on track! {formatCurrency(alert.budget - alert.spent)} remaining
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
