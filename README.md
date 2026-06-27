# Dollar Vault

A premium, local-first personal financial dashboard built with Next.js 15, SQLite, and Plaid. Dollar Vault acts as your personal, automated Finance Manager. It runs entirely on your local machine, ensuring your sensitive financial data and bank credentials never leave your home network.

## 🌟 Core Features

- **Plaid Integration:** Securely link multiple checking accounts, credit cards, and investments via Plaid Link without storing credentials.
- **Automated Sync Engine:** A background synchronization engine automatically pulls your latest transactions and streams real-time updates via SSE.
- **Intelligent Auto-Categorization:** A custom deterministic rules engine automatically routes merchants to your specific budget buckets based on your personalized settings.
- **Strict Double-Entry Accounting:** Intelligently identifies and excludes internal transfers, credit card liability payments, and savings deposits from your expense tracking to provide your true "Net Free Cash Flow".
- **Zero-Based Budgeting (ZBB):** Track monthly targets against limits with a true ZBB equation (*Planned Income - Allocations = $0*). Supports month-specific snapshots (preserving historical limits) and future month pre-planning.
- **Sinking Funds & Overdue Alerts:** Integrates monthly due days directly onto budget cards. Features visual SVG status badges and triggers a red border glow for unpaid bills after their due date.
- **Advanced Cash Flow Analytics:** 
  - Net Worth multi-account tracking.
  - Interactive Cash Flow Sankey diagrams automatically sorted by highest capital leakage.
  - Compare Periods metrics with stacked, dynamic area charts.
- **Subscription Tracker & Savings Optimizer:** 
  - Tracks monthly outflows and automatically annualizes savings: `weekly * 52`, `biweekly * 26`, `monthly * 12`.
  - Interactive list of glassmorphic subscription cards sorted by highest annual cost first.
  - "Consider Cancel" selection tool with a live annual savings estimator card to identify and target budget leakage.
- **Interactive Bill Calendar:** 
  - A monthly calendar grid that maps out upcoming recurring income (green) and expense bills (red) onto a calendar timeline.
  - Automatic projections based on Plaid frequency rules when next expected dates are null.
  - Responsive layout that collapses into a chronological daily list view on mobile.
- **Multi-Format Data Export:**
  - Export transactions in either CSV or JSON formats, fully respecting the user's active filter state (search keywords, categories, date ranges, account filters).
- **AI Global Assistant:** A sleek, glassmorphic floating AI widget powered by your local AI translator server. The AI acts as a strict Harvard MBA Finance Manager, observing the page you are on to offer dynamic, context-aware prompts (e.g., *Identify lifestyle creep*, *Audit zero-based budget*). It streams real-time insights, sinking fund warnings, and cash flow optimization strategies directly to your screen.

## 🏗️ System Architecture

Dollar Vault uses a monolithic, local-first architecture designed for maximum privacy, speed, and premium UX.

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Library:** React 19
- **Design System:** UI/UX Pro Max (Custom styling system utilizing heavy glassmorphism, dynamic transitions, gradients, and CSS Modules).
- **Data Visualization:** Recharts for dynamic, responsive Sankey and Area charts.
- **State & Routing:** Next.js Client-Side Router with aggressive App Router caching.

### Backend
- **API Engine:** Next.js Edge and Node.js API Routes (`/api/*`).
- **Database:** SQLite running strictly locally via `better-sqlite3`.
- **ORM:** Drizzle ORM for type-safe schema definitions, migrations, and query building.
- **Security & Auth:** A stateless Edge Middleware proxy intercepts all routes to validate AES-256 HMAC signed session cookies. The application is secured via a bcrypt-hashed master application password (`APP_PASSWORD_HASH`).
- **AI Proxy:** Server-side proxy routing to securely stream Server-Sent Events (SSE) from the local AI Python translator server to the frontend, bypassing CORS and standardizing payloads for Ollama (qwen2.5:14b).

### Data Flow
1. **Ingestion:** Background cron jobs fetch raw data from Plaid API.
2. **Processing:** Transactions run through the Rule Engine for categorization. Cross-account transfers are identified and neutralized from cash flow metrics.
3. **Storage:** Standardized entities (Transactions, Budgets, Accounts) are saved to the local SQLite database.
4. **Insights:** Complex aggregation queries feed the Next.js API routes, powering the Sankey flows, ZBB calculations, and providing raw context to the AI Assistant.

## 🚀 Getting Started

Dollar Vault is designed to be fully self-hosted. It supports a **"Bring Your Own Keys" (BYOK)** setup flow where you connect your own Plaid developer account and your own local Ollama AI models.

### Option 1: Docker Compose (Recommended)

The easiest way to run Dollar Vault is using Docker Compose. This packages all dependencies (including native SQLite libraries) and sets up a volume for persistent storage.

1. **Create a `docker-compose.yml` file** (or use the one in this repository):
   ```yaml
   version: '3.8'

   services:
     dollar-vault:
       image: dollar-vault:latest  # Or build locally using 'build: .'
       container_name: dollar-vault
       ports:
         - "3000:3000"
       volumes:
         - ./data:/app/data
       environment:
         - SESSION_SECRET=change_this_to_a_long_random_string_in_production_12345
         - AUTH_DISABLED=false
       restart: unless-stopped
   ```

2. **Run the container**:
   ```bash
   docker compose up -d
   ```

3. **Complete Setup**:
   Open [http://localhost:3000](http://localhost:3000) in your browser. Since this is your first run, you will be automatically redirected to the **Setup Wizard** at `/setup`.

---

### Option 2: Local Development (Bare Metal)

If you prefer to run the application directly on your local machine:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run the Development Server**:
   ```bash
   npm run dev
   ```

3. **Initialize Configuration**:
   Navigate to [http://localhost:3000](http://localhost:3000). The app will detect that settings are unconfigured and redirect you to the Setup Wizard at `/setup`.

---

## 🧪 Testing & Seeding Mock Data

To test Dollar Vault without linking a live bank account or configuring Plaid keys immediately, you can seed the SQLite database with realistic mock data (including June and May 2026 transactions, ZBB allocations, due dates, and recurring calendar events):

### Seeding on Bare Metal (Local)
1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Seed the database:
   ```bash
   node seed-all-test-data.mjs
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

### Seeding with Docker Compose
1. Start the Docker containers:
   ```bash
   docker compose up -d
   ```
2. Run the seeding script inside the container:
   ```bash
   docker compose exec dollar-vault node seed-all-test-data.mjs
   ```

Once seeded, navigate to [http://localhost:3000](http://localhost:3000). The setup wizard and login gate will be automatically bypassed in development mode, allowing you to interact with all the features and charts immediately.

---

## 🛠️ The Setup Wizard (`/setup`)

During the first launch, the Setup Wizard will guide you through entering:
* **Plaid API Credentials**: `Client ID`, `Secret`, and `Environment` (Sandbox or Development). Get these for free at [dashboard.plaid.com](https://dashboard.plaid.com).
* **Local AI Local URL**: The address of your local AI translator server running Ollama (e.g., `http://127.0.0.1:8000`).
* **Master Security Password**: The password you will use to unlock your dashboard. This is hashed using bcrypt and stored safely in your local SQLite database (`/app/data/budget.db`).

The wizard features a **Test Plaid Connection** utility to verify your credentials before writing them to the database.

---

## 🔗 Plaid Link Sandbox Mode Walkthrough

To link accounts in Plaid's developer test mode (Sandbox):
1. Configure Plaid with the **Environment** set to `sandbox` in the Setup Wizard.
2. In the app, click the **Link Account** button to launch the Plaid Link dialog.
3. Select any financial institution.
4. Log in using the standard sandbox credentials:
   - **Username**: `user_good`
   - **Password**: `pass_good`
5. If prompted for MFA or a security code, enter any numbers (e.g., `123456`).
6. The database will immediately ingest mock transactions and balances from the simulated bank.

---

## 🧠 Running the AI Assistant

The AI Assistant widget uses a local Ollama instance to analyze your spending and cash flows without sending any sensitive financial data to the cloud.

### 1. Start Ollama
1. Install [Ollama](https://ollama.com/) locally.
2. Download the recommended model (Qwen 2.5 14B) in your terminal:
   ```bash
   ollama pull qwen2.5:14b
   ```

### 2. Run the AI Translator Server
Dollar Vault includes a zero-dependency Python script that bridges Next.js and Ollama, parsing response streams into the frontend's SSE format. Start it with:
```bash
python ai-server.py
```
This runs the AI adapter at `http://localhost:8000`.

### 3. Connect AI in Setup
During first-run setup, configure the **Local AI Local URL** as:
`http://127.0.0.1:8000`

---

## 📜 Licensing & Open-Source

Dollar Vault is open-source software licensed under the **Apache License, Version 2.0**. Under this license:
* You are free to run, copy, modify, and distribute the software.
* You may use the software for personal or commercial purposes.
* All original copyright, patent, trademark, and attribution notices must be retained in any modified versions or derivative works.
* For more details, see the [LICENSE](LICENSE) file in the root directory.
