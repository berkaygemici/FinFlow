import { Transaction, RecurringTransactionGroup } from "@/types";

// Known subscription services for better detection
const KNOWN_SUBSCRIPTIONS = [
  "spotify", "netflix", "amazon prime", "amazon", "prime video", "disney", "hbo", "apple",
  "youtube", "google", "microsoft", "adobe", "dropbox", "icloud",
  "gym", "fitness", "mcfit", "fitnessstudio",
  "insurance", "versicherung", "barmer", "tk", "aok", "allianz", "mcv",
  "internet", "telekom", "vodafone", "o2", "1&1", "unitymedia",
  "miete", "rent", "vermietung", "landlord"
];

// Categories that should NEVER be marked as subscriptions
const EXCLUDED_CATEGORIES = [
  "Groceries",
  "Shopping",
  "Bars & Restaurants",
  "Transport",
  "Other"
];

// Keywords that indicate a merchant is NOT a subscription
const NON_SUBSCRIPTION_KEYWORDS = [
  "rewe", "edeka", "aldi", "lidl", "penny", "netto", "kaufland", // Grocery stores
  "restaurant", "cafe", "bar", "burger", "pizza", "mcdonald", // Food
  "uber", "taxi", "bvg", "transport", "tankstelle", "shell", "aral" // Transport
];

/**
 * Normalize merchant name from transaction description
 * Removes common prefixes, dates, and special characters
 */
export function normalizeMerchantName(description: string): string {
  let normalized = description.toLowerCase().trim();

  // Remove common N26 prefixes
  normalized = normalized.replace(/^(mastercard|lastschriften|gutschriften|belastungen)\s*/gi, '');

  // Remove IBAN/BIC references
  normalized = normalized.replace(/\b(iban|bic):\s*[a-z0-9]+/gi, '');

  // Remove dates (DD.MM.YYYY or DD/MM/YYYY)
  normalized = normalized.replace(/\b\d{2}[./]\d{2}[./]\d{4}\b/g, '');

  // Remove reference numbers (common patterns)
  normalized = normalized.replace(/\b(ref|reference|order|transaction)[:.\s]*[a-z0-9-]+/gi, '');

  // Remove amounts
  normalized = normalized.replace(/[+-]?\d+[.,]\d{2}\s*€?/g, '');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Extract the main merchant name (usually the first few words)
  const words = normalized.split(' ');
  if (words.length > 3) {
    normalized = words.slice(0, 3).join(' ');
  }

  return normalized;
}

/**
 * Calculate similarity between two merchant names (0-1)
 */
function calculateSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase();
  const s2 = name2.toLowerCase();

  // Exact match
  if (s1 === s2) return 1;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  // Check word overlap
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);

  if (commonWords.length > 0) {
    return 0.5 + (commonWords.length / Math.max(words1.length, words2.length)) * 0.5;
  }

  return 0;
}

/**
 * Calculate the difference in days between two dates
 */
function daysDifference(date1: Date, date2: Date): number {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determine if amounts are similar (within 5% variance for subscriptions, 15% for others)
 */
function areAmountsSimilar(amount1: number, amount2: number, isSubscription: boolean): boolean {
  const threshold = isSubscription ? 0.05 : 0.15; // 5% for subscriptions, 15% for others
  const diff = Math.abs(amount1 - amount2);
  const avg = (Math.abs(amount1) + Math.abs(amount2)) / 2;
  return diff / avg <= threshold;
}

/**
 * Detect if a merchant is likely a subscription service
 */
function isLikelySubscription(merchantName: string, category: string): boolean {
  const name = merchantName.toLowerCase();

  // Check if category is excluded
  if (EXCLUDED_CATEGORIES.includes(category)) {
    return false;
  }

  // Check if merchant has non-subscription keywords
  if (NON_SUBSCRIPTION_KEYWORDS.some(keyword => name.includes(keyword))) {
    return false;
  }

  // Check if in known subscriptions list
  return KNOWN_SUBSCRIPTIONS.some(sub => name.includes(sub));
}

/**
 * Check if this is a Lastschrift (direct debit) - these are usually subscriptions/bills
 */
function isLastschrift(description: string): boolean {
  return description.toLowerCase().includes('lastschrift');
}

/**
 * Determine the frequency of recurring transactions
 */
function detectFrequency(intervals: number[]): "weekly" | "monthly" | "yearly" | null {
  if (intervals.length < 2) return null;

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const maxDeviation = Math.max(...intervals.map(i => Math.abs(i - avgInterval)));

  // Allow 7 days deviation for detection
  const tolerance = 7;

  // Weekly: ~7 days (allow 3-11 days)
  if (avgInterval >= 3 && avgInterval <= 11 && maxDeviation <= tolerance) {
    return "weekly";
  }

  // Monthly: ~30 days (allow 25-35 days)
  if (avgInterval >= 25 && avgInterval <= 35 && maxDeviation <= tolerance) {
    return "monthly";
  }

  // Yearly: ~365 days (allow 350-380 days)
  if (avgInterval >= 350 && avgInterval <= 380 && maxDeviation <= tolerance * 2) {
    return "yearly";
  }

  return null;
}

/**
 * Calculate the next expected date for a recurring transaction
 */
function calculateNextExpectedDate(lastDate: Date, frequency: "weekly" | "monthly" | "yearly"): Date {
  const next = new Date(lastDate);

  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

/**
 * Main function to detect recurring transactions from all transactions
 */
export function detectRecurringTransactions(
  allTransactions: Transaction[]
): RecurringTransactionGroup[] {
  // Filter only expenses (negative amounts)
  const expenses = allTransactions.filter(t => t.type === "expense");

  // Normalize merchant names
  const transactionsWithMerchant = expenses.map(t => ({
    ...t,
    merchantName: normalizeMerchantName(t.description)
  }));

  // Group by similar merchant names and amounts
  const potentialGroups: Map<string, Transaction[]> = new Map();

  for (const transaction of transactionsWithMerchant) {
    const merchantName = transaction.merchantName || "";

    if (!merchantName || merchantName.length < 3) continue;

    let foundGroup = false;

    // Check if this transaction belongs to an existing group
    for (const [groupKey, groupTransactions] of Array.from(potentialGroups.entries())) {
      const firstTransaction = groupTransactions[0];
      const similarity = calculateSimilarity(merchantName, firstTransaction.merchantName || "");
      const isSubscription = isLikelySubscription(merchantName, transaction.category);

      if (
        similarity >= 0.8 && // Increased from 0.7 to be more strict
        areAmountsSimilar(transaction.amount, firstTransaction.amount, isSubscription)
      ) {
        groupTransactions.push(transaction);
        foundGroup = true;
        break;
      }
    }

    // Create new group if no match found
    if (!foundGroup) {
      potentialGroups.set(`${merchantName}_${Math.abs(transaction.amount).toFixed(2)}`, [transaction]);
    }
  }

  // Analyze groups to detect recurring patterns
  const recurringGroups: RecurringTransactionGroup[] = [];

  for (const [, transactions] of Array.from(potentialGroups.entries())) {
    // Need at least 3 transactions to confirm a pattern
    if (transactions.length < 3) continue;

    // Sort by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const lastTransaction = transactions[transactions.length - 1];
    const merchantName = lastTransaction.merchantName || normalizeMerchantName(lastTransaction.description);

    // Skip if category is excluded (groceries, shopping, etc.)
    if (EXCLUDED_CATEGORIES.includes(lastTransaction.category)) {
      continue;
    }

    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < transactions.length; i++) {
      const days = daysDifference(new Date(transactions[i].date), new Date(transactions[i - 1].date));
      intervals.push(days);
    }

    // Detect frequency
    const frequency = detectFrequency(intervals);

    if (!frequency) continue;

    // Calculate statistics
    const amounts = transactions.map(t => Math.abs(t.amount));
    const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const variance = ((maxAmount - minAmount) / averageAmount) * 100;

    // Determine if this is a subscription with stricter rules
    const isInKnownList = isLikelySubscription(merchantName, lastTransaction.category);
    const hasLowVariance = variance < 3; // Reduced from 5 to 3
    const isDirectDebit = transactions.some(t => isLastschrift(t.description));

    // A transaction is a subscription if:
    // 1. It's in the known subscriptions list, OR
    // 2. It's a Lastschrift (direct debit), OR
    // 3. It has very low variance (<3%) AND is monthly/yearly frequency
    const isSubscription = isInKnownList || isDirectDebit ||
                          (hasLowVariance && (frequency === "monthly" || frequency === "yearly"));

    // Mark all transactions in this group as recurring
    const groupId = crypto.randomUUID();
    transactions.forEach(t => {
      t.isRecurring = true;
      t.recurringGroupId = groupId;
      t.recurringFrequency = frequency;
      t.merchantName = merchantName;
    });

    recurringGroups.push({
      id: groupId,
      merchantName,
      category: lastTransaction.category,
      averageAmount,
      frequency,
      transactions,
      isSubscription,
      nextExpectedDate: calculateNextExpectedDate(new Date(lastTransaction.date), frequency),
      lastTransactionDate: new Date(lastTransaction.date),
      variance
    });
  }

  // Sort by average amount (highest first)
  recurringGroups.sort((a, b) => b.averageAmount - a.averageAmount);

  return recurringGroups;
}

/**
 * Get summary statistics for recurring transactions
 */
export function getRecurringSummary(groups: RecurringTransactionGroup[]) {
  const totalSubscriptions = groups.filter(g => g.isSubscription).length;
  const totalRecurring = groups.length;

  const monthlyTotal = groups.reduce((sum, group) => {
    const monthlyAmount = group.frequency === "monthly" ? group.averageAmount :
                         group.frequency === "weekly" ? group.averageAmount * 4.33 :
                         group.averageAmount / 12;
    return sum + monthlyAmount;
  }, 0);

  const yearlyTotal = monthlyTotal * 12;

  const byCategory = groups.reduce((acc, group) => {
    if (!acc[group.category]) {
      acc[group.category] = { count: 0, amount: 0 };
    }
    acc[group.category].count++;

    const monthlyAmount = group.frequency === "monthly" ? group.averageAmount :
                         group.frequency === "weekly" ? group.averageAmount * 4.33 :
                         group.averageAmount / 12;
    acc[group.category].amount += monthlyAmount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  return {
    totalSubscriptions,
    totalRecurring,
    monthlyTotal,
    yearlyTotal,
    byCategory,
    topSubscriptions: groups
      .filter(g => g.isSubscription)
      .slice(0, 5)
      .map(g => ({
        name: g.merchantName,
        amount: g.averageAmount,
        frequency: g.frequency
      }))
  };
}
