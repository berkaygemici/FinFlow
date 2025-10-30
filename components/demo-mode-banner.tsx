"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DemoModeBannerProps {
  onExitDemo: () => void;
}

export default function DemoModeBanner({ onExitDemo }: DemoModeBannerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExitDemo = async () => {
    setLoading(true);
    try {
      // Clear all data
      await db.statements.clear();
      await db.categoryRules.clear();
      await db.budgets.clear();
      await db.savedFilters.clear();
      await db.userSubscriptions.clear();

      // Update settings to disable demo mode
      await db.settings.put({
        id: "default",
        aiCategorizationEnabled: true,
        onboardingCompleted: true,
        isDemoMode: false,
      });

      toast.success("Demo mode exited successfully", {
        description: "All sample data has been cleared. You can now upload your own data.",
      });

      setShowDialog(false);
      onExitDemo();
    } catch (error) {
      console.error("Error exiting demo mode:", error);
      toast.error("Failed to exit demo mode", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="border-2 border-blue-500/50 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10">
          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">Demo Mode Active</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
                      Sample Data
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You're exploring with sample data. Ready to use your own financial data?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowDialog(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Start Real Application
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-orange-500" />
              Exit Demo Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                This will clear all sample data and prepare the application for your real financial data.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium text-foreground">What will happen:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>All sample transactions will be deleted</li>
                  <li>All sample statements will be removed</li>
                  <li>You'll start with a clean slate</li>
                  <li>You can then upload your real bank statements</li>
                </ul>
              </div>
              <p className="text-sm font-semibold">
                This action cannot be undone, but you can always reload sample data from settings.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Keep Demo Data</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExitDemo}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {loading ? "Clearing..." : "Clear & Start Fresh"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
