# Billzzz - Personal Finance Management

A comprehensive personal finance management application built with SvelteKit 5, SQLite, and Tailwind CSS. Track bills, manage spending buckets, and analyze debt payoff strategies all in one place.

## Features

### 💵 Bills Management
- Track bills with due dates, amounts, and payment links
- Recurring bills (weekly, biweekly, monthly, quarterly, yearly)
- Categories with custom colors and Lucide icons
- Payment history tracking
- Mark bills as paid/unpaid
- Filter and search bills
- Payday integration for expense planning

### 🪣 Spending Buckets
- Create budget categories for variable spending (groceries, gas, dining, etc.)
- Automatic cycle generation based on your schedule
- True carryover (positive and negative balances roll forward)
- Transaction tracking with vendor and notes
- Visual progress indicators
- Cycle history and analysis

### 📊 Debt Calculator
- Track multiple debts with customizable interest rates
- Multiple payoff strategies (snowball, avalanche, custom)
- Visual timeline and comparison tools
- Linked bill tracking for minimum payments

## Tech Stack

- **Frontend**: SvelteKit 2.47.1 with Svelte 5 (runes)
- **Database**: SQLite with better-sqlite3
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide (via lucide-svelte)
- **Language**: TypeScript

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
- **payment_history** - Record of all payments made
- **payday_settings** - Payday schedule configuration

### Buckets System
- **buckets** - Budget categories for variable spending
- **bucket_cycles** - Generated spending periods
- **bucket_transactions** - Individual transactions within buckets

### Debt Calculator
- **debts** - Debt accounts with interest rates
- **debt_payments** - Payment history
- **debt_strategy_settings** - Payoff strategy configuration

### Database Configuration

- **Location:** `./data/bills.db` (configurable via `DATA_DIR` environment variable)
- **WAL Mode:** Enabled for better concurrency
- **Foreign Keys:** Enabled for referential integrity
- **Auto-initialization:** Tables are created automatically on first run

## API Endpoints

### Bills
- `GET /api/bills` - List all bills
- `POST /api/bills` - Create a new bill
- `GET /api/bills/[id]` - Get a single bill
- `PATCH /api/bills/[id]` - Update a bill
- `DELETE /api/bills/[id]` - Delete a bill

### Buckets
- `GET /api/buckets` - List all buckets
- `POST /api/buckets` - Create a new bucket
- `GET /api/buckets/[id]` - Get a bucket with current cycle
- `PUT /api/buckets/[id]` - Update a bucket
- `DELETE /api/buckets/[id]` - Soft delete a bucket

### Transactions
- `GET /api/buckets/[id]/transactions` - List transactions for a bucket
- `POST /api/buckets/[id]/transactions` - Create a transaction
- `PUT /api/transactions/[id]` - Update a transaction
- `DELETE /api/transactions/[id]` - Delete a transaction

### Debts
- `GET /api/debts` - List all debts
- `POST /api/debts` - Create a debt
- `PUT /api/debts/[id]` - Update a debt
- `DELETE /api/debts/[id]` - Delete a debt
- `POST /api/debts/[id]/payment` - Record a payment

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create a category
- `PUT /api/categories/[id]` - Update a category
- `DELETE /api/categories/[id]` - Delete a category

### Payment History
- `DELETE /api/payment-history/[id]` - Remove a payment record

## License

MIT License - See LICENSE file for details
