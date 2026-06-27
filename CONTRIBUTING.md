# Contributing to Dollar Vault

We welcome contributions to Dollar Vault! This guide outlines the workflow and standards to help you get started.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or later (Recommended: `v22` / LTS).
- **Python**: `3.8+` (Only needed if running the local AI assistant server).
- **Ollama**: (Optional, for local inference).

### 2. Setting Up the Project
1. Fork and clone the repository.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and configure variables:
   ```bash
   cp .env.example .env.local
   ```
4. Run the seeder to initialize the database schema and populate realistic test data:
   ```bash
   node seed-all-test-data.mjs
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```

---

## 📦 Database & ORM Workflow

Dollar Vault uses **Drizzle ORM** with **better-sqlite3** to run SQLite locally. 

- **Drizzle Config**: Located at `drizzle.config.ts`.
- **Database Schema**: Definitions are in `src/lib/db/schema.ts`.
- **Database Setup**: Initial tables are initialized dynamically on first run by `src/lib/db/init.ts`.

If you alter the database schema:
1. Update `src/lib/db/schema.ts`.
2. Update the default initializer `src/lib/db/init.ts` to ensure tables are correctly set up.
3. Update `seed-all-test-data.mjs` if the mock data model changes.

---

## 🎨 Coding & Design Standards

### UI & Styling
- **Vanilla CSS**: We use custom glassmorphic properties, CSS Modules (`*.module.css`), and root CSS custom properties in `src/app/globals.css`. 
- **Icons**: Use pure SVG markup directly in components (no emoji icons). Ensure vector attributes are responsive.
- **Responsiveness**: All pages must scale cleanly down to mobile devices ($375px$ width), collapsing side-by-side components into vertical columns.

### Linting & Formatting
Verify your changes do not violate the eslint config before committing:
```bash
npm run lint
```

---

## 🚀 Pull Request Process

1. Create a descriptive topic branch:
   ```bash
   git checkout -b feature/your-awesome-feature
   ```
2. Write clean, self-documenting code.
3. Ensure no local secrets (Plaid API keys, databases) are staged in Git (the `/data/` and `/backups/` directories are gitignored).
4. Run a local build test to make sure everything compiles cleanly:
   ```bash
   npm run build
   ```
5. Open a Pull Request detailing the changes, and attach a screenshot/video if you made visual UI adjustments.
