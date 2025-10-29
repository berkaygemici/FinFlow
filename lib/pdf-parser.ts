import * as pdfjsLib from 'pdfjs-dist';
import { Transaction, Statement } from '@/types';

// Configure PDF.js worker - using local worker file to avoid CORS issues
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface ParsedLine {
  text: string;
  y: number;
}

export class PDFParser {
  private categorizeTransaction(description: string, amount: number, descText?: string): string {
    const desc = description.toLowerCase();
    const fullDesc = (descText || description).toLowerCase();

    // First check if N26 has already provided a category (German categories)
    if (fullDesc.includes('• bars & restaurants')) return 'Bars & Restaurants';
    if (fullDesc.includes('• lebensmittel')) return 'Groceries';
    if (fullDesc.includes('• transport')) return 'Transport';
    if (fullDesc.includes('• medien & telekom')) return 'Media & Telecom';
    if (fullDesc.includes('• freizeit')) return 'Leisure';
    if (fullDesc.includes('• shopping')) return 'Shopping';
    if (fullDesc.includes('• auto')) return 'Transport';
    if (fullDesc.includes('• sonstiges')) return 'Other';

    // Salary/Income patterns
    if (amount > 0 && (desc.includes('gehalt') || desc.includes('salary') || desc.includes('lohn') ||
        fullDesc.includes('gutschriften'))) {
      return 'Salary';
    }

    // Insurance patterns
    if (desc.includes('barmer') || desc.includes('versicherung') || desc.includes('insurance')) {
      return 'Health & Insurance';
    }

    // Groceries patterns
    if (desc.includes('rewe') || desc.includes('edeka') || desc.includes('aldi') ||
        desc.includes('lidl') || desc.includes('kaufland') || desc.includes('lebensmittel') ||
        desc.includes('market')) {
      return 'Groceries';
    }

    // Transport patterns
    if (desc.includes('uber') || desc.includes('taxi') || desc.includes('bvg') ||
        desc.includes('transport') || desc.includes('tankstelle') || desc.includes('shell') ||
        desc.includes('flixbus') || desc.includes('navigo') || desc.includes('ratp') ||
        desc.includes('delijn') || desc.includes('stib') || desc.includes('mivb')) {
      return 'Transport';
    }

    // Restaurants patterns
    if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('bar') ||
        desc.includes('food') || desc.includes('pizza') || desc.includes('burger') ||
        desc.includes('coffee') || desc.includes('kahve') || desc.includes('kafe') ||
        desc.includes('pide') || desc.includes('pastanesi')) {
      return 'Bars & Restaurants';
    }

    // Shopping patterns
    if (desc.includes('amazon') || desc.includes('shop') || desc.includes('store') ||
        desc.includes('kaufhaus') || desc.includes('zara') || desc.includes('h&m')) {
      return 'Shopping';
    }

    // Media & Telecom patterns
    if (desc.includes('telefonica') || desc.includes('vodafone') || desc.includes('telekom') ||
        desc.includes('spotify') || desc.includes('netflix') || desc.includes('revenuecat')) {
      return 'Media & Telecom';
    }

    // Leisure patterns
    if (desc.includes('kino') || desc.includes('cinema') || desc.includes('theater') ||
        desc.includes('gym') || desc.includes('fitness') || desc.includes('sport') ||
        desc.includes('beach') || desc.includes('otelcilik')) {
      return 'Leisure';
    }

    // Student/Education patterns
    if (desc.includes('studentenwerk') || desc.includes('student') || desc.includes('schueler')) {
      return 'Education';
    }

    // N26 specific patterns
    if (desc.includes('n26 ratenzahlung') || fullDesc.includes('belastungen')) {
      return 'Banking Fees';
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

      // Try to extract the main description (merchant name)
      // Pattern 1: If it contains Mastercard/Lastschriften/Gutschriften, text before that is the merchant
      let description = '';

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

      const transaction: Transaction = {
        id: `txn-${transactionId++}`,
        description: description,
        date: date,
        amount: Math.abs(amount),
        currency: 'EUR',
        category: this.categorizeTransaction(description, amount, descText),
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
