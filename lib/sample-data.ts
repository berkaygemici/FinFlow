import { Statement, Transaction } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Sample merchants and their typical categories
const sampleMerchants = {
  subscriptions: [
    { name: "Netflix", amount: 15.99, category: "Entertainment" },
    { name: "Spotify", amount: 9.99, category: "Entertainment" },
    { name: "Adobe Creative Cloud", amount: 52.99, category: "Software" },
    { name: "Amazon Prime", amount: 14.99, category: "Shopping" },
    { name: "GitHub Pro", amount: 7.0, category: "Software" },
  ],
  restaurants: [
    { name: "Starbucks", category: "Food & Dining", range: [4, 12] as [number, number] },
    { name: "Chipotle", category: "Food & Dining", range: [10, 18] as [number, number] },
    { name: "Local Cafe", category: "Food & Dining", range: [8, 25] as [number, number] },
    { name: "Pizza Place", category: "Food & Dining", range: [15, 30] as [number, number] },
    { name: "Sushi Restaurant", category: "Food & Dining", range: [20, 50] as [number, number] },
  ],
  shopping: [
    { name: "Amazon", category: "Shopping", range: [20, 150] as [number, number] },
    { name: "Target", category: "Shopping", range: [30, 200] as [number, number] },
    { name: "Walmart", category: "Shopping", range: [25, 120] as [number, number] },
    { name: "Best Buy", category: "Electronics", range: [50, 500] as [number, number] },
  ],
  utilities: [
    { name: "Electric Company", amount: 85.5, category: "Utilities" },
    { name: "Internet Provider", amount: 79.99, category: "Utilities" },
    { name: "Water & Sewage", amount: 45.0, category: "Utilities" },
    { name: "Gas Company", amount: 62.3, category: "Utilities" },
  ],
  transportation: [
    { name: "Uber", category: "Transportation", range: [12, 35] as [number, number] },
    { name: "Gas Station", category: "Transportation", range: [40, 80] as [number, number] },
    { name: "Public Transit", amount: 2.75, category: "Transportation" },
  ],
  income: [
    { name: "Salary Deposit", amount: 4500, category: "Salary" },
    { name: "Freelance Payment", amount: 850, category: "Freelance" },
  ],
};

function getRandomAmount(range: [number, number]): number {
  const [min, max] = range;
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateDate(month: number, year: number, day?: number): Date {
  const d = day || Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, d);
}

export function generateSampleData(): Statement[] {
  const statements: Statement[] = [];
  const currentDate = new Date();

  // Generate data for the last 3 months
  for (let i = 2; i >= 0; i--) {
    const month = currentDate.getMonth() - i;
    const year = currentDate.getFullYear() + Math.floor(month / 12);
    const adjustedMonth = ((month % 12) + 12) % 12;

    const transactions: Transaction[] = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    // Add salary (2x per month)
    for (let salaryDay of [1, 15]) {
      const salaryTx: Transaction = {
        id: uuidv4(),
        description: "Salary Deposit - Monthly Payment",
        date: generateDate(adjustedMonth, year, salaryDay),
        amount: 4500,
        currency: "EUR",
        category: "Salary",
        type: "income",
      };
      transactions.push(salaryTx);
      totalIncome += 4500;
    }

    // Add subscriptions (monthly)
    sampleMerchants.subscriptions.forEach((sub) => {
      const day = Math.floor(Math.random() * 28) + 1;
      const tx: Transaction = {
        id: uuidv4(),
        description: `${sub.name} Subscription`,
        date: generateDate(adjustedMonth, year, day),
        amount: -sub.amount,
        currency: "EUR",
        category: sub.category,
        type: "expense",
        isRecurring: true,
        recurringFrequency: "monthly",
        merchantName: sub.name,
      };
      transactions.push(tx);
      totalExpenses += sub.amount;
    });

    // Add utilities (monthly)
    sampleMerchants.utilities.forEach((utility) => {
      const day = Math.floor(Math.random() * 28) + 1;
      const tx: Transaction = {
        id: uuidv4(),
        description: `${utility.name} - Monthly Bill`,
        date: generateDate(adjustedMonth, year, day),
        amount: -utility.amount,
        currency: "EUR",
        category: utility.category,
        type: "expense",
        isRecurring: true,
        recurringFrequency: "monthly",
        merchantName: utility.name,
      };
      transactions.push(tx);
      totalExpenses += utility.amount;
    });

    // Add random restaurant visits (15-20 per month)
    const restaurantVisits = Math.floor(Math.random() * 6) + 15;
    for (let j = 0; j < restaurantVisits; j++) {
      const restaurant = sampleMerchants.restaurants[
        Math.floor(Math.random() * sampleMerchants.restaurants.length)
      ];
      const amount = getRandomAmount(restaurant.range);
      const tx: Transaction = {
        id: uuidv4(),
        description: restaurant.name,
        date: generateDate(adjustedMonth, year),
        amount: -amount,
        currency: "EUR",
        category: restaurant.category,
        type: "expense",
        merchantName: restaurant.name,
      };
      transactions.push(tx);
      totalExpenses += amount;
    }

    // Add random shopping (8-12 per month)
    const shoppingVisits = Math.floor(Math.random() * 5) + 8;
    for (let j = 0; j < shoppingVisits; j++) {
      const shop = sampleMerchants.shopping[
        Math.floor(Math.random() * sampleMerchants.shopping.length)
      ];
      const amount = getRandomAmount(shop.range);
      const tx: Transaction = {
        id: uuidv4(),
        description: `${shop.name} Purchase`,
        date: generateDate(adjustedMonth, year),
        amount: -amount,
        currency: "EUR",
        category: shop.category,
        type: "expense",
        merchantName: shop.name,
      };
      transactions.push(tx);
      totalExpenses += amount;
    }

    // Add transportation (10-15 per month)
    const transportVisits = Math.floor(Math.random() * 6) + 10;
    for (let j = 0; j < transportVisits; j++) {
      const transport = sampleMerchants.transportation[
        Math.floor(Math.random() * sampleMerchants.transportation.length)
      ];
      const amount = transport.amount || getRandomAmount(transport.range!);
      const tx: Transaction = {
        id: uuidv4(),
        description: transport.name,
        date: generateDate(adjustedMonth, year),
        amount: -amount,
        currency: "EUR",
        category: transport.category,
        type: "expense",
        merchantName: transport.name,
      };
      transactions.push(tx);
      totalExpenses += amount;
    }

    // Add a freelance payment occasionally
    if (Math.random() > 0.5) {
      const amount = Math.floor(Math.random() * 1000) + 500;
      const tx: Transaction = {
        id: uuidv4(),
        description: "Freelance Project Payment",
        date: generateDate(adjustedMonth, year),
        amount: amount,
        currency: "EUR",
        category: "Freelance",
        type: "income",
      };
      transactions.push(tx);
      totalIncome += amount;
    }

    // Sort transactions by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const openingBalance = i === 2 ? 5000 : statements[statements.length - 1].closingBalance;
    const closingBalance = openingBalance + totalIncome - totalExpenses;

    const statement: Statement = {
      id: uuidv4(),
      fileName: `sample-statement-${monthNames[adjustedMonth]}-${year}.csv`,
      uploadDate: new Date(),
      month: monthNames[adjustedMonth],
      year: year,
      openingBalance: openingBalance,
      closingBalance: closingBalance,
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      transactions: transactions,
    };

    statements.push(statement);
  }

  return statements;
}
