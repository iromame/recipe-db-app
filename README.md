# Family Recipe Database

A standard-compliant recipe database built for 10-year maintenance-free operation.
This project uses Cloudflare Workers, D1 (SQLite), Hono, and React + Vite.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS v4, vite-plugin-pwa
- **Backend:** Cloudflare Workers, Hono
- **Database:** Cloudflare D1 (SQLite) + Drizzle ORM
- **Standard:** Schema.org (Recipe) & RecipeMD

## Local Development

Install dependencies:
```bash
npm install
```

Start the local development server (Frontend + Backend + Local D1 Database):
```bash
npm run dev
```
Your application will be available at [http://localhost:5173](http://localhost:5173).

### Database Migrations
When you change the schema (`src/db/schema.ts`), generate and apply migrations:
```bash
npx drizzle-kit generate
npx wrangler d1 migrations apply recipe_db --local
```

### Type Generation
When you change Cloudflare bindings in `wrangler.json`, regenerate types:
```bash
npm run cf-typegen
```

## Production Deployment

Latest code must be built before deployment to reflect changes (especially CSS/Frontend):
```bash
npm run build && npm run deploy
```

*(Note: `npm run deploy` alone only uploads files already in the `dist` directory. Use the combined command above for a safe deployment.)*

*(Note: The first time you deploy to a new `.workers.dev` subdomain, it may take 3-5 minutes for the SSL certificate to be provisioned. If you see an SSL mismatch error, please wait a few minutes and refresh.)*

### Production Database
Before the app can work perfectly in production, you might need to apply the D1 schema to your production database.
```bash
npx wrangler d1 migrations apply recipe_db --remote
```

## PWA Support
This application is configured as a Progressive Web App (PWA). Once deployed via HTTPS (e.g. on Cloudflare), you can install it to your smartphone's home screen for an app-like experience in the kitchen.
