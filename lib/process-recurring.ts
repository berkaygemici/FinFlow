import { Statement, Transaction } from "@/types";
import { detectRecurringTransactions } from "./recurring-detector";
import { db } from "./db";

/**
 * Process all statements and mark recurring transactions
 * This should be called whenever statements are loaded or updated
 */
export async function processRecurringTransactions(statements: Statement[]): Promise<void> {
  // Collect all transactions from all statements
  const allTransactions: Transaction[] = [];

  statements.forEach(statement => {
    statement.transactions.forEach(transaction => {
      allTransactions.push(transaction);
    });
  });

  // Detect recurring patterns
  const recurringGroups = detectRecurringTransactions(allTransactions);

  // Update statements in the database with marked transactions
  // The detectRecurringTransactions function already modifies the transaction objects
  // So we just need to save the updated statements back to the database
  for (const statement of statements) {
    await db.statements.put(statement);
  }

  console.log(`Detected ${recurringGroups.length} recurring transaction groups`);
}

/**
 * Get all recurring transaction groups from current statements
 */
export async function getRecurringGroups() {
  const statements = await db.statements.toArray();

  // Collect all transactions
  const allTransactions: Transaction[] = [];
  statements.forEach(statement => {
    statement.transactions.forEach(transaction => {
      allTransactions.push(transaction);
    });
  });

  // Detect and return recurring groups
  return detectRecurringTransactions(allTransactions);
}
