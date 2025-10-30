import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/lib/db'
import {
  addSubscriptionFromTransaction,
  addSubscriptionFromVendor,
  confirmSubscription,
  removeSubscription,
  restoreSubscription,
  deleteSubscription,
  getUserSubscriptions,
  getVisibleUserSubscriptions,
  getMergedSubscriptions,
  hasUnconfirmedSubscriptions,
  getUnconfirmedSubscriptions,
} from '@/lib/subscription-manager'
import { Transaction, RecurringTransactionGroup, Statement } from '@/types'

// Mock crypto.randomUUID to generate unique IDs in tests
let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
})

const createTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: '1',
  description: 'Test Transaction',
  date: new Date('2024-01-15'),
  amount: -100,
  currency: 'EUR',
  category: 'Shopping',
  type: 'expense',
  ...overrides,
})

const createRecurringGroup = (
  overrides: Partial<RecurringTransactionGroup>
): RecurringTransactionGroup => ({
  id: 'group-1',
  merchantName: 'Test Merchant',
  category: 'Entertainment',
  averageAmount: 15.99,
  frequency: 'monthly',
  transactions: [],
  isSubscription: true,
  lastTransactionDate: new Date('2024-01-15'),
  variance: 0,
  ...overrides,
})

describe('subscription-manager integration tests', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.statements.clear()
    await db.userSubscriptions.clear()
    // Reset UUID counter
    uuidCounter = 0
  })

  describe('addSubscriptionFromTransaction', () => {
    it('should add a subscription from a single transaction', async () => {
      const transaction = createTransaction({
        id: 'trans-1',
        description: 'Netflix Subscription',
        amount: -15.99,
        category: 'Entertainment',
        merchantName: 'netflix',
      })

      const result = await addSubscriptionFromTransaction(transaction, 'monthly')

      expect(result).toBeDefined()
      expect(result.merchantName).toBe('netflix')
      expect(result.amount).toBe(-15.99)
      expect(result.frequency).toBe('monthly')
      expect(result.isConfirmed).toBe(false)
      expect(result.isHidden).toBe(false)
      expect(result.transactionIds).toContain('trans-1')
    })

    it('should use description if merchantName is not set', async () => {
      const transaction = createTransaction({
        id: 'trans-1',
        description: 'Spotify Premium',
        amount: -9.99,
        category: 'Entertainment',
      })

      const result = await addSubscriptionFromTransaction(transaction, 'monthly')

      expect(result.merchantName).toBe('Spotify Premium')
    })

    it('should save subscription to database', async () => {
      const transaction = createTransaction({
        id: 'trans-1',
        description: 'Test Subscription',
      })

      await addSubscriptionFromTransaction(transaction, 'monthly')

      const subscriptions = await db.userSubscriptions.toArray()
      expect(subscriptions).toHaveLength(1)
    })

    it('should set correct dates', async () => {
      const transaction = createTransaction({ id: 'trans-1' })

      const result = await addSubscriptionFromTransaction(transaction, 'monthly')

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('addSubscriptionFromVendor', () => {
    it('should add a subscription from multiple transactions', async () => {
      const transactions = [
        createTransaction({
          id: 'trans-1',
          amount: -15.99,
          category: 'Entertainment',
        }),
        createTransaction({
          id: 'trans-2',
          amount: -15.99,
          category: 'Entertainment',
        }),
      ]

      const result = await addSubscriptionFromVendor('Netflix', transactions)

      expect(result.merchantName).toBe('Netflix')
      expect(result.amount).toBe(15.99) // Average absolute value
      expect(result.transactionIds).toHaveLength(2)
    })

    it('should calculate average amount correctly', async () => {
      const transactions = [
        createTransaction({ id: 'trans-1', amount: -10 }),
        createTransaction({ id: 'trans-2', amount: -20 }),
        createTransaction({ id: 'trans-3', amount: -30 }),
      ]

      const result = await addSubscriptionFromVendor('Test Vendor', transactions)

      expect(result.amount).toBe(20) // (10 + 20 + 30) / 3
    })

    it('should detect monthly frequency', async () => {
      const transactions = [
        createTransaction({ id: '1', date: new Date('2024-01-15') }),
        createTransaction({ id: '2', date: new Date('2024-02-15') }),
      ]

      const result = await addSubscriptionFromVendor('Test', transactions)

      expect(result.frequency).toBe('monthly')
    })

    it('should detect weekly frequency', async () => {
      const transactions = [
        createTransaction({ id: '1', date: new Date('2024-01-01') }),
        createTransaction({ id: '2', date: new Date('2024-01-08') }),
        createTransaction({ id: '3', date: new Date('2024-01-15') }),
      ]

      const result = await addSubscriptionFromVendor('Test', transactions)

      expect(result.frequency).toBe('weekly')
    })

    it('should detect yearly frequency', async () => {
      const transactions = [
        createTransaction({ id: '1', date: new Date('2023-01-15') }),
        createTransaction({ id: '2', date: new Date('2024-01-15') }),
      ]

      const result = await addSubscriptionFromVendor('Test', transactions)

      expect(result.frequency).toBe('yearly')
    })

    it('should use most common category', async () => {
      const transactions = [
        createTransaction({ id: '1', category: 'Entertainment' }),
        createTransaction({ id: '2', category: 'Entertainment' }),
        createTransaction({ id: '3', category: 'Shopping' }),
      ]

      const result = await addSubscriptionFromVendor('Test', transactions)

      expect(result.category).toBe('Entertainment')
    })

    it('should throw error if no transactions provided', async () => {
      await expect(addSubscriptionFromVendor('Test', [])).rejects.toThrow(
        'No transactions provided'
      )
    })

    it('should generate deterministic ID', async () => {
      const transactions = [
        createTransaction({ id: '1', amount: -15.99 }),
        createTransaction({ id: '2', amount: -15.99 }),
      ]

      const result = await addSubscriptionFromVendor('Netflix', transactions)

      expect(result.id).toBe('Netflix_monthly_1599')
    })
  })

  describe('confirmSubscription', () => {
    it('should confirm an auto-detected subscription', async () => {
      const group = createRecurringGroup({
        id: 'group-1',
        merchantName: 'Netflix',
        transactions: [createTransaction({ id: 'trans-1' })],
      })

      const result = await confirmSubscription(group)

      expect(result.isConfirmed).toBe(true)
      expect(result.isHidden).toBe(false)
      expect(result.id).toBe('group-1')
    })

    it('should save confirmed subscription to database', async () => {
      const group = createRecurringGroup({ id: 'group-1' })

      await confirmSubscription(group)

      const subscription = await db.userSubscriptions.get('group-1')
      expect(subscription).toBeDefined()
      expect(subscription?.isConfirmed).toBe(true)
    })

    it('should use put to allow updates', async () => {
      const group = createRecurringGroup({ id: 'group-1' })

      // Confirm twice
      await confirmSubscription(group)
      await confirmSubscription(group)

      const subscriptions = await db.userSubscriptions.toArray()
      expect(subscriptions).toHaveLength(1) // Should not duplicate
    })
  })

  describe('removeSubscription', () => {
    it('should hide an existing subscription', async () => {
      const transaction = createTransaction({ id: 'trans-1' })
      const subscription = await addSubscriptionFromTransaction(transaction, 'monthly')

      await removeSubscription(subscription.id)

      const updated = await db.userSubscriptions.get(subscription.id)
      expect(updated?.isHidden).toBe(true)
    })

    it('should create hidden entry for non-existent subscription', async () => {
      await removeSubscription('non-existent-id')

      const subscription = await db.userSubscriptions.get('non-existent-id')
      expect(subscription).toBeDefined()
      expect(subscription?.isHidden).toBe(true)
    })

    it('should update the updatedAt timestamp', async () => {
      const transaction = createTransaction({ id: 'trans-1' })
      const subscription = await addSubscriptionFromTransaction(transaction, 'monthly')
      const originalUpdatedAt = subscription.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await removeSubscription(subscription.id)

      const updated = await db.userSubscriptions.get(subscription.id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('restoreSubscription', () => {
    it('should restore a hidden subscription', async () => {
      const transaction = createTransaction({ id: 'trans-1' })
      const subscription = await addSubscriptionFromTransaction(transaction, 'monthly')

      await removeSubscription(subscription.id)
      await restoreSubscription(subscription.id)

      const restored = await db.userSubscriptions.get(subscription.id)
      expect(restored?.isHidden).toBe(false)
    })

    it('should update updatedAt timestamp', async () => {
      const transaction = createTransaction({ id: 'trans-1' })
      const subscription = await addSubscriptionFromTransaction(transaction, 'monthly')
      await removeSubscription(subscription.id)

      const hidden = await db.userSubscriptions.get(subscription.id)
      const hiddenUpdatedAt = hidden?.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))

      await restoreSubscription(subscription.id)

      const restored = await db.userSubscriptions.get(subscription.id)
      expect(restored?.updatedAt.getTime()).toBeGreaterThan(hiddenUpdatedAt!.getTime())
    })

    it('should handle non-existent subscription gracefully', async () => {
      await expect(restoreSubscription('non-existent')).resolves.not.toThrow()
    })
  })

  describe('deleteSubscription', () => {
    it('should permanently delete a subscription', async () => {
      const transaction = createTransaction({ id: 'trans-1' })
      const subscription = await addSubscriptionFromTransaction(transaction, 'monthly')

      await deleteSubscription(subscription.id)

      const deleted = await db.userSubscriptions.get(subscription.id)
      expect(deleted).toBeUndefined()
    })

    it('should handle non-existent subscription gracefully', async () => {
      await expect(deleteSubscription('non-existent')).resolves.not.toThrow()
    })
  })

  describe('getUserSubscriptions', () => {
    it('should return all subscriptions including hidden', async () => {
      const trans1 = createTransaction({ id: 'trans-1' })
      const trans2 = createTransaction({ id: 'trans-2' })

      const sub1 = await addSubscriptionFromTransaction(trans1, 'monthly')
      const sub2 = await addSubscriptionFromTransaction(trans2, 'monthly')

      await removeSubscription(sub2.id)

      const subscriptions = await getUserSubscriptions()

      expect(subscriptions).toHaveLength(2)
    })

    it('should return empty array when no subscriptions', async () => {
      const subscriptions = await getUserSubscriptions()
      expect(subscriptions).toHaveLength(0)
    })
  })

  describe('getVisibleUserSubscriptions', () => {
    it('should return only non-hidden subscriptions', async () => {
      const trans1 = createTransaction({ id: 'trans-1' })
      const trans2 = createTransaction({ id: 'trans-2' })

      const sub1 = await addSubscriptionFromTransaction(trans1, 'monthly')
      const sub2 = await addSubscriptionFromTransaction(trans2, 'monthly')

      await removeSubscription(sub2.id)

      const visible = await getVisibleUserSubscriptions()

      expect(visible).toHaveLength(1)
      expect(visible[0].id).toBe(sub1.id)
    })

    it('should return empty array when all subscriptions are hidden', async () => {
      const trans = createTransaction({ id: 'trans-1' })
      const sub = await addSubscriptionFromTransaction(trans, 'monthly')

      await removeSubscription(sub.id)

      const visible = await getVisibleUserSubscriptions()
      expect(visible).toHaveLength(0)
    })
  })

  describe('getMergedSubscriptions', () => {
    it('should merge auto-detected and user-managed subscriptions', async () => {
      // Add a statement with transactions to trigger auto-detection
      const statement: Statement = {
        id: 'stmt-1',
        fileName: 'test.pdf',
        uploadDate: new Date(),
        month: 'January',
        year: 2024,
        openingBalance: 1000,
        closingBalance: 900,
        totalIncome: 0,
        totalExpenses: 100,
        transactions: [
          createTransaction({
            id: 'trans-1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: 'trans-2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ],
      }

      await db.statements.add(statement)

      // Add a manually added subscription
      const manualTrans = createTransaction({ id: 'manual-trans-1' })
      await addSubscriptionFromTransaction(manualTrans, 'monthly')

      const merged = await getMergedSubscriptions()

      expect(merged.length).toBeGreaterThan(0)
    })

    it('should filter out hidden auto-detected subscriptions', async () => {
      const statement: Statement = {
        id: 'stmt-1',
        fileName: 'test.pdf',
        uploadDate: new Date(),
        month: 'January',
        year: 2024,
        openingBalance: 1000,
        closingBalance: 900,
        totalIncome: 0,
        totalExpenses: 100,
        transactions: [
          createTransaction({
            id: 'trans-1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: 'trans-2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ],
      }

      await db.statements.add(statement)

      // Get the auto-detected subscription ID and hide it
      const merged1 = await getMergedSubscriptions()
      if (merged1.length > 0) {
        await removeSubscription(merged1[0].id)
      }

      const merged2 = await getMergedSubscriptions()

      // Should be fewer subscriptions after hiding
      expect(merged2.length).toBeLessThan(merged1.length)
    })

    it('should mark confirmed subscriptions as user-managed', async () => {
      const statement: Statement = {
        id: 'stmt-1',
        fileName: 'test.pdf',
        uploadDate: new Date(),
        month: 'January',
        year: 2024,
        openingBalance: 1000,
        closingBalance: 900,
        totalIncome: 0,
        totalExpenses: 100,
        transactions: [
          createTransaction({
            id: 'trans-1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: 'trans-2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ],
      }

      await db.statements.add(statement)

      const merged1 = await getMergedSubscriptions()
      if (merged1.length > 0) {
        await confirmSubscription(merged1[0])
      }

      const merged2 = await getMergedSubscriptions()

      const confirmed = merged2.find((s) => s.merchantName === merged1[0].merchantName)
      expect(confirmed?.isUserManaged).toBe(true)
    })

    it('should sort merged subscriptions by amount descending', async () => {
      const trans1 = createTransaction({ id: 'trans-1', amount: -10 })
      const trans2 = createTransaction({ id: 'trans-2', amount: -50 })

      await addSubscriptionFromTransaction(trans1, 'monthly')
      await addSubscriptionFromTransaction(trans2, 'monthly')

      const merged = await getMergedSubscriptions()

      if (merged.length >= 2) {
        expect(merged[0].averageAmount).toBeGreaterThanOrEqual(merged[1].averageAmount)
      }
    })
  })

  describe('hasUnconfirmedSubscriptions', () => {
    it('should return true when there are unconfirmed subscriptions', async () => {
      const statement: Statement = {
        id: 'stmt-1',
        fileName: 'test.pdf',
        uploadDate: new Date(),
        month: 'January',
        year: 2024,
        openingBalance: 1000,
        closingBalance: 900,
        totalIncome: 0,
        totalExpenses: 100,
        transactions: [
          createTransaction({
            id: 'trans-1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: 'trans-2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ],
      }

      await db.statements.add(statement)

      const hasUnconfirmed = await hasUnconfirmedSubscriptions()

      expect(hasUnconfirmed).toBe(true)
    })

    it('should return false when all subscriptions are confirmed', async () => {
      const statement: Statement = {
        id: 'stmt-1',
        fileName: 'test.pdf',
        uploadDate: new Date(),
        month: 'January',
        year: 2024,
        openingBalance: 1000,
        closingBalance: 900,
        totalIncome: 0,
        totalExpenses: 100,
        transactions: [
          createTransaction({
            id: 'trans-1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: 'trans-2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ],
      }

      await db.statements.add(statement)

      const groups = await getUnconfirmedSubscriptions()
      for (const group of groups) {
        await confirmSubscription(group)
      }

      const hasUnconfirmed = await hasUnconfirmedSubscriptions()

      expect(hasUnconfirmed).toBe(false)
    })
  })

  describe('getUnconfirmedSubscriptions', () => {
    it('should return unconfirmed auto-detected subscriptions', async () => {
      const statement: Statement = {
        id: 'stmt-1',
        fileName: 'test.pdf',
        uploadDate: new Date(),
        month: 'January',
        year: 2024,
        openingBalance: 1000,
        closingBalance: 900,
        totalIncome: 0,
        totalExpenses: 100,
        transactions: [
          createTransaction({
            id: 'trans-1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: 'trans-2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ],
      }

      await db.statements.add(statement)

      const unconfirmed = await getUnconfirmedSubscriptions()

      expect(unconfirmed.length).toBeGreaterThan(0)
    })

    it('should not return confirmed subscriptions', async () => {
      const statement: Statement = {
        id: 'stmt-1',
        fileName: 'test.pdf',
        uploadDate: new Date(),
        month: 'January',
        year: 2024,
        openingBalance: 1000,
        closingBalance: 900,
        totalIncome: 0,
        totalExpenses: 100,
        transactions: [
          createTransaction({
            id: 'trans-1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: 'trans-2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ],
      }

      await db.statements.add(statement)

      const unconfirmed1 = await getUnconfirmedSubscriptions()
      for (const group of unconfirmed1) {
        await confirmSubscription(group)
      }

      const unconfirmed2 = await getUnconfirmedSubscriptions()

      expect(unconfirmed2).toHaveLength(0)
    })
  })
})
