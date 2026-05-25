// netlify/functions/config.mts
// Returns public client-side config values from server env vars.
// Safe to expose: reCAPTCHA site key is always public (it's in every page's HTML).
import type { Context } from '@netlify/functions'

export default async function handler(_req: Request, _ctx: Context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  return new Response(
    JSON.stringify({
      recaptchaSiteKey: process.env.recapcha_key ?? '',  // exact Netlify var name
    }),
    { status: 200, headers: corsHeaders }
  )
}
