# Coupon Test Cases

## Admin
- Create percent coupon (`SAVE20`) with active status and date range.
- Create fixed coupon (`100TL`) with total and per-customer limits.
- Update coupon fields and verify list reflects changes.
- Disable coupon and verify checkout rejects it.

## Validate API
- Valid coupon returns discount and subtotal-after-discount.
- Expired coupon returns `Kuponun süresi dolmuş`.
- Future coupon returns `Kupon henüz aktif değil`.
- Unknown coupon returns `Kupon bulunamadı`.
- Empty cart returns `Sepet boş`.

## Payment API (server-side source of truth)
- Client sends manipulated item prices; backend recalculates from DB and charges correct amount.
- Percent coupon applies on product subtotal only (shipping excluded).
- Fixed coupon never makes subtotal negative.
- Total usage limit blocks after limit is reached.
- Per-customer limit blocks same email after limit is reached.

## Post-Payment Usage Recording
- Paid order with coupon creates one `coupon_usages` record.
- Repeated status polling does not duplicate usage (`order_id` unique + upsert).
- Paid order without coupon does not create usage row.
