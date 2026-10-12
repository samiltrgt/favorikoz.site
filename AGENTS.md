## Cursor Cloud specific instructions

Favori Kozmetik (`favorikoz-site`) is one Next.js 14 App Router storefront. Standard commands are in `package.json` and `README.md`: `npm run dev` (port 3000), `npm test`, `npm run type-check`, `npm run test:tracking:sql`. Required env vars are listed in `ENV_SETUP.md` and `.env.example`. Copy them into `.env.local` (gitignored).

- Homepage, `/tum-urunler`, and `GET /api/products` throw if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing. The root layout catches that error for the menu and still renders. Static pages such as `/kargo-iade` and the empty cart at `/sepet` load without those keys. The cart page only fills line items after `/api/products` succeeds; cart storage itself is `localStorage` in `src/lib/cart.ts`.
- Checkout and admin writes also need `SUPABASE_SERVICE_ROLE_KEY`, `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, and `IYZICO_BASE_URL` (`https://sandbox-api.iyzipay.com` locally). Set `NEXT_PUBLIC_BASE_URL=http://localhost:3000`. iyzico 3DS cannot call back to localhost unless `IYZICO_CALLBACK_URL` is a public URL.
- `npm run lint` is `next lint`, and this repo has no ESLint config. The first run is an interactive prompt that writes `.eslintrc.json`. Do not run it unattended. `npm run type-check` does not need that config.
- `npm test` mocks Supabase. `__tests__/database/supabase.test.ts` stays skipped unless `RUN_SUPABASE_INTEGRATION_TESTS=true`.
- `npm run test:tracking:sql` uses in-memory PGlite. It does not need credentials or a network database.
- `npm run test:e2e` starts `npm run dev` and expects real product cards from Supabase. `npm install` does not install Playwright browsers (`npx playwright install` first).
- Do not point `.env.local` at production Supabase and then run migrations or payment tests.
