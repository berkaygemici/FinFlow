"use client";

import { useState, useMemo } from "react";
import { Search, Plus, X, ArrowRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { addSubscriptionFromVendor } from "@/lib/subscription-manager";

interface VendorGroup {
  vendorName: string;
  transactions: Transaction[];
  averageAmount: number;
  transactionCount: number;
  category: string;
}

interface SearchAddSubscriptionDialogProps {
  allTransactions: Transaction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function SearchAddSubscriptionDialog({
  allTransactions,
  open,
  onOpenChange,
  onSuccess,
}: SearchAddSubscriptionDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorGroup | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Filter out transactions that are already marked as recurring
  const availableTransactions = useMemo(() => {
    return allTransactions.filter(t =>
      t.type === "expense" &&
      !t.isRecurring // Only show non-recurring transactions
    );
  }, [allTransactions]);

  // Group transactions by vendor
  const vendorGroups = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    availableTransactions.forEach(transaction => {
      const vendorName = transaction.merchantName || transaction.description;
      if (!groups[vendorName]) {
        groups[vendorName] = [];
      }
      groups[vendorName].push(transaction);
    });

    // Convert to array and calculate metrics
    return Object.entries(groups).map(([vendorName, transactions]) => {
      const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const averageAmount = totalAmount / transactions.length;

      // Use the most common category
      const categoryCount: Record<string, number> = {};
      transactions.forEach(t => {
        categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
      });
      const category = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0];

      return {
        vendorName,
        transactions,
        averageAmount,
        transactionCount: transactions.length,
        category,
      };
    }).sort((a, b) => b.transactionCount - a.transactionCount); // Sort by transaction count
  }, [availableTransactions]);

  // Search and filter vendor groups
  const filteredVendorGroups = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const searchLower = searchTerm.toLowerCase();
    return vendorGroups
      .filter(group =>
        group.vendorName.toLowerCase().includes(searchLower) ||
        group.category.toLowerCase().includes(searchLower)
      )
      .slice(0, 20); // Limit to 20 results
  }, [vendorGroups, searchTerm]);

  const handleSelectVendor = (vendor: VendorGroup) => {
    setSelectedVendor(vendor);
  };

  const handleAdd = async () => {
    if (!selectedVendor) return;

    setIsAdding(true);
    try {
      await addSubscriptionFromVendor(selectedVendor.vendorName, selectedVendor.transactions);
      toast.success("Subscription added successfully", {
        description: `${selectedVendor.vendorName} has been added to your subscriptions.`,
      });
      onSuccess?.();
      onOpenChange(false);
      // Reset state
      setSearchTerm("");
      setSelectedVendor(null);
    } catch (error) {
      console.error("Error adding subscription:", error);
      toast.error("Failed to add subscription", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setSelectedVendor(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    setSelectedVendor(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Subscription
          </DialogTitle>
          <DialogDescription>
            {selectedVendor
              ? `Review all transactions from ${selectedVendor.vendorName}`
              : "Search for a merchant to mark as a subscription"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          {!selectedVendor ? (
            <>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by merchant name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {/* Vendor Groups Search Results */}
              {searchTerm.length > 0 && (
                <div className="space-y-2">
                  {filteredVendorGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No merchants found. Try a different search term.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Found {filteredVendorGroups.length} merchant{filteredVendorGroups.length !== 1 ? 's' : ''}
                      </p>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredVendorGroups.map((vendor) => (
                          <div
                            key={vendor.vendorName}
                            className="p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors group"
                            onClick={() => handleSelectVendor(vendor)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="font-medium truncate capitalize">{vendor.vendorName}</p>
                                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {vendor.category}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {vendor.transactionCount} transaction{vendor.transactionCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-3">
                                <p className="font-bold">{formatCurrency(vendor.averageAmount)}</p>
                                <p className="text-xs text-muted-foreground">avg per transaction</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected Vendor Details */}
              <div className="space-y-4">
                {/* Vendor Summary */}
                <div className="p-4 rounded-lg border bg-accent/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold capitalize mb-1">
                        {selectedVendor.vendorName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{selectedVendor.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {selectedVendor.transactionCount} payments found
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {formatCurrency(selectedVendor.averageAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">average amount</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total spent: <span className="font-medium text-foreground">
                        {formatCurrency(
                          selectedVendor.transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                {/* All Transactions */}
                <div>
                  <p className="text-sm font-medium mb-2">All Transactions:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedVendor.transactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{formatDate(transaction.date)}</p>
                              <p className="text-xs text-muted-foreground">{transaction.category}</p>
                            </div>
                          </div>
                          <p className="font-bold">{formatCurrency(transaction.amount)}</p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Info Message */}
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    The system will automatically detect the subscription frequency based on the transaction dates.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleBack}
                    disabled={isAdding}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAdd}
                    disabled={isAdding}
                  >
                    {isAdding ? "Adding..." : "Add as Subscription"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
