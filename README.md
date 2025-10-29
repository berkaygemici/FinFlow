# FinFlow

> I wasn't satisfied with N26's built-in analysis features, so I built my own.

A privacy-focused personal finance dashboard that parses N26 bank statement PDFs and provides clear visualizations of your financial data. All processing happens locally in your browser - your data never leaves your device.

## Features

- **PDF Upload**: Drag-and-drop N26 bank statement PDFs for automatic parsing
- **Financial Overview**: Income, expenses, and net balance at a glance
- **Category Breakdown**: Interactive charts showing spending by category
- **Trend Analysis**: Track financial performance across multiple months
- **Budget Tracking**: Set spending limits with visual alerts
- **Export**: Download data as CSV or PDF reports
- **100% Local**: All data stored in your browser using IndexedDB - no external servers

## Tech Stack

Next.js 14, TypeScript, Tailwind CSS, Recharts, Framer Motion, pdf.js, IndexedDB (Dexie.js)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Privacy

All data is stored locally in your browser. Your financial information never leaves your device.

## License

MIT License
