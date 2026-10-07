import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const tables = ['ad_spend','banners','categories','coupon_usages','coupons','favorites','featured_products','hero_products','home_carousel_products','orders','own_production_products','products','profiles','promo_banner_products','promo_banners','reviews','scroll_hero_products','tracking_consent','tracking_outbox']
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const dir=path.resolve('.pricing-backups',new Date().toISOString().replace(/[:.]/g,'-'))
await fs.mkdir(dir,{recursive:true})
const manifest={capturedAt:new Date().toISOString(),project:new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,tables:{}}
for(const table of tables){
 const all=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await client.from(table).select('*').range(offset,offset+499)
  if(error)throw new Error(`Backup ${table}: ${error.code}`)
  all.push(...data)
  if(data.length<500)break
 }
 const content=JSON.stringify(all)
 await fs.writeFile(path.join(dir,`${table}.json`),content)
 manifest.tables[table]={rows:all.length,sha256:crypto.createHash('sha256').update(content).digest('hex')}
 console.log(`${table}: ${all.length} rows backed up`)
}
await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2))
console.log(`Application data backup completed: ${dir}`)
