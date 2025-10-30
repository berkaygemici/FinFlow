import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
    })

    it('should handle undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
    })

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar')
    })
  })

  describe('formatCurrency', () => {
    it('should format positive amounts correctly in EUR', () => {
      expect(formatCurrency(1234.56)).toBe('1.234,56\u00A0€')
    })

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-1.234,56\u00A0€')
    })

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('0,00\u00A0€')
    })

    it('should handle different currencies', () => {
      const usd = formatCurrency(1234.56, 'USD')
      expect(usd).toContain('1.234,56')
      expect(usd).toContain('$')
    })

    it('should handle large amounts', () => {
      expect(formatCurrency(1234567.89)).toBe('1.234.567,89\u00A0€')
    })

    it('should handle very small amounts', () => {
      expect(formatCurrency(0.01)).toBe('0,01\u00A0€')
    })

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(1.999)).toBe('2,00\u00A0€')
    })
  })

  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15')
      expect(formatDate(date)).toBe('15.01.2024')
    })

    it('should format ISO string correctly', () => {
      expect(formatDate('2024-01-15T10:30:00Z')).toBe('15.01.2024')
    })

    it('should format timestamp correctly', () => {
      const timestamp = new Date('2024-01-15').getTime()
      expect(formatDate(timestamp)).toBe('15.01.2024')
    })

    it('should handle leap year dates', () => {
      expect(formatDate('2024-02-29')).toBe('29.02.2024')
    })

    it('should handle year-end dates', () => {
      expect(formatDate('2023-12-31')).toBe('31.12.2023')
    })

    it('should handle year-start dates', () => {
      expect(formatDate('2024-01-01')).toBe('01.01.2024')
    })
  })
})
