Plan: @favori_kozmetik_tam_iyileştirme_398151b4.plan.md

Görev: Sadece FAZ 4A (todo: price-module) — BULGU-7.
src/lib/price.ts: dbToDisplay/displayToDb/toDisplayPrice/formatTRY;
tüm (price/100)/10, *1000, *10,/10, toLocaleString migrate;
format-price no-op kaldır/yönlendir. Davranış aynı kalsın (regresyon yok).

Kapsam dışı: FAZ 4B silme, FAZ 3.
Önceki: FAZ 2 bitti. Plan sırası: 4A 4B, sonra 3.

Bittiğinde: değişen dosyalar; test (liste/detay/sepet/checkout fiyat); todo completed.
