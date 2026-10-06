# Existing iyzico order reconciliation

Run from the repository root with `.env.local` containing the configured live/sandbox iyzico credentials and server-only Supabase service role. No secrets, customer details, card data, or payment tokens are printed.

```powershell
# Read-only preview. Repeat --allow for each independently reviewed order/payment pair.
node scripts/reconcile-iyzico-orders.mjs --allow ORD-1791186773177-46CECY7STOV:4234926788

# Apply the same verified financial repair (fresh provider queries run again).
node scripts/reconcile-iyzico-orders.mjs --apply --allow ORD-1791186773177-46CECY7STOV:4234926788

node --test scripts/reconcile-iyzico-orders.test.mjs
```

The tool never creates charges, refunds, cancellations, emails, analytics events, or stock changes. It updates only `orders.payment_status`; shipping/delivery/cancelled fulfillment status is preserved. Each update matches the entire selected order snapshot, including `updated_at`, financial status, merchant basket, token, total, and fulfillment status. If an administrator changes the row during verification, the zero-row update is reported as `concurrent_change` and must be reviewed again.

Requirements for a failed iyzico order to be repaired:

- Fresh `/payment/detail` must return a successful payment with the exact allowlisted payment ID, merchant basket ID, TRY currency, and integer kuruş amount.
- Fresh `/v2/reporting/payment/details` must return one matching payment ID, conversation ID, TRY currency, and amount. The reporting API's basket ID is an internal iyzico identifier; merchant basket verification uses `/payment/detail` instead.
- `NOT_REFUNDED` payments require approved fraud status, successful payment status, approved transaction items, and no cancellation/refund records; they map to `completed`.
- `TOTALLY_REFUNDED` payments map to `refunded` and retain their fulfillment status. The report includes successful refund/cancel totals for operator review.
- Partial refunds, unavailable reports, identity/amount mismatches, or fraud review are refused. The tool does not infer their state from customer statements or earlier dry runs.

The current one-off repair intentionally leaves already `completed` or `refunded` financial records unchanged. Use the continuous reconciliation service for subsequent provider events. Repairing cancelled yet paid orders does not authorize shipment; a `fulfillmentReview` marker requires a separate operational decision.

Exit codes: `0` verified preview/update or already reconciled; `2` one or more refused/concurrently changed rows; `1` configuration, connection, or unexpected database/provider failure. A failed run may have updated earlier allowlisted rows; rerunning is safe and skips already reconciled rows.

Reporting GET authentication signs `randomString + uriPath`, with no body or query string, matching the [official PHP SDK](https://github.com/iyzico/iyzipay-php/blob/master/src/Iyzipay/IyziAuthV2Generator.php). POST retrieval signs `randomString + uriPath + JSON body`.
