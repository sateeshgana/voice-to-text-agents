// netlify/functions/history-save.mts
import type { Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export default async function handler(req: Request, _ctx: Context) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const item = await req.json()
    const store = getStore('transcripts')
    await store.setJSON(`${item.id}`, item)

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
}
