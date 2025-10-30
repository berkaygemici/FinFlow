import * as pdfjsLib from 'pdfjs-dist';
import { Transaction, Statement } from '@/types';
import categoriesConfig from '@/config/categories.json';
import { db } from './db';

// Configure PDF.js worker - using local worker file to avoid CORS issues
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface ParsedLine {
  text: string;
  y: number;
}

interface AICategorizeResponse {
  categorizedTransactions: {
    description: string;
    category: string;
  }[];
}

export class PDFParser {
  private async categorizeWithAI(transactions: { description: string }[]): Promise<string[]> {
    try {
      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: categoriesConfig.categories,
          transactions: transactions,
        }),
      });

      if (!response.ok) {
        console.error('AI categorization failed:', await response.text());
        return transactions.map(() => 'Other');
      }

      const data: AICategorizeResponse = await response.json();
      return data.categorizedTransactions.map(t => t.category);
    } catch (error) {
      console.error('Error in AI categorization:', error);
      return transactions.map(() => 'Other');
    }
  }

  private categorizeTransaction(description: string, amount: number, descText?: string, n26Category?: string): string {
    const desc = description.toLowerCase();
    const fullDesc = (descText || description).toLowerCase();

    // First priority: Use N26's explicitly provided category if available
    if (n26Category) {
      const n26Cat = n26Category.toLowerCase();
      const n26Mapping: { [key: string]: string } = {
        'lebensmittel': 'Groceries',
        'bars & restaurants': 'Bars & Restaurants',
        'transport': 'Transport',
        'medien & telekom': 'Media & Telecom',
        'freizeit': 'Leisure',
        'shopping': 'Shopping',
        'auto': 'Automotive',
        'sonstiges': 'Other',
        'health & insurance': 'Health & Insurance',
        'rent': 'Rent',
        'education': 'Education',
        'banking fees': 'Banking Fees',
        'transfers': 'Transfers'
      };

      for (const [key, mappedCategory] of Object.entries(n26Mapping)) {
        if (n26Cat.includes(key)) {
          console.log(`Mapped N26 category "${n26Category}" → "${mappedCategory}"`);
          return mappedCategory;
        }
      }
    }

    // Second check: Look for N26 categories in the full description text (fallback)
    const n26Categories = categoriesConfig.categorizationRules.n26BankCategories;
    for (const [pattern, category] of Object.entries(n26Categories)) {
      if (fullDesc.includes(pattern)) {
        return category;
      }
    }

    // Check merchant patterns for each category
    const merchantPatterns = categoriesConfig.categorizationRules.merchantPatterns;

    // Special handling for Salary - only match if amount is positive (income)
    if (amount > 0 && merchantPatterns['Salary']) {
      for (const pattern of merchantPatterns['Salary']) {
        if (desc.includes(pattern) || fullDesc.includes(pattern)) {
          return 'Salary';
        }
      }
    }

    // Check all other categories
    for (const [category, patterns] of Object.entries(merchantPatterns)) {
      if (category === 'Salary') continue; // Already handled above

      for (const pattern of patterns) {
        if (desc.includes(pattern)) {
          return category;
        }
      }
    }

    return 'Other';
  }

  async parsePDF(file: File): Promise<Statement> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    const transactions: Transaction[] = [];

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Debug: Log extracted text to console
    console.log('=== EXTRACTED PDF TEXT ===');
    console.log(fullText.substring(0, 2000)); // Log first 2000 characters
    console.log('=== END OF SAMPLE ===');

    // Parse transactions - N26 format uses "Wertstellung DATE  DATE   AMOUNT€"
    let transactionId = 0;

    // Regex to match N26 transaction pattern
    // Pattern: Wertstellung DD.MM.YYYY  DD.MM.YYYY   [+-]AMOUNT€
    const transactionRegex = /Wertstellung\s+(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2})\.(\d{2})\.(\d{4})\s+([+-]?\d+[.,]\d{2})€/g;

    let match;
    const matches = [];
    while ((match = transactionRegex.exec(fullText)) !== null) {
      matches.push({
        index: match.index,
        date1: `${match[1]}.${match[2]}.${match[3]}`,
        date2: `${match[4]}.${match[5]}.${match[6]}`,
        amount: match[7],
        matchLength: match[0].length
      });
    }

    console.log(`Found ${matches.length} transaction patterns`);

    // Extract transactions with descriptions
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];

      // Parse date (use the second date which is the booking date)
      const [day, month, year] = currentMatch.date2.split('.');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      // Parse amount
      const amountStr = currentMatch.amount.replace(',', '.');
      const amount = parseFloat(amountStr);

      // Extract description - text before "Wertstellung"
      // Look back from current match index to find the start of the description
      let descStartIndex = i === 0 ? 0 : matches[i - 1].index + matches[i - 1].matchLength;
      let descText = fullText.substring(descStartIndex, currentMatch.index);

      // Clean up the description
      // Remove common patterns and extract the merchant/description
      descText = descText.trim();

      // Try to extract the main description (merchant name) and N26 category
      // Pattern: "Merchant Name\nMastercard • Category\nWertstellung..."
      let description = '';
      let n26Category = '';
      let isTransfer = false;

      // Check if this is a person-to-person transfer (has IBAN/BIC)
      const hasIBAN = descText.match(/IBAN:\s*[A-Z]{2}\d{2}[A-Z0-9]+/i);
      const hasBIC = descText.match(/BIC:\s*[A-Z0-9]+/i);

      if ((descText.includes('Belastungen') || descText.includes('Gutschriften')) && (hasIBAN || hasBIC)) {
        isTransfer = true;
        n26Category = 'Transfers';
        console.log('Detected person-to-person transfer (IBAN/BIC found)');
      }

      // Extract N26 category if it exists (format: "Mastercard • Category" or "Payment Method • Category")
      if (!isTransfer) {
        const categoryMatch = descText.match(/(?:Mastercard|Lastschriften|Gutschriften|Belastungen)\s*•\s*([^\n]+)/i);
        if (categoryMatch) {
          n26Category = categoryMatch[1].trim();
          console.log(`Found N26 category: "${n26Category}"`);
        }
      }

      if (descText.includes('Mastercard')) {
        description = descText.split('Mastercard')[0].trim().split(/\s{2,}/).pop() || '';
      } else if (descText.includes('Lastschriften')) {
        description = descText.split('Lastschriften')[0].trim().split(/\s{2,}/).pop() || '';
      } else if (descText.includes('Gutschriften')) {
        description = descText.split('Gutschriften')[0].trim().split(/\s{2,}/).pop() || '';
      } else if (descText.includes('Belastungen')) {
        description = descText.split('Belastungen')[0].trim().split(/\s{2,}/).pop() || '';
      } else {
        // Try to get the last meaningful part before dates
        const parts = descText.split(/\s{2,}/);
        description = parts[parts.length - 1] || parts[0] || descText.substring(0, 50);
      }

      // Clean up description
      description = description
        .replace(/Betrag\s*$/, '')
        .replace(/Verbuchungsdatum\s*$/, '')
        .replace(/Beschreibung\s*$/, '')
        .trim();

      if (!description || description.length < 2) {
        description = descText.substring(0, 50).trim();
      }

      console.log(`Transaction ${i}: ${description} | ${date.toLocaleDateString()} | ${amount}€`);
      if (n26Category) {
        console.log(`  N26 Category: ${n26Category}`);
      }

      const transaction: Transaction = {
        id: `txn-${transactionId++}`,
        description: description,
        date: date,
        amount: Math.abs(amount),
        currency: 'EUR',
        category: this.categorizeTransaction(description, amount, descText, n26Category),
        type: amount >= 0 ? 'income' : 'expense',
      };

      // Check for foreign currency in the description text
      const currencyMatch = descText.match(/Ursprungsbetrag\s+(\d+[.,]\d{2})\s+([A-Z]{3})/);
      if (currencyMatch && currencyMatch[2] !== 'EUR') {
        transaction.originalAmount = parseFloat(currencyMatch[1].replace(',', '.'));
        transaction.originalCurrency = currencyMatch[2];

        const exchangeRateMatch = descText.match(/Wechselkurs\s+(\d+[.,]\d+)/);
        if (exchangeRateMatch) {
          transaction.exchangeRate = parseFloat(exchangeRateMatch[1].replace(',', '.'));
        }
      }

      transactions.push(transaction);
    }

    console.log(`Total transactions found: ${transactions.length}`);
    if (transactions.length > 0) {
      console.log('First transaction:', transactions[0]);
      console.log('Last transaction:', transactions[transactions.length - 1]);
    }

    // Check if AI categorization is enabled
    const settings = await db.settings.get('default');
    if (settings?.aiCategorizationEnabled && transactions.length > 0) {
      console.log('AI categorization is enabled, processing transactions...');

      try {
        // Extract descriptions for AI processing
        const transactionDescriptions = transactions.map(t => ({
          description: t.description
        }));

        // Get AI categories
        const aiCategories = await this.categorizeWithAI(transactionDescriptions);

        // Update transaction categories with AI results
        transactions.forEach((transaction, index) => {
          if (aiCategories[index]) {
            transaction.category = aiCategories[index];
            console.log(`AI categorized: ${transaction.description} → ${aiCategories[index]}`);
          }
        });

        console.log('AI categorization completed successfully');
      } catch (error) {
        console.error('Failed to apply AI categorization:', error);
        // Continue with manual categorization if AI fails
      }
    } else {
      console.log('AI categorization is disabled, using manual categorization');
    }

    // Extract opening and closing balances from N26 summary
    // Pattern: "Dein alter Kontostand   +XXX,XX€" and "Dein neuer Kontostand   +XXX,XX€"
    let openingBalance = 0;
    let closingBalance = 0;

    const openingBalanceMatch = fullText.match(/Dein alter Kontostand\s+([+-]?\d+[.,]\d{2})€/);
    if (openingBalanceMatch) {
      openingBalance = parseFloat(openingBalanceMatch[1].replace(',', '.'));
    }

    const closingBalanceMatch = fullText.match(/Dein neuer Kontostand\s+([+-]?\d+[.,]\d{2})€/);
    if (closingBalanceMatch) {
      closingBalance = parseFloat(closingBalanceMatch[1].replace(',', '.'));
    }

    // Calculate totals from transactions
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Extract month and year from filename or first transaction
    const firstDate = transactions[0]?.date || new Date();
    const month = firstDate.toLocaleString('en-US', { month: 'long' });
    const year = firstDate.getFullYear();

    console.log(`Opening balance: ${openingBalance}€, Closing balance: ${closingBalance}€`);
    console.log(`Total income: ${totalIncome}€, Total expenses: ${totalExpenses}€`);

    const statement: Statement = {
      id: `stmt-${Date.now()}`,
      fileName: file.name,
      uploadDate: new Date(),
      month: month,
      year: year,
      openingBalance: openingBalance,
      closingBalance: closingBalance,
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      transactions: transactions,
    };

    return statement;
  }
}

export const pdfParser = new PDFParser();
