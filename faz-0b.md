Plan: @favori_kozmetik_tam_iyileştirme_398151b4.plan.md

Görev: Sadece FAZ 0B (todo: sec-admin-mw) — BULGU-2.
- middleware.ts: adminAuthV2 kaldır; @supabase/ssr getUser(); matcher /admin/:path*
- api/products: isAdminRequest içindeki adminAuthV2 kaldır; getUser()+role
- src/app/admin/middleware.ts stub sil

Kapsam dışı: FAZ 0A (bitti varsay), FAZ 1+, upload route.
Önceki: FAZ 0A bitti — upload'ta getUser+admin + tip/boyut/folder kilidi.

Bittiğinde: değişen dosyalar; test (login/logout admin); todo completed.
