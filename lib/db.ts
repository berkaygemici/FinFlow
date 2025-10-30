import Dexie, { Table } from 'dexie';
import { Statement, CategoryRule, Budget, Settings, SavedFilter, UserSubscription } from '@/types';

export class FinanceDB extends Dexie {
  statements!: Table<Statement>;
  categoryRules!: Table<CategoryRule>;
  budgets!: Table<Budget>;
  settings!: Table<Settings>;
  savedFilters!: Table<SavedFilter>;
  userSubscriptions!: Table<UserSubscription>;

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

    // Version 3: Add saved filters
    this.version(3).stores({
      statements: 'id, fileName, month, year, uploadDate',
      categoryRules: 'id, pattern, category',
      budgets: 'id, category, period',
      settings: 'id',
      savedFilters: 'id, name, createdAt, lastUsed'
    });

    // Version 4: Add user subscriptions
    this.version(4).stores({
      statements: 'id, fileName, month, year, uploadDate',
      categoryRules: 'id, pattern, category',
      budgets: 'id, category, period',
      settings: 'id',
      savedFilters: 'id, name, createdAt, lastUsed',
      userSubscriptions: 'id, merchantName, isHidden, createdAt'
    });
  }
}

export const db = new FinanceDB();
