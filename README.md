# Billzzz - Personal Finance Management

A comprehensive personal finance management application built with SvelteKit 5, SQLite, and Tailwind CSS. Track bills, manage spending buckets, analyze debt payoff strategies, and forecast your cash flow all in one place.

## Features

### 💵 Bills Management

- Track bills with due dates, amounts, and payment links
- Recurring bills (weekly, biweekly, monthly, quarterly, yearly)
- Categories with custom colors and Lucide icons
- Cycle-based payment tracking for accurate billing history
- Mark bills as paid/unpaid with payment date tracking
- Bill cycle history and total paid amounts
- Payday integration for expense planning
- Link bills to debts to avoid double-counting in cash flow

### 🪣 Spending Buckets

- Create budget categories for variable spending (groceries, gas, dining, etc.)
- Automatic cycle generation based on your schedule
- True carryover (positive and negative balances roll forward)
- Transaction tracking with vendor and notes
- Visual progress indicators with spending bars
- Cycle history and detailed transaction logs
- Soft delete with recovery capability
- Import transactions from OFX/QFX files

### 📊 Debt Calculator

- Track multiple debts with interest rates and minimum payments
- Multiple payoff strategies:
  - **Snowball** - Pay off smallest balances first for psychological wins
  - **Avalanche** - Pay off highest interest rates first to save money
  - **Custom** - Define your own priority order
- Real-time automatic recalculation when strategy changes
- Visual timeline showing month-by-month payoff progress
- Side-by-side strategy comparison with savings analysis
- Projected payoff dates displayed on each debt card
- Debts automatically sorted by payoff date
- Link debts to bills for integrated payment tracking
- Recommendations based on your financial situation

### 📈 Analytics & Forecasting

- 90-day cash flow projection with balance tracking
- Key metrics dashboard:
  - Current balance with daily updates
  - Savings per paycheck after all obligations
  - Daily burn rate calculation
  - Financial runway (days until $0)
  - Total monthly obligations (bills + buckets + debts)
  - Next payday countdown
- Spending breakdown by category
- Critical alerts for potential overdrafts
- Balance and income input for accurate forecasting
- Smart debt/bill integration prevents double-counting

### 🏦 Accounts & Transfers

- Create and manage accounts (internal and external)
- Mark imported transactions as transfers and link a counterparty account
- Optional category assignment for transfers

### 📱 Import & Export

- Import transactions from OFX/QFX bank files
- Duplicate detection (skips transactions that were already imported)
- Automatic payee matching and categorization
- Map transactions to existing bills or buckets
- Mark transactions as transfers between accounts
- Create new bills from recurring transactions
- Income detection and handling
- Full data export to JSON for backup

## Tech Stack

- **Frontend**: SvelteKit 2.47.1 with Svelte 5 (runes)
- **Database**: SQLite with better-sqlite3
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide (via lucide-svelte)
- **Date Handling**: date-fns
- **Charts**: Chart.js with chartjs-adapter-date-fns
- **Language**: TypeScript

## Key Features

### 🌙 Dark Mode Support

- Full dark mode implementation across all pages
- System preference detection
- Manual theme toggle in settings
- Persistent theme preference

### 📊 Intelligent Cash Flow

- Prevents double-counting of linked debts/bills
- Accurate 90-day forecasting
- Payday-aware projections
- Real-time balance updates

### 🔄 Automatic Calculations

- Debt strategies recalculate on-the-fly
- No manual "Calculate" buttons needed
- Instant feedback on strategy changes
- Real-time payoff date updates

## Docker Deployment

### Using Docker Compose (Recommended)

1. Build and start the container:

```bash
docker compose up -d --build
```

2. The app will be available at `http://localhost:3000`

3. View logs:

```bash
docker logs billzzz
```

4. Stop the container:

```bash
docker compose down
```

### Using Docker directly

1. Build the image:

```bash
docker build -t billzzz .
```

2. Run the container:

```bash
docker run -d \
  --name billzzz \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  billzzz
```

### Data Persistence

The SQLite database is stored in the `./data` directory, which is mounted as a volume. Your data will persist even if the container is stopped or removed.

**Note:** The `./data` directory will be created automatically with the appropriate permissions when you first run the container.

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

1. Install dependencies:

```bash
npm install
```

2. Initialize the database:

```bash
npm run db:reset
```

3. Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript type checking
- `npm run db:reset` - Reset database (removes all data)

## Database

The application uses SQLite with the following main tables:

### Bills System

- **categories** - Bill categories with colors and icons
- **bills** - Bill information including recurring settings
- **bill_cycles** - Generated billing periods for tracking
- **bill_payments** - Cycle-based payment tracking
- **payday_settings** - Payday schedule configuration

### Buckets System

- **buckets** - Budget categories for variable spending
- **bucket_cycles** - Generated spending periods with carryover
- **bucket_transactions** - Individual transactions within buckets

### Debt Calculator

- **debts** - Debt accounts with interest rates and linked bills
- **debt_payments** - Payment history tracking
- **debt_strategy_settings** - Payoff strategy configuration

### Import/Export

- **import_sessions** - OFX/QFX import tracking
- **imported_transactions** - Pending transactions for review (including transfer metadata)
- **accounts** - Accounts used for transfer tracking

### Settings

- **user_preferences** - Theme, balance, and income settings

### Database Configuration

- **Location:** `./data/bills.db` (configurable via `DATA_DIR` environment variable)
- **WAL Mode:** Enabled for better concurrency
- **Foreign Keys:** Enabled for referential integrity
- **Auto-initialization:** Tables are created automatically on first run
- **Migrations:** Managed via Drizzle Kit

## API Endpoints

### Bills

- `GET /api/bills` - List all bills with cycle information
- `POST /api/bills` - Create a new bill
- `GET /api/bills/[id]` - Get bill details with payment history
- `PATCH /api/bills/[id]` - Update a bill
- `DELETE /api/bills/[id]` - Delete a bill
- `POST /api/bills/[id]/payments` - Record a payment for a bill cycle

### Buckets

- `GET /api/buckets` - List all active buckets
- `POST /api/buckets` - Create a new bucket
- `GET /api/buckets/[id]` - Get bucket with current cycle and history
- `PUT /api/buckets/[id]` - Update a bucket
- `DELETE /api/buckets/[id]` - Soft delete a bucket

### Transactions

- `GET /api/buckets/[id]/transactions` - List transactions for a bucket
- `POST /api/buckets/[id]/transactions` - Create a transaction
- `PUT /api/transactions/[id]` - Update a transaction
- `DELETE /api/transactions/[id]` - Delete a transaction

### Debts

- `GET /api/debts` - List all debts with details
- `POST /api/debts` - Create a debt
- `PATCH /api/debts/[id]` - Update a debt
- `DELETE /api/debts/[id]` - Delete a debt
- `POST /api/debt-calculator/calculate` - Calculate payoff schedules
- `POST /api/debt-strategy` - Update payoff strategy settings

### Categories

- `GET /api/categories` - List all categories
- `POST /api/categories` - Create a category
- `PUT /api/categories/[id]` - Update a category
- `DELETE /api/categories/[id]` - Delete a category

### Settings

- `GET /api/preferences` - Get user preferences
- `POST /api/preferences` - Update user preferences
- `GET /api/payday-settings` - Get payday settings
- `POST /api/payday-settings` - Update payday settings

### Import/Export

- `POST /api/import` - Import OFX/QFX transactions
- `GET /api/export` - Export all data to JSON

### Accounts

- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create a new account
- `PUT /api/accounts/[id]` - Update an account
- `DELETE /api/accounts/[id]` - Delete an account

### Payments

- `DELETE /api/payments/[id]` - Delete a payment record

## License

MIT License - See LICENSE file for details
