const fs=require('fs')
const rows=JSON.parse(fs.readFileSync('.pricing-backups/import-plan.json')).filter(p=>/^FK\d{6,}$/.test(p.barcode))
const json=JSON.stringify(rows).replaceAll("'","''")
const query=`WITH source AS (SELECT * FROM jsonb_to_recordset('${json}'::jsonb) AS x(name text, "priceKurus" bigint, "originalPriceKurus" bigint)), changed AS (UPDATE public.products p SET price=s."priceKurus",original_price=s."originalPriceKurus",discount=CASE WHEN s."originalPriceKurus">0 THEN GREATEST(0,ROUND((1-s."priceKurus"::numeric/s."originalPriceKurus")*100)) ELSE NULL END FROM source s WHERE p.name=s.name AND p.barcode ~ '^FK[0-9]{6,}$' AND p.deleted_at IS NULL RETURNING p.id) SELECT count(*) AS duplicate_records_aligned FROM changed;`
fs.writeFileSync('.pricing-backups/sync-duplicates.sql',query)
console.log(JSON.stringify({query,sourceRows:rows.length}))
