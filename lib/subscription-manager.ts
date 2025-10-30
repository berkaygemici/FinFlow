import { db } from "./db";
import { UserSubscription, RecurringTransactionGroup, Transaction } from "@/types";
import { detectRecurringTransactions } from "./recurring-detector";
import { getRecurringGroups } from "./process-recurring";

/**
 * Add a subscription manually from a transaction
 */
export async function addSubscriptionFromTransaction(
  transaction: Transaction,
  frequency: "weekly" | "monthly" | "yearly"
): Promise<UserSubscription> {
  const merchantName = transaction.merchantName || transaction.description;

  const subscription: UserSubscription = {
    id: crypto.randomUUID(),
    merchantName,
    category: transaction.category,
    amount: transaction.amount,
    frequency,
    transactionIds: [transaction.id],
    isConfirmed: false, // User manually added
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.userSubscriptions.add(subscription);
  return subscription;
}

/**
 * Detect frequency from transaction dates
 */
function detectFrequencyFromTransactions(transactions: Transaction[]): "weekly" | "monthly" | "yearly" {
  if (transactions.length < 2) return "monthly"; // Default

  // Sort by date
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate intervals in days
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round(
      (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    intervals.push(days);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Weekly: ~7 days
  if (avgInterval >= 3 && avgInterval <= 14) {
    return "weekly";
  }
  // Yearly: ~365 days
  if (avgInterval >= 300) {
    return "yearly";
  }
  // Default to monthly
  return "monthly";
}

/**
 * Add a subscription from multiple transactions of the same vendor
 */
export async function addSubscriptionFromVendor(
  vendorName: string,
  transactions: Transaction[]
): Promise<UserSubscription> {
  if (transactions.length === 0) {
    throw new Error("No transactions provided");
  }

  // Calculate average amount
  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const averageAmount = totalAmount / transactions.length;

  // Auto-detect frequency
  const frequency = detectFrequencyFromTransactions(transactions);

  // Use the most common category
  const categoryCount: Record<string, number> = {};
  transactions.forEach(t => {
    categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
  });
  const category = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0];

  // Generate deterministic ID
  const subscriptionId = `${vendorName.replace(/\s+/g, '-')}_${frequency}_${Math.round(averageAmount * 100)}`;

  const subscription: UserSubscription = {
    id: subscriptionId,
    merchantName: vendorName,
    category,
    amount: averageAmount,
    frequency,
    transactionIds: transactions.map(t => t.id),
    isConfirmed: false, // User manually added
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.userSubscriptions.put(subscription);
  return subscription;
}

/**
 * Confirm (accept) an auto-detected subscription
 */
export async function confirmSubscription(
  group: RecurringTransactionGroup
): Promise<UserSubscription> {
  const subscription: UserSubscription = {
    id: group.id,
    merchantName: group.merchantName,
    category: group.category,
    amount: group.averageAmount,
    frequency: group.frequency,
    transactionIds: group.transactions.map((t) => t.id),
    isConfirmed: true, // User confirmed auto-detected
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.userSubscriptions.put(subscription);
  return subscription;
}

/**
 * Remove (hide) a subscription
 */
export async function removeSubscription(subscriptionId: string): Promise<void> {
  const subscription = await db.userSubscriptions.get(subscriptionId);

  if (subscription) {
    // Mark as hidden instead of deleting
    subscription.isHidden = true;
    subscription.updatedAt = new Date();
    await db.userSubscriptions.put(subscription);
  } else {
    // If it's an auto-detected subscription not yet in DB, add it as hidden
    const newSubscription: UserSubscription = {
      id: subscriptionId,
      merchantName: "",
      category: "",
      amount: 0,
      frequency: "monthly",
      transactionIds: [],
      isConfirmed: false,
      isHidden: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.userSubscriptions.add(newSubscription);
  }
}

/**
 * Restore a hidden subscription
 */
export async function restoreSubscription(subscriptionId: string): Promise<void> {
  const subscription = await db.userSubscriptions.get(subscriptionId);

  if (subscription) {
    subscription.isHidden = false;
    subscription.updatedAt = new Date();
    await db.userSubscriptions.put(subscription);
  }
}

/**
 * Delete a subscription permanently
 */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await db.userSubscriptions.delete(subscriptionId);
}

/**
 * Get all user-managed subscriptions (including hidden ones)
 */
export async function getUserSubscriptions(): Promise<UserSubscription[]> {
  return await db.userSubscriptions.toArray();
}

/**
 * Get visible (non-hidden) user subscriptions
 */
export async function getVisibleUserSubscriptions(): Promise<UserSubscription[]> {
  const allSubs = await db.userSubscriptions.toArray();
  return allSubs.filter(s => !s.isHidden);
}

/**
 * Merge auto-detected and user-managed subscriptions
 * - Remove auto-detected ones that user has hidden
 * - Add user-confirmed ones
 * - Mark user-managed ones appropriately
 */
export async function getMergedSubscriptions(): Promise<RecurringTransactionGroup[]> {
  // Get auto-detected recurring groups
  const autoDetected = await getRecurringGroups();

  // Get user subscriptions
  const userSubs = await getUserSubscriptions();

  // Create a map of hidden subscription IDs for quick lookup
  const hiddenIds = new Set(
    userSubs.filter((s) => s.isHidden).map((s) => s.id)
  );

  // Create a map of confirmed subscriptions
  const confirmedMap = new Map(
    userSubs
      .filter((s) => s.isConfirmed && !s.isHidden)
      .map((s) => [s.id, s])
  );

  // Create a map of manually added subscriptions (not from auto-detection)
  const manualSubs = userSubs.filter((s) => !s.isConfirmed && !s.isHidden);

  // Filter out hidden auto-detected subscriptions
  const visibleAutoDetected = autoDetected
    .filter((group) => !hiddenIds.has(group.id))
    .map((group) => {
      // Check if this was confirmed by user
      const userSub = confirmedMap.get(group.id);
      if (userSub) {
        return {
          ...group,
          isUserManaged: true,
        };
      }
      return group;
    });

  // Convert manually added subscriptions to RecurringTransactionGroup format
  const manualGroups: RecurringTransactionGroup[] = await Promise.all(
    manualSubs.map(async (sub) => {
      // Get the transactions for this subscription
      const statements = await db.statements.toArray();
      const allTransactions = statements.flatMap((s) => s.transactions);
      const transactions = allTransactions.filter((t) =>
        sub.transactionIds.includes(t.id)
      );

      const lastTransaction = transactions.length > 0
        ? transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;

      return {
        id: sub.id,
        merchantName: sub.merchantName,
        category: sub.category,
        averageAmount: sub.amount,
        frequency: sub.frequency,
        transactions: transactions,
        isSubscription: true,
        lastTransactionDate: lastTransaction ? new Date(lastTransaction.date) : new Date(),
        variance: 0,
        isUserManaged: true,
      };
    })
  );

  // Combine and sort by amount
  const merged = [...visibleAutoDetected, ...manualGroups];
  merged.sort((a, b) => b.averageAmount - a.averageAmount);

  return merged;
}

/**
 * Check if there are unconfirmed auto-detected subscriptions (for onboarding)
 */
export async function hasUnconfirmedSubscriptions(): Promise<boolean> {
  const autoDetected = await getRecurringGroups();
  const userSubs = await getUserSubscriptions();

  // Get IDs of all subscriptions user has interacted with
  const interactedIds = new Set(userSubs.map((s) => s.id));

  // Check if there are any auto-detected subscriptions user hasn't seen
  const unconfirmed = autoDetected.filter((group) => !interactedIds.has(group.id));

  return unconfirmed.length > 0;
}

/**
 * Get unconfirmed auto-detected subscriptions for onboarding
 */
export async function getUnconfirmedSubscriptions(): Promise<RecurringTransactionGroup[]> {
  const autoDetected = await getRecurringGroups();
  const userSubs = await getUserSubscriptions();

  // Get IDs of all subscriptions user has interacted with
  const interactedIds = new Set(userSubs.map((s) => s.id));

  // Filter to only unconfirmed
  return autoDetected.filter((group) => !interactedIds.has(group.id));
}
