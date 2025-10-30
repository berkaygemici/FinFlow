"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, X, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { RecurringTransactionGroup } from "@/types";
import { confirmSubscription, removeSubscription } from "@/lib/subscription-manager";

interface SubscriptionOnboardingProps {
  subscriptions: RecurringTransactionGroup[];
  onComplete: () => void;
}

export default function SubscriptionOnboarding({
  subscriptions,
  onComplete,
}: SubscriptionOnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  const currentSubscription = subscriptions[currentIndex];
  const progress = ((currentIndex + 1) / subscriptions.length) * 100;

  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (currentSubscription && !isProcessing) {
      setIsProcessing(true);
      try {
        await confirmSubscription(currentSubscription);
        setConfirmedIds(new Set([...confirmedIds, currentSubscription.id]));
        // Wait a bit to ensure DB write completes
        await new Promise(resolve => setTimeout(resolve, 100));
        moveToNext();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = async () => {
    if (currentSubscription && !isProcessing) {
      setIsProcessing(true);
      try {
        await removeSubscription(currentSubscription.id);
        setRejectedIds(new Set([...rejectedIds, currentSubscription.id]));
        // Wait a bit to ensure DB write completes
        await new Promise(resolve => setTimeout(resolve, 100));
        moveToNext();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const moveToNext = () => {
    if (currentIndex < subscriptions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  if (!currentSubscription) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-primary" />
              <CardTitle>Detected Subscriptions</CardTitle>
            </div>
            <Badge variant="secondary">
              {currentIndex + 1} of {subscriptions.length}
            </Badge>
          </div>
          <CardDescription>
            The system has detected the following recurring transactions. Please confirm if they are subscriptions.
          </CardDescription>

          {/* Progress bar */}
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-4">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSubscription.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Subscription details */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold capitalize mb-1">
                      {currentSubscription.merchantName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentSubscription.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatCurrency(currentSubscription.averageAmount)}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {currentSubscription.frequency}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {currentSubscription.transactions.length} payments detected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      ±{currentSubscription.variance.toFixed(1)}% variance
                    </span>
                  </div>
                </div>

                {/* Recent transactions */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Recent Transactions:
                  </p>
                  <div className="space-y-1">
                    {currentSubscription.transactions.slice(-3).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4 mr-2" />
                  {isProcessing ? "Processing..." : "Not a Subscription"}
                </Button>
                <Button
                  variant="default"
                  className="flex-1 h-12"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isProcessing ? "Processing..." : "Confirm Subscription"}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Summary footer */}
      {(confirmedIds.size > 0 || rejectedIds.size > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-4 text-sm text-muted-foreground"
        >
          {confirmedIds.size > 0 && (
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-500" />
              <span>{confirmedIds.size} confirmed</span>
            </div>
          )}
          {rejectedIds.size > 0 && (
            <div className="flex items-center gap-1">
              <X className="w-4 h-4 text-red-500" />
              <span>{rejectedIds.size} rejected</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
