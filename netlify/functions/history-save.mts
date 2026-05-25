// netlify/functions/history-save.mts
import type { Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export default async function handler(req: Request, ctx: Context) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Netlify Identity populates ctx.clientContext.user when a valid JWT is sent.
    // This is the correct way to verify Netlify Identity JWTs — no manual decode needed.
    const user = (ctx as any).clientContext?.user
    if (!user?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const item = await req.json()

    // Validate required fields before writing to Blobs
    if (!item?.id || typeof item.id !== 'string' || !item?.text || !item?.timestamp) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: corsHeaders })
    }

    // Scope the key to the authenticated user — prevents one user reading another's data
    const store = getStore('transcripts')
    await store.setJSON(`${user.sub}/${item.id}`, item)

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
}
