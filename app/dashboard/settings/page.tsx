"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Download,
  FileDown,
} from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CategoryRule, DEFAULT_CATEGORIES } from "@/types";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function SettingsPage() {
  const categoryRules = useLiveQuery(() => db.categoryRules.toArray());
  const statements = useLiveQuery(() => db.statements.toArray());

  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    pattern: "",
    category: "",
  });

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

      {/* Export Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
        transition={{ delay: 0.2 }}
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
        transition={{ delay: 0.3 }}
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
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
