import { GET } from '@/app/api/cron/emails/route'
import { processEmailNotifications } from '@/lib/email-notifications'
jest.mock('next/server',()=>({NextResponse:{json:(body:unknown,options?:{status?:number})=>({status:options?.status??200,json:async()=>body})}}))
jest.mock('@/lib/supabase/server',()=>({createSupabaseAdmin:()=>({})}))
jest.mock('@/lib/email-notifications',()=>({processEmailNotifications:jest.fn()}))
beforeEach(()=>{jest.clearAllMocks();process.env.CRON_SECRET='secret'})
test('unauthenticated callers cannot send notification mail',async()=>{
  expect((await GET({headers:new Headers()} as any)).status).toBe(401)
  expect(processEmailNotifications).not.toHaveBeenCalled()
})
test('authenticated cron processes the durable queue',async()=>{
  ;(processEmailNotifications as jest.Mock).mockResolvedValue({sent:2,failed:0})
  const result=await GET({headers:new Headers({authorization:'Bearer secret'})} as any)
  expect(result.status).toBe(200);expect(await result.json()).toEqual({sent:2,failed:0})
})
test('database or configuration failure remains visible and retryable',async()=>{
  ;(processEmailNotifications as jest.Mock).mockRejectedValue(new Error('unavailable'))
  expect((await GET({headers:new Headers({authorization:'Bearer secret'})} as any)).status).toBe(503)
})
