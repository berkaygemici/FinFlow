"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { addSubscriptionFromTransaction } from "@/lib/subscription-manager";

interface AddSubscriptionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddSubscriptionDialog({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: AddSubscriptionDialogProps) {
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!transaction) return;

    setIsAdding(true);
    try {
      await addSubscriptionFromTransaction(transaction, frequency);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding subscription:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Mark as Subscription
          </DialogTitle>
          <DialogDescription>
            Add this transaction to your subscriptions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Details */}
          <div className="p-4 rounded-lg border bg-accent/50">
            <p className="font-medium mb-1">{transaction.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{transaction.category}</span>
              <span className="font-bold">{formatCurrency(transaction.amount)}</span>
            </div>
          </div>

          {/* Frequency Selection */}
          <div className="space-y-3">
            <Label>How often does this subscription recur?</Label>
            <RadioGroup value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="cursor-pointer font-normal">
                  Weekly
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="cursor-pointer font-normal">
                  Monthly
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="yearly" />
                <Label htmlFor="yearly" className="cursor-pointer font-normal">
                  Yearly
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding}>
            {isAdding ? "Adding..." : "Add Subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
