import { buildNotificationEmail, processEmailNotifications, type EmailNotification } from '@/lib/email-notifications'
jest.mock('server-only', () => ({}))
jest.mock('@react-email/render', () => ({ render: jest.fn(async (_node, options) => options?.plainText ? 'text' : '<html>mail</html>') }))
const event: EmailNotification = { id: 'event', lease_token: 'lease', kind: 'admin_signup', payload: { customerName: 'Test', email: 'customer@example.invalid' } }
let db: any
beforeEach(() => {
  Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: jest.fn(() => new AbortController().signal) })
  process.env.RESEND_API_KEY='test'; process.env.ORDER_FROM_EMAIL='Favori <siparis@example.invalid>'
  process.env.ADMIN_NOTIFICATION_EMAIL='admin@example.invalid'; delete process.env.VERCEL_ENV
  const chain: any = { maybeSingle: jest.fn(async()=>({data:{status:'paid',payment_status:'completed'},error:null})) }
  chain.select=chain.eq=jest.fn(()=>chain)
  db={ from:jest.fn(()=>chain),rpc:jest.fn(async(name)=>name==='claim_email_notifications'?{data:[event],error:null}:{data:true,error:null}) }
  global.fetch=jest.fn(async()=>({ok:true,json:async()=>({id:'provider'})})) as any
})
test('admin and customer messages use separate recipients',async()=>{
  expect((await buildNotificationEmail(event)).to).toBe('admin@example.invalid')
  expect((await buildNotificationEmail({...event,kind:'welcome'})).to).toBe('customer@example.invalid')
})
test('success uses a stable idempotency key and stores the provider ID',async()=>{
  expect(await processEmailNotifications(db)).toEqual({sent:1,failed:0})
  expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails',expect.objectContaining({headers:expect.objectContaining({'Idempotency-Key':'notification/event'})}))
  expect(db.rpc).toHaveBeenLastCalledWith('finish_email_notification',expect.objectContaining({p_provider_id:'provider',p_lease_token:'lease'}))
})
test('timeout retries without marking sent',async()=>{
  ;(fetch as jest.Mock).mockRejectedValue(new Error('timeout'))
  expect(await processEmailNotifications(db)).toEqual({sent:0,failed:1})
  expect(db.rpc).toHaveBeenLastCalledWith('finish_email_notification',expect.objectContaining({p_retry:true,p_provider_id:null}))
})
test('provider authorization error is permanent',async()=>{
  ;(fetch as jest.Mock).mockResolvedValue({ok:false,status:403})
  await processEmailNotifications(db)
  expect(db.rpc).toHaveBeenLastCalledWith('finish_email_notification',expect.objectContaining({p_retry:false,p_error:'resend_http_403'}))
})
test('missing configuration does not claim or falsely mark emails sent',async()=>{
  delete process.env.RESEND_API_KEY
  await expect(processEmailNotifications(db)).rejects.toThrow('email_sender_not_configured')
  expect(db.rpc).not.toHaveBeenCalled()
})
test('preview deployments do not send customer emails',async()=>{
  process.env.VERCEL_ENV='preview'
  expect(await processEmailNotifications(db)).toEqual({sent:0,failed:0})
  expect(db.rpc).not.toHaveBeenCalled()
})
test('cancelled paid orders suppress queued success mail',async()=>{
  db.rpc.mockImplementation(async(name: string)=>name==='claim_email_notifications'?{data:[{...event,kind:'order_confirmation',order_id:'order'}]}:{data:true})
  db.from().maybeSingle.mockResolvedValue({data:{status:'cancelled',payment_status:'completed'}})
  await processEmailNotifications(db)
  expect(fetch).not.toHaveBeenCalled()
  expect(db.rpc).toHaveBeenLastCalledWith('finish_email_notification',expect.objectContaining({p_suppressed:true}))
})
test('unpaid orders do not receive shipping mail',async()=>{
  db.rpc.mockImplementation(async(name: string)=>name==='claim_email_notifications'?{data:[{...event,kind:'shipping',order_id:'order'}]}:{data:true})
  db.from().maybeSingle.mockResolvedValue({data:{status:'shipped',payment_status:'pending'}})
  await processEmailNotifications(db)
  expect(fetch).not.toHaveBeenCalled()
})
test('invalid address is rejected without sending',async()=>{
  process.env.ADMIN_NOTIFICATION_EMAIL='invalid'
  await processEmailNotifications(db)
  expect(fetch).not.toHaveBeenCalled()
  expect(db.rpc).toHaveBeenLastCalledWith('finish_email_notification',expect.objectContaining({p_retry:false,p_error:'invalid_recipient'}))
})
