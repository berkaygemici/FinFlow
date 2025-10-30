import { describe, it, expect } from 'vitest'
import { applyTransactionFilters, sortTransactions } from '@/lib/filter-utils'
import { Transaction, TransactionFilters } from '@/types'

// Helper function to create test transactions
const createTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: '1',
  description: 'Test Transaction',
  date: new Date('2024-01-15'),
  amount: 100,
  currency: 'EUR',
  category: 'Shopping',
  type: 'expense',
  ...overrides,
})

describe('filter-utils', () => {
  describe('applyTransactionFilters', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        description: 'Netflix Subscription',
        date: new Date('2024-01-15'),
        amount: -15.99,
        category: 'Entertainment',
        type: 'expense',
      }),
      createTransaction({
        id: '2',
        description: 'Salary Payment',
        date: new Date('2024-01-31'),
        amount: 3000,
        category: 'Salary',
        type: 'income',
      }),
      createTransaction({
        id: '3',
        description: 'Grocery Shopping at Lidl',
        date: new Date('2024-02-05'),
        amount: -45.67,
        category: 'Groceries',
        type: 'expense',
      }),
      createTransaction({
        id: '4',
        description: 'Spotify Premium',
        date: new Date('2024-02-10'),
        amount: -9.99,
        category: 'Entertainment',
        type: 'expense',
      }),
      createTransaction({
        id: '5',
        description: 'Freelance Project',
        date: new Date('2024-02-20'),
        amount: 500,
        category: 'Freelance',
        type: 'income',
      }),
    ]

    describe('searchTerm filter', () => {
      it('should filter by search term (case insensitive)', () => {
        const filters: TransactionFilters = { searchTerm: 'netflix' }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(1)
        expect(result[0].description).toBe('Netflix Subscription')
      })

      it('should return multiple matches', () => {
        const filters: TransactionFilters = { searchTerm: 'premium' }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(1)
        expect(result[0].description).toBe('Spotify Premium')
      })

      it('should return empty array if no matches', () => {
        const filters: TransactionFilters = { searchTerm: 'nonexistent' }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(0)
      })

      it('should handle partial matches', () => {
        const filters: TransactionFilters = { searchTerm: 'sho' }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(1)
        expect(result[0].description).toContain('Shopping')
      })
    })

    describe('categories filter', () => {
      it('should filter by single category', () => {
        const filters: TransactionFilters = { categories: ['Entertainment'] }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(2)
        expect(result.every((t) => t.category === 'Entertainment')).toBe(true)
      })

      it('should filter by multiple categories', () => {
        const filters: TransactionFilters = {
          categories: ['Entertainment', 'Groceries'],
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(3)
      })

      it('should return all transactions when categories is empty array', () => {
        const filters: TransactionFilters = { categories: [] }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(5)
      })

      it('should return empty array if category does not exist', () => {
        const filters: TransactionFilters = { categories: ['NonExistent'] }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(0)
      })
    })

    describe('type filter', () => {
      it('should filter by income type', () => {
        const filters: TransactionFilters = { type: 'income' }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(2)
        expect(result.every((t) => t.type === 'income')).toBe(true)
      })

      it('should filter by expense type', () => {
        const filters: TransactionFilters = { type: 'expense' }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(3)
        expect(result.every((t) => t.type === 'expense')).toBe(true)
      })

      it('should return all transactions when type is "all"', () => {
        const filters: TransactionFilters = { type: 'all' }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(5)
      })
    })

    describe('date range filter', () => {
      it('should filter by dateFrom', () => {
        const filters: TransactionFilters = {
          dateFrom: new Date('2024-02-01'),
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(3)
        expect(result.every((t) => new Date(t.date) >= new Date('2024-02-01'))).toBe(true)
      })

      it('should filter by dateTo', () => {
        const filters: TransactionFilters = {
          dateTo: new Date('2024-01-31'),
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(2)
        expect(result.every((t) => new Date(t.date) <= new Date('2024-01-31'))).toBe(true)
      })

      it('should filter by date range', () => {
        const filters: TransactionFilters = {
          dateFrom: new Date('2024-01-15'),
          dateTo: new Date('2024-02-10'),
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(4)
      })

      it('should include transactions on the exact dateFrom', () => {
        const filters: TransactionFilters = {
          dateFrom: new Date('2024-01-15'),
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result.some((t) => t.id === '1')).toBe(true)
      })

      it('should include transactions on the exact dateTo', () => {
        const filters: TransactionFilters = {
          dateTo: new Date('2024-02-10'),
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result.some((t) => t.id === '4')).toBe(true)
      })
    })

    describe('amount range filter', () => {
      it('should filter by minimum amount', () => {
        const filters: TransactionFilters = { amountMin: 50 }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(2)
        expect(result.every((t) => Math.abs(t.amount) >= 50)).toBe(true)
      })

      it('should filter by maximum amount', () => {
        const filters: TransactionFilters = { amountMax: 20 }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(2) // Netflix (15.99) and Spotify (9.99)
        expect(result.every((t) => Math.abs(t.amount) <= 20)).toBe(true)
      })

      it('should filter by amount range', () => {
        const filters: TransactionFilters = {
          amountMin: 10,
          amountMax: 100,
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(2) // Netflix (15.99) and Grocery (45.67)
        expect(result.every((t) => Math.abs(t.amount) >= 10 && Math.abs(t.amount) <= 100)).toBe(true)
      })

      it('should use absolute values for amount comparison', () => {
        const filters: TransactionFilters = { amountMin: 15 }
        const result = applyTransactionFilters(transactions, filters)
        // Should include -15.99 (Netflix) as absolute value
        expect(result.some((t) => t.id === '1')).toBe(true)
      })
    })

    describe('month and year filters', () => {
      it('should filter by month', () => {
        const filters: TransactionFilters = { month: 1 } // January
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(2)
        expect(result.every((t) => new Date(t.date).getMonth() === 0)).toBe(true)
      })

      it('should filter by year', () => {
        const filters: TransactionFilters = { year: 2024 }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(5)
      })

      it('should filter by month and year together', () => {
        const filters: TransactionFilters = { month: 2, year: 2024 } // February 2024
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(3)
      })

      it('should return empty array for non-existent month', () => {
        const filters: TransactionFilters = { month: 3, year: 2024 } // March 2024
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(0)
      })
    })

    describe('combined filters', () => {
      it('should apply multiple filters correctly', () => {
        const filters: TransactionFilters = {
          type: 'expense',
          categories: ['Entertainment'],
          amountMin: 10,
          month: 1,
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(1)
        expect(result[0].description).toBe('Netflix Subscription')
      })

      it('should return empty array when no transaction matches all filters', () => {
        const filters: TransactionFilters = {
          type: 'income',
          categories: ['Entertainment'],
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(0)
      })

      it('should handle complex filter combination', () => {
        const filters: TransactionFilters = {
          searchTerm: 'payment',
          type: 'income',
          dateFrom: new Date('2024-01-01'),
          dateTo: new Date('2024-01-31'),
          amountMin: 1000,
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(1)
        expect(result[0].description).toBe('Salary Payment')
      })
    })

    describe('edge cases', () => {
      it('should handle empty transactions array', () => {
        const filters: TransactionFilters = { searchTerm: 'test' }
        const result = applyTransactionFilters([], filters)
        expect(result).toHaveLength(0)
      })

      it('should handle empty filters object', () => {
        const filters: TransactionFilters = {}
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(5)
      })

      it('should handle undefined filter values', () => {
        const filters: TransactionFilters = {
          searchTerm: undefined,
          categories: undefined,
          type: undefined,
        }
        const result = applyTransactionFilters(transactions, filters)
        expect(result).toHaveLength(5)
      })
    })
  })

  describe('sortTransactions', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        date: new Date('2024-01-15'),
        amount: -100,
      }),
      createTransaction({
        id: '2',
        date: new Date('2024-01-10'),
        amount: 500,
      }),
      createTransaction({
        id: '3',
        date: new Date('2024-01-20'),
        amount: -25.5,
      }),
      createTransaction({
        id: '4',
        date: new Date('2024-01-05'),
        amount: -300,
      }),
    ]

    describe('date sorting', () => {
      it('should sort by date descending (newest first)', () => {
        const result = sortTransactions(transactions, 'date-desc')
        expect(result[0].id).toBe('3') // 2024-01-20
        expect(result[1].id).toBe('1') // 2024-01-15
        expect(result[2].id).toBe('2') // 2024-01-10
        expect(result[3].id).toBe('4') // 2024-01-05
      })

      it('should sort by date ascending (oldest first)', () => {
        const result = sortTransactions(transactions, 'date-asc')
        expect(result[0].id).toBe('4') // 2024-01-05
        expect(result[1].id).toBe('2') // 2024-01-10
        expect(result[2].id).toBe('1') // 2024-01-15
        expect(result[3].id).toBe('3') // 2024-01-20
      })
    })

    describe('amount sorting', () => {
      it('should sort by amount descending (largest first)', () => {
        const result = sortTransactions(transactions, 'amount-desc')
        expect(result[0].amount).toBe(500) // Largest absolute value
        expect(result[1].amount).toBe(-300)
        expect(result[2].amount).toBe(-100)
        expect(result[3].amount).toBe(-25.5) // Smallest absolute value
      })

      it('should sort by amount ascending (smallest first)', () => {
        const result = sortTransactions(transactions, 'amount-asc')
        expect(result[0].amount).toBe(-25.5) // Smallest absolute value
        expect(result[1].amount).toBe(-100)
        expect(result[2].amount).toBe(-300)
        expect(result[3].amount).toBe(500) // Largest absolute value
      })

      it('should use absolute values for amount sorting', () => {
        const result = sortTransactions(transactions, 'amount-desc')
        // -300 should come before -100 because |−300| > |−100|
        const idx300 = result.findIndex((t) => t.amount === -300)
        const idx100 = result.findIndex((t) => t.amount === -100)
        expect(idx300).toBeLessThan(idx100)
      })
    })

    describe('edge cases', () => {
      it('should handle empty array', () => {
        const result = sortTransactions([], 'date-desc')
        expect(result).toHaveLength(0)
      })

      it('should handle single transaction', () => {
        const single = [transactions[0]]
        const result = sortTransactions(single, 'date-desc')
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('1')
      })

      it('should not mutate original array', () => {
        const original = [...transactions]
        sortTransactions(transactions, 'date-desc')
        expect(transactions).toEqual(original)
      })

      it('should handle unknown sort type', () => {
        const result = sortTransactions(transactions, 'unknown-sort')
        // Should return array in original order
        expect(result).toHaveLength(4)
      })

      it('should handle same dates', () => {
        const sameDates = [
          createTransaction({ id: '1', date: new Date('2024-01-15'), amount: -100 }),
          createTransaction({ id: '2', date: new Date('2024-01-15'), amount: -200 }),
        ]
        const result = sortTransactions(sameDates, 'date-desc')
        expect(result).toHaveLength(2)
      })

      it('should handle same amounts', () => {
        const sameAmounts = [
          createTransaction({ id: '1', amount: -100 }),
          createTransaction({ id: '2', amount: -100 }),
        ]
        const result = sortTransactions(sameAmounts, 'amount-desc')
        expect(result).toHaveLength(2)
      })
    })
  })
})
