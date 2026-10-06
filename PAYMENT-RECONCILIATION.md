# Payment settlement deployment

1. Apply `payment-reconciliation.sql` after the existing basket-ID and tracking migrations. No live changes are made by adding this file. Until applied, webhook and cron safely return 503.
2. Set server-only `CRON_SECRET`, `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` and Supabase service-role configuration on production.
3. Configure the iyzico **Direct API** webhook URL as `https://YOUR-DOMAIN/api/payment/webhook`. Ask the iyzico integration team to enable **X-IYZ-SIGNATURE-V3**. Unsigned and older signatures are rejected.
4. Vercel daily cron checks payments at 02:15 UTC. For prompt recovery, create Vault `payments_cron_url` pointing to `/api/cron/payments`, reuse the existing `tracking_cron_secret` (same server `CRON_SECRET`), then apply `supabase-payment-cron.sql`. This checks every five minutes and does not require a Vercel Pro frequency.

The webhook is only a signal: authoritative payment retrieve and reporting must agree on payment ID, conversation, basket, TRY amount, approval and absence of refunds/cancellation. Reporting failures leave the payment unresolved. Authenticated cron claims at most five recent pending/failed orders with row locks, three-minute leases and exponential retry intervals (one-day maximum). Its automatic window is 90 days; older history requires explicit manual reconciliation.

Financial corrections preserve cancelled/shipped/completed fulfillment. Refunded records never become paid; refunded or cancelled iyzico reports are never accepted as unrefunded success. Existing tracking SQL enqueues eligible purchases transactionally with deduplication; cancelled orders do not enqueue purchase. No raw payment payloads or credentials are returned by these endpoints.

Coupon/email/invoice follow-ups run through the shared active-paid-order helper. Successful financial settlement is durable even if follow-up delivery fails. Completed orders are not periodically claimed by this payment cron; follow-up retries require another callback/status request or operational review. Invoice requests with ambiguous outcomes retain their claim and require manual provider review before retrying, to prevent duplicate invoices.

Official references: [iyzico webhook](https://docs.iyzico.com/ek-servisler/webhook), [payment inquiry](https://docs.iyzico.com/odeme-metotlari/api/non-3ds/non-3ds-entegrasyonu/odeme-sorgulama), [reporting](https://docs.iyzico.com/on-hazirliklar/api-reference-beta/raporlama), [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
