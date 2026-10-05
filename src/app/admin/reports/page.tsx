'use client'

import { useState } from 'react'

type Row = { source: string; campaign: string; orders: number; revenue: number; spend: number; roas: number | null; platformRoas: number | null; aov: number | null }
const money = (value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
const ratio = (value: number | null) => value === null ? '—' : `${value.toFixed(2)}×`
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export default function AdsReports() {
  const [to, setTo] = useState(today)
  const [from, setFrom] = useState(() => `${today().slice(0, 8)}01`)
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [day, setDay] = useState(today)
  const [source, setSource] = useState('meta')
  const [campaign, setCampaign] = useState('')
  const [amount, setAmount] = useState('')
  const [platformRevenue, setPlatformRevenue] = useState('')

  async function load() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(`/api/admin/reports/ads?from=${from}&to=${to}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Rapor alınamadı')
      setRows(result.rows); setLoaded(true)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Rapor alınamadı'); setLoaded(false) }
    finally { setBusy(false) }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/reports/ads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day, source, campaign, amount: Number(amount), platformRevenue: platformRevenue ? Number(platformRevenue) : null }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Kaydedilemedi')
      setMessage('Harcama kaydedildi. Aynı gün, kaynak ve kampanya için girilen tutar öncekinin yerine geçer.')
      setLoaded(false)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Kaydedilemedi') }
    finally { setBusy(false) }
  }
  const input = 'block w-full rounded border border-gray-300 p-2 text-sm'
  return <div className="space-y-8">
    <div><h1 className="text-2xl font-semibold">Reklam gelir raporu</h1><p className="mt-2 text-sm text-gray-600">Ödenmiş siparişler ve girdiğiniz reklam harcamaları karşılaştırılır. İptal ve iadeler çıkarılır. Gelir kargo ve KDV dahil tahsilattır; kâr değildir.</p></div>
    <div className="flex flex-wrap items-end gap-4">
      <label>Başlangıç<input className={input} type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label>Bitiş<input className={input} type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <button disabled={busy} onClick={load} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">Raporu getir</button>
    </div>
    {message && <p role="status" className="rounded border p-3 text-sm">{message}</p>}
    {loaded && <div className="overflow-auto rounded border bg-white"><table className="w-full text-left text-sm"><caption className="p-3 text-left text-gray-600">İstanbul saatiyle sipariş oluşturma tarihi. Kaynak ve kampanya siparişteki son saklanan UTM değerleridir; platformun atıf modeliyle aynı olmayabilir.</caption><thead><tr>{['Kaynak / Kampanya', 'Sipariş', 'Tahsilat', 'Harcama', 'Sipariş ROAS', 'Platform ROAS', 'Ort. sepet'].map(label => <th key={label} className="border-b p-3">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={JSON.stringify([row.source, row.campaign])}><td className="p-3">{row.source}<br /><span className="text-gray-500">{row.campaign || 'Kampanya bilgisi yok'}</span></td><td className="p-3">{row.orders}</td><td className="p-3">{money(row.revenue)}</td><td className="p-3">{money(row.spend)}</td><td className="p-3">{ratio(row.roas)}</td><td className="p-3">{ratio(row.platformRoas)}</td><td className="p-3">{row.aov === null ? '—' : money(row.aov)}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-4 text-gray-500">Seçilen dönemde sipariş veya harcama bulunamadı.</p>}</div>}
    <form onSubmit={save} className="space-y-4 rounded border bg-white p-5">
      <h2 className="text-lg font-semibold">Günlük reklam harcaması</h2><p className="text-sm text-gray-600">Kaynak ve kampanyayı reklam bağlantılarındaki utm_source ve utm_campaign ile aynı yazın. Meta / Google panelinden TRY tutarlarını girin. Platform geliri isteğe bağlıdır.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label>Gün<input className={input} type="date" required value={day} onChange={e => setDay(e.target.value)} /></label>
        <label>Kaynak<input className={input} required maxLength={100} value={source} onChange={e => setSource(e.target.value)} /></label>
        <label>Kampanya<input className={input} maxLength={200} value={campaign} onChange={e => setCampaign(e.target.value)} /></label>
        <label>Harcama (TL)<input className={input} type="number" required min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label>Platform geliri (TL)<input className={input} type="number" min="0" step="0.01" value={platformRevenue} onChange={e => setPlatformRevenue(e.target.value)} /></label>
      </div>
      <button disabled={busy} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">Harcamayı kaydet</button>
    </form>
  </div>
}
