import fs from 'node:fs/promises'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const plan=JSON.parse(await fs.readFile('.pricing-backups/import-plan.json','utf8'))
const products=[]
for(let offset=0;;offset+=1000){
 const {data,error}=await client.from('products').select('id,name,slug,barcode,price,original_price,in_stock,stock_quantity').is('deleted_at',null).order('id').range(offset,offset+999)
 if(error)throw new Error(error.code)
 products.push(...data)
 if(data.length<1000)break
}
const mismatches=[]
let matched=0
for(const p of plan){
 const hits=products.filter(d=>/^FK\d{6,}$/.test(p.barcode)?d.name===p.name:d.barcode===p.barcode)
 if(!hits.length)mismatches.push({name:p.name,reason:'missing'})
 for(const d of hits){
  matched++
  if(d.price!==p.priceKurus||d.original_price!==p.originalPriceKurus)mismatches.push({name:p.name,id:d.id,price:d.price,expected:p.priceKurus})
 }
}
const report={capturedAt:new Date().toISOString(),planRows:plan.length,activeProducts:products.length,matchedRecords:matched,mismatches,samples:[17500,650000,31990].map(price=>products.find(p=>p.price===price&&p.in_stock&&p.stock_quantity>0)).filter(Boolean)}
await fs.writeFile('.pricing-backups/live-verification.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({planRows:report.planRows,activeProducts:report.activeProducts,matchedRecords:matched,mismatchCount:mismatches.length,samples:report.samples.map(p=>({id:p.id,slug:p.slug,priceKurus:p.price,displayTL:p.price/100}))}))
if(mismatches.length)process.exitCode=1
