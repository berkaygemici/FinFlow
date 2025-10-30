"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Download,
  FileDown,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CategoryRule, DEFAULT_CATEGORIES, Settings } from "@/types";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function SettingsPage() {
  const categoryRules = useLiveQuery(() => db.categoryRules.toArray());
  const statements = useLiveQuery(() => db.statements.toArray());
  const settings = useLiveQuery(() => db.settings.get("default"));

  const [showAddRule, setShowAddRule] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [newRule, setNewRule] = useState({
    pattern: "",
    category: "",
  });

  // Initialize settings on mount
  useEffect(() => {
    const initSettings = async () => {
      const existingSettings = await db.settings.get("default");
      if (!existingSettings) {
        // Create default settings
        await db.settings.add({
          id: "default",
          aiCategorizationEnabled: false,
        });
        setAiEnabled(false);
      } else {
        setAiEnabled(existingSettings.aiCategorizationEnabled);
      }
    };
    initSettings();
  }, []);

  // Update state when settings change
  useEffect(() => {
    if (settings) {
      setAiEnabled(settings.aiCategorizationEnabled);
    }
  }, [settings]);

  const handleAddRule = async () => {
    if (!newRule.pattern || !newRule.category) return;

    const rule: CategoryRule = {
      id: `rule-${Date.now()}`,
      pattern: newRule.pattern,
      category: newRule.category,
      isRegex: false,
    };

    await db.categoryRules.add(rule);
    setNewRule({ pattern: "", category: "" });
    setShowAddRule(false);
  };

  const handleDeleteRule = async (id: string) => {
    await db.categoryRules.delete(id);
  };

  const handleToggleAI = async (enabled: boolean) => {
    await db.settings.put({
      id: "default",
      aiCategorizationEnabled: enabled,
    });
    setAiEnabled(enabled);
  };

  const handleDeleteAllData = async () => {
    await db.statements.clear();
    await db.categoryRules.clear();
    await db.budgets.clear();
    setShowDeleteConfirm(false);
  };

  const handleExportCSV = () => {
    if (!statements || statements.length === 0) return;

    const allTransactions = statements.flatMap((statement) =>
      statement.transactions.map((t) => ({
        Date: t.date.toLocaleDateString(),
        Description: t.description,
        Category: t.category,
        Amount: t.amount,
        Type: t.type,
        Currency: t.currency,
        Month: statement.month,
        Year: statement.year,
      }))
    );

    const csv = Papa.unparse(allTransactions);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-export.csv";
    a.click();
  };

  const handleExportPDF = async () => {
    if (!statements || statements.length === 0) return;

    const pdf = new jsPDF();
    let yPosition = 20;

    pdf.setFontSize(20);
    pdf.text("Financial Report", 20, yPosition);
    yPosition += 15;

    statements.forEach((statement) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text(`${statement.month} ${statement.year}`, 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.text(`Income: €${statement.totalIncome.toFixed(2)}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Expenses: €${statement.totalExpenses.toFixed(2)}`, 20, yPosition);
      yPosition += 7;
      pdf.text(
        `Net: €${(statement.totalIncome - statement.totalExpenses).toFixed(2)}`,
        20,
        yPosition
      );
      yPosition += 15;
    });

    pdf.save("finance-report.pdf");
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and export data
        </p>
      </motion.div>

      {/* AI Categorization Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle>AI Categorization</CardTitle>
            </div>
            <CardDescription>
              Use AI to automatically categorize transactions based on their descriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex-1">
                <p className="font-medium mb-1">Enable AI Categorization</p>
                <p className="text-sm text-muted-foreground">
                  When enabled, AI will analyze transaction descriptions and assign categories automatically.
                  If AI cannot determine a category, it will default to "Other".
                </p>
              </div>
              <Switch
                checked={aiEnabled}
                onCheckedChange={handleToggleAI}
                className="ml-4"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Export Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download your financial data</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={handleExportCSV} variant="outline">
              <FileDown className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
            <Button onClick={handleExportPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export as PDF
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Rules Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Category Rules</CardTitle>
                <CardDescription>
                  Automatically categorize transactions based on keywords
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddRule(!showAddRule)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddRule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-6 p-4 border rounded-lg"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Keyword/Pattern
                    </label>
                    <Input
                      placeholder="e.g., REWE, Amazon"
                      value={newRule.pattern}
                      onChange={(e) =>
                        setNewRule({ ...newRule, pattern: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Category
                    </label>
                    <select
                      value={newRule.category}
                      onChange={(e) =>
                        setNewRule({ ...newRule, category: e.target.value })
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
                  <div className="flex items-end gap-2">
                    <Button onClick={handleAddRule} className="flex-1">
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddRule(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {!categoryRules || categoryRules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No category rules yet. Add rules to automatically categorize transactions.
              </div>
            ) : (
              <div className="space-y-2">
                {categoryRules.map((rule, idx) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{rule.pattern}</Badge>
                      <span className="text-sm text-muted-foreground">→</span>
                      <Badge>{rule.category}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Manage your stored data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Statements</p>
                  <p className="text-sm text-muted-foreground">
                    {statements?.length || 0} statement(s) stored
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Storage</p>
                  <p className="text-sm text-muted-foreground">
                    All data is stored locally in your browser
                  </p>
                </div>
              </div>

              {/* Delete All Data Section */}
              <div className="pt-4 border-t">
                <div className="flex items-start justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <p className="font-medium text-destructive">Danger Zone</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete all your financial data including statements, transactions, category rules, and budgets. This action cannot be undone.
                    </p>
                    {!showDeleteConfirm ? (
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All Data
                      </Button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2"
                      >
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAllData}
                        >
                          Confirm Delete
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
