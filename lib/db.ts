import Dexie, { Table } from 'dexie';
import { Statement, CategoryRule, Budget } from '@/types';

export class FinanceDB extends Dexie {
  statements!: Table<Statement>;
  categoryRules!: Table<CategoryRule>;
  budgets!: Table<Budget>;

  constructor() {
    super('FinanceDB');
    this.version(1).stores({
      statements: 'id, fileName, month, year, uploadDate',
      categoryRules: 'id, pattern, category',
      budgets: 'id, category, period'
    });
  }
}

export const db = new FinanceDB();
