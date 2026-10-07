# SEO baseline and catalog inventory

Collected 2026-10-07 from read-only Supabase queries and the live lab capture in [seo-performance-before.json](seo-performance-before.json). The JSON file retains the full live category rows and 20 current product candidate records, including descriptions, barcodes, image URLs, and stock fields.

Production origin: https://www.favorikozmetik.com. The 20 product candidates are a catalog-priority sample selected across five root categories and ordered per category by stored review_count and record recency. This is not a sales ranking. Stored product review counters are not verified review-table totals; an aggregate check found no review rows for three sampled SKUs. SEO overrides should use only facts supported by the current product row.

The saved lab run covers four pages: home, the Tırnak category, the legacy Toz Toplayıcı path, and all products. It includes status, title, canonical, robots meta, LCP, CLS, and TTFB. Conditions are recorded in the raw file; these are lab measurements, not Lighthouse scores or real-user metrics. The capture does not include product-page or JSON-LD/schema results. Search Console access was unavailable.

The observed legacy URL /kategori/tirnak/toz-toplayici returned HTTP 200 but used the generic title “Alt Kategori | Favori Kozmetik” and self-canonicalized to that short URL. The database hierarchy is toz-toplayici → cihazlar → tirnak; the complete hierarchy URL is /kategori/tirnak/cihazlar/toz-toplayici.

Raw prices in the JSON are database kuruş; [price.ts](../src/lib/price.ts) converts them to display TL with db/100.
