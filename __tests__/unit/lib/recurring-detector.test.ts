import { describe, it, expect } from 'vitest'
import {
  normalizeMerchantName,
  detectRecurringTransactions,
  getRecurringSummary,
} from '@/lib/recurring-detector'
import { Transaction } from '@/types'

// Helper function to create test transactions
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

describe('recurring-detector', () => {
  describe('normalizeMerchantName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeMerchantName('NETFLIX')).toBe('netflix')
    })

    it('should remove common N26 prefixes', () => {
      expect(normalizeMerchantName('Mastercard Netflix Subscription')).toBe('netflix subscription')
      expect(normalizeMerchantName('LASTSCHRIFTEN Spotify Premium')).toBe('spotify premium')
      expect(normalizeMerchantName('Gutschriften Amazon Prime')).toBe('amazon prime')
    })

    it('should remove IBAN/BIC references', () => {
      expect(normalizeMerchantName('Netflix IBAN: DE123456')).toBe('netflix')
      expect(normalizeMerchantName('Spotify BIC: ABCD1234')).toBe('spotify')
    })

    it('should remove dates', () => {
      expect(normalizeMerchantName('Netflix 15.01.2024')).toBe('netflix')
      expect(normalizeMerchantName('Spotify 15/01/2024')).toBe('spotify')
    })

    it('should remove reference numbers', () => {
      expect(normalizeMerchantName('Netflix REF: 123456')).toBe('netflix')
      expect(normalizeMerchantName('Spotify Order: ABC-123')).toBe('spotify')
      expect(normalizeMerchantName('Amazon Transaction: TX123')).toBe('amazon')
    })

    it('should remove amounts', () => {
      expect(normalizeMerchantName('Netflix 15.99€')).toBe('netflix')
      expect(normalizeMerchantName('Spotify -9,99 €')).toBe('spotify')
      expect(normalizeMerchantName('Amazon +50.00')).toBe('amazon')
    })

    it('should limit to first 3 words', () => {
      expect(normalizeMerchantName('This Is A Very Long Merchant Name')).toBe('this is a')
    })

    it('should handle complex real-world descriptions', () => {
      const result = normalizeMerchantName(
        'Mastercard NETFLIX EUROPE B.V. REF: 123456 15.01.2024 15.99€'
      )
      expect(result).toBe('netflix europe b.v.')
    })

    it('should trim whitespace', () => {
      expect(normalizeMerchantName('  Netflix  ')).toBe('netflix')
    })

    it('should handle empty strings', () => {
      expect(normalizeMerchantName('')).toBe('')
    })

    it('should handle special characters', () => {
      expect(normalizeMerchantName('Netflix & Co.')).toBe('netflix & co.')
    })
  })

  describe('detectRecurringTransactions', () => {
    describe('basic detection', () => {
      it('should detect monthly subscriptions', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Netflix Subscription',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Netflix Subscription',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '3',
            description: 'Netflix Subscription',
            date: new Date('2024-03-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(1)
        expect(result[0].merchantName).toBe('netflix subscription')
        expect(result[0].frequency).toBe('monthly')
        expect(result[0].transactions).toHaveLength(3)
        expect(result[0].isSubscription).toBe(true)
      })

      it('should detect weekly recurring transactions', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Gym Membership',
            date: new Date('2024-01-01'),
            amount: -25,
            category: 'Health & Fitness',
          }),
          createTransaction({
            id: '2',
            description: 'Gym Membership',
            date: new Date('2024-01-08'),
            amount: -25,
            category: 'Health & Fitness',
          }),
          createTransaction({
            id: '3',
            description: 'Gym Membership',
            date: new Date('2024-01-15'),
            amount: -25,
            category: 'Health & Fitness',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(1)
        expect(result[0].frequency).toBe('weekly')
      })

      it('should detect yearly subscriptions', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Amazon Prime Annual',
            date: new Date('2023-01-15'),
            amount: -89.99,
            category: 'Subscriptions', // Changed from Shopping (excluded category)
          }),
          createTransaction({
            id: '2',
            description: 'Amazon Prime Annual',
            date: new Date('2024-01-15'),
            amount: -89.99,
            category: 'Subscriptions',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(1)
        expect(result[0].frequency).toBe('yearly')
      })

      it('should detect subscriptions with only 2 transactions', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Spotify Premium',
            date: new Date('2024-01-15'),
            amount: -9.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Spotify Premium',
            date: new Date('2024-02-15'),
            amount: -9.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(1)
        expect(result[0].transactions).toHaveLength(2)
        expect(result[0].frequency).toBe('monthly')
      })
    })

    describe('merchant name variations', () => {
      it('should group similar merchant names', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Netflix Inc',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '3',
            description: 'NETFLIX SUBSCRIPTION',
            date: new Date('2024-03-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(1)
        expect(result[0].transactions).toHaveLength(3)
      })

      it('should handle merchant names with noise', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Mastercard Spotify Premium REF:123 10.01.2024',
            date: new Date('2024-01-10'),
            amount: -9.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Spotify Premium Order:456 10.02.2024 -9.99€',
            date: new Date('2024-02-10'),
            amount: -9.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(1)
        expect(result[0].transactions).toHaveLength(2)
      })
    })

    describe('amount variance', () => {
      it('should detect subscriptions with slight amount variations', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -16.05, // Slight variation
            category: 'Entertainment',
          }),
          createTransaction({
            id: '3',
            description: 'Netflix',
            date: new Date('2024-03-15'),
            amount: -15.95, // Slight variation
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(1)
        expect(result[0].variance).toBeLessThan(1) // Less than 1% variance
      })

      it('should NOT group transactions with large amount differences', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Shopping Store',
            date: new Date('2024-01-15'),
            amount: -50,
            category: 'Shopping',
          }),
          createTransaction({
            id: '2',
            description: 'Shopping Store',
            date: new Date('2024-02-15'),
            amount: -150, // 200% difference
            category: 'Shopping',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        // Should not be grouped together due to large amount difference
        expect(result).toHaveLength(0)
      })
    })

    describe('subscription classification', () => {
      it('should mark known subscriptions as isSubscription=true', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result[0].isSubscription).toBe(true)
      })

      it('should mark Lastschrift transactions as subscriptions', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'LASTSCHRIFTEN Insurance Payment',
            date: new Date('2024-01-15'),
            amount: -50,
            category: 'Insurance',
          }),
          createTransaction({
            id: '2',
            description: 'LASTSCHRIFTEN Insurance Payment',
            date: new Date('2024-02-15'),
            amount: -50,
            category: 'Insurance',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result[0].isSubscription).toBe(true)
      })

      it('should NOT mark grocery stores as subscriptions', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'REWE Supermarket',
            date: new Date('2024-01-15'),
            amount: -45,
            category: 'Groceries',
          }),
          createTransaction({
            id: '2',
            description: 'REWE Supermarket',
            date: new Date('2024-02-15'),
            amount: -45,
            category: 'Groceries',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        // Groceries are in EXCLUDED_CATEGORIES
        expect(result).toHaveLength(0)
      })
    })

    describe('category exclusions', () => {
      it('should exclude Groceries category', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Store Purchase',
            date: new Date('2024-01-15'),
            amount: -50,
            category: 'Groceries',
          }),
          createTransaction({
            id: '2',
            description: 'Store Purchase',
            date: new Date('2024-02-15'),
            amount: -50,
            category: 'Groceries',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(0)
      })

      it('should exclude Shopping category', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Store Purchase',
            date: new Date('2024-01-15'),
            amount: -50,
            category: 'Shopping',
          }),
          createTransaction({
            id: '2',
            description: 'Store Purchase',
            date: new Date('2024-02-15'),
            amount: -50,
            category: 'Shopping',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(0)
      })

      it('should allow transport subscriptions even if in Transport category', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Deutschlandticket',
            date: new Date('2024-01-15'),
            amount: -49,
            category: 'Transport',
          }),
          createTransaction({
            id: '2',
            description: 'Deutschlandticket',
            date: new Date('2024-02-15'),
            amount: -49,
            category: 'Transport',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(1)
        expect(result[0].isSubscription).toBe(true)
      })
    })

    describe('income filtering', () => {
      it('should only process expense transactions', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Salary',
            date: new Date('2024-01-15'),
            amount: 3000,
            type: 'income',
            category: 'Salary',
          }),
          createTransaction({
            id: '2',
            description: 'Salary',
            date: new Date('2024-02-15'),
            amount: 3000,
            type: 'income',
            category: 'Salary',
          }),
          createTransaction({
            id: '3',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            type: 'expense',
            category: 'Entertainment',
          }),
          createTransaction({
            id: '4',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            type: 'expense',
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        // Should only detect Netflix (expenses), not Salary (income)
        expect(result).toHaveLength(1)
        expect(result[0].merchantName).toBe('netflix')
      })
    })

    describe('next expected date calculation', () => {
      it('should calculate next monthly payment date', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result[0].nextExpectedDate).toEqual(new Date('2024-03-15'))
      })

      it('should calculate next weekly payment date', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Gym',
            date: new Date('2024-01-01'),
            amount: -25,
            category: 'Health & Fitness',
          }),
          createTransaction({
            id: '2',
            description: 'Gym',
            date: new Date('2024-01-08'),
            amount: -25,
            category: 'Health & Fitness',
          }),
          createTransaction({
            id: '3',
            description: 'Gym',
            date: new Date('2024-01-15'),
            amount: -25,
            category: 'Health & Fitness',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result[0].nextExpectedDate).toEqual(new Date('2024-01-22'))
      })
    })

    describe('edge cases', () => {
      it('should handle empty transactions array', () => {
        const result = detectRecurringTransactions([])
        expect(result).toHaveLength(0)
      })

      it('should handle single transaction', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)
        expect(result).toHaveLength(0)
      })

      it('should handle transactions with very short merchant names', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'AB',
            date: new Date('2024-01-15'),
            amount: -10,
            category: 'Other',
          }),
          createTransaction({
            id: '2',
            description: 'AB',
            date: new Date('2024-02-15'),
            amount: -10,
            category: 'Other',
          }),
        ]

        const result = detectRecurringTransactions(transactions)
        // Should be skipped due to merchantName.length < 3
        expect(result).toHaveLength(0)
      })

      it('should sort results by average amount (highest first)', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Spotify',
            date: new Date('2024-01-15'),
            amount: -9.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Spotify',
            date: new Date('2024-02-15'),
            amount: -9.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '3',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '4',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(2)
        expect(result[0].averageAmount).toBeGreaterThan(result[1].averageAmount)
      })
    })

    describe('multiple separate recurring groups', () => {
      it('should detect multiple different subscriptions', () => {
        const transactions: Transaction[] = [
          createTransaction({
            id: '1',
            description: 'Netflix',
            date: new Date('2024-01-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '2',
            description: 'Netflix',
            date: new Date('2024-02-15'),
            amount: -15.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '3',
            description: 'Spotify',
            date: new Date('2024-01-10'),
            amount: -9.99,
            category: 'Entertainment',
          }),
          createTransaction({
            id: '4',
            description: 'Spotify',
            date: new Date('2024-02-10'),
            amount: -9.99,
            category: 'Entertainment',
          }),
        ]

        const result = detectRecurringTransactions(transactions)

        expect(result).toHaveLength(2)
      })
    })
  })

  describe('getRecurringSummary', () => {
    it('should calculate summary statistics', () => {
      const groups = detectRecurringTransactions([
        createTransaction({
          id: '1',
          description: 'Netflix',
          date: new Date('2024-01-15'),
          amount: -15.99,
          category: 'Entertainment',
        }),
        createTransaction({
          id: '2',
          description: 'Netflix',
          date: new Date('2024-02-15'),
          amount: -15.99,
          category: 'Entertainment',
        }),
        createTransaction({
          id: '3',
          description: 'Spotify',
          date: new Date('2024-01-10'),
          amount: -9.99,
          category: 'Entertainment',
        }),
        createTransaction({
          id: '4',
          description: 'Spotify',
          date: new Date('2024-02-10'),
          amount: -9.99,
          category: 'Entertainment',
        }),
      ])

      const summary = getRecurringSummary(groups)

      expect(summary.totalSubscriptions).toBeGreaterThan(0)
      expect(summary.totalRecurring).toBe(2)
      expect(summary.monthlyTotal).toBeCloseTo(25.98, 1) // 15.99 + 9.99
      expect(summary.yearlyTotal).toBeCloseTo(311.76, 1) // monthlyTotal * 12
    })

    it('should convert weekly subscriptions to monthly totals', () => {
      const groups = detectRecurringTransactions([
        createTransaction({
          id: '1',
          description: 'Gym',
          date: new Date('2024-01-01'),
          amount: -10,
          category: 'Health & Fitness',
        }),
        createTransaction({
          id: '2',
          description: 'Gym',
          date: new Date('2024-01-08'),
          amount: -10,
          category: 'Health & Fitness',
        }),
        createTransaction({
          id: '3',
          description: 'Gym',
          date: new Date('2024-01-15'),
          amount: -10,
          category: 'Health & Fitness',
        }),
      ])

      const summary = getRecurringSummary(groups)

      // Weekly: 10 * 4.33 = 43.3 per month
      expect(summary.monthlyTotal).toBeCloseTo(43.3, 1)
    })

    it('should convert yearly subscriptions to monthly totals', () => {
      const groups = detectRecurringTransactions([
        createTransaction({
          id: '1',
          description: 'Amazon Prime',
          date: new Date('2023-01-15'),
          amount: -120,
          category: 'Subscriptions', // Changed from Shopping (excluded category)
        }),
        createTransaction({
          id: '2',
          description: 'Amazon Prime',
          date: new Date('2024-01-15'),
          amount: -120,
          category: 'Subscriptions',
        }),
      ])

      const summary = getRecurringSummary(groups)

      // Yearly: 120 / 12 = 10 per month
      expect(summary.monthlyTotal).toBeCloseTo(10, 1)
    })

    it('should group by category', () => {
      const groups = detectRecurringTransactions([
        createTransaction({
          id: '1',
          description: 'Netflix',
          date: new Date('2024-01-15'),
          amount: -15.99,
          category: 'Entertainment',
        }),
        createTransaction({
          id: '2',
          description: 'Netflix',
          date: new Date('2024-02-15'),
          amount: -15.99,
          category: 'Entertainment',
        }),
        createTransaction({
          id: '3',
          description: 'Insurance Payment',
          date: new Date('2024-01-15'),
          amount: -50,
          category: 'Insurance',
        }),
        createTransaction({
          id: '4',
          description: 'Insurance Payment',
          date: new Date('2024-02-15'),
          amount: -50,
          category: 'Insurance',
        }),
      ])

      const summary = getRecurringSummary(groups)

      expect(summary.byCategory).toHaveProperty('Entertainment')
      expect(summary.byCategory).toHaveProperty('Insurance')
      expect(summary.byCategory.Entertainment.count).toBeGreaterThan(0)
      expect(summary.byCategory.Insurance.count).toBeGreaterThan(0)
    })

    it('should return top 5 subscriptions', () => {
      const groups = detectRecurringTransactions([
        createTransaction({
          id: '1',
          description: 'Netflix',
          date: new Date('2024-01-15'),
          amount: -15.99,
          category: 'Entertainment',
        }),
        createTransaction({
          id: '2',
          description: 'Netflix',
          date: new Date('2024-02-15'),
          amount: -15.99,
          category: 'Entertainment',
        }),
      ])

      const summary = getRecurringSummary(groups)

      expect(summary.topSubscriptions).toBeDefined()
      expect(Array.isArray(summary.topSubscriptions)).toBe(true)
      expect(summary.topSubscriptions.length).toBeLessThanOrEqual(5)
    })

    it('should handle empty groups array', () => {
      const summary = getRecurringSummary([])

      expect(summary.totalSubscriptions).toBe(0)
      expect(summary.totalRecurring).toBe(0)
      expect(summary.monthlyTotal).toBe(0)
      expect(summary.yearlyTotal).toBe(0)
      expect(summary.byCategory).toEqual({})
      expect(summary.topSubscriptions).toHaveLength(0)
    })
  })
})
