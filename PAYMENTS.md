# iyzico Payments Integration

Add the following environment variables to `.env.local`:

```
IYZICO_API_KEY=your_api_key
IYZICO_SECRET_KEY=your_secret_key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Endpoints:
- `POST /api/payment`: initializes 3DS payment and returns `paymentPageUrl` and `token`
- `GET /api/payment/status?token=...`: verifies payment after iyzico redirects back

UI Routes:
- `GET /checkout`: basic checkout form to collect buyer info and start payment
- `GET /payment/callback`: shows payment result

Production:
```
IYZICO_BASE_URL=https://api.iyzipay.com
NEXT_PUBLIC_BASE_URL=https://your-domain
```
