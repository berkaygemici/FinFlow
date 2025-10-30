import Dexie, { Table } from 'dexie';
import { Statement, CategoryRule, Budget, Settings } from '@/types';

export class FinanceDB extends Dexie {
  statements!: Table<Statement>;
  categoryRules!: Table<CategoryRule>;
  budgets!: Table<Budget>;
  settings!: Table<Settings>;

  constructor() {
    super('FinanceDB');
    this.version(1).stores({
      statements: 'id, fileName, month, year, uploadDate',
      categoryRules: 'id, pattern, category',
      budgets: 'id, category, period'
    });

    // Version 2: Add settings table
    this.version(2).stores({
      statements: 'id, fileName, month, year, uploadDate',
      categoryRules: 'id, pattern, category',
      budgets: 'id, category, period',
      settings: 'id'
    });
  }
}

export const db = new FinanceDB();
