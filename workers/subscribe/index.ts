/**
 * The mail slot: eto.news/subscribe — the only server-side code eto has,
 * and it exists so nobody can be subscribed without asking twice.
 *
 * POST /subscribe          form submit -> confirmation email (double opt-in)
 * GET  /subscribe          the form, standalone
 * GET  /subscribe/confirm  signed link from the email -> added to the list
 *
 * Stateless by design: the reader list lives in SES; this function holds
 * one narrow AWS credential and an HMAC secret, and stores nothing. Bots
 * meet a honeypot field and the fact that they cannot confirm an inbox
 * they do not own. No CAPTCHA — readers never solve puzzles for a paper.
 */
import { AwsClient } from "aws4fetch"

export interface Env {
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
  SUBSCRIBE_SECRET: string
}

const REGION = "ca-central-1"
const SES = `https://email.${REGION}.amazonaws.com/v2/email`
const LIST = "eto-readers"
const TOPIC = "morning-edition"
const FROM = "eto <brief@eto.news>"
const SITE = "https://eto.news"
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000

const INK = "#0a0a0a"
const CLARET = "#7f1d1d"
const QUIET = "#6b6b6b"
const SERIF = "Georgia, 'Times New Roman', serif"
const MONO = "Consolas, Menlo, 'Courier New', monospace"

const esc = (s: string): string =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")

const page = (title: string, body: string, status = 200): Response =>
  new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>eto — ${esc(title)}</title><link rel="icon" type="image/png" href="${SITE}/favicon.png"></head>
<body style="margin:0;background:#ffffff;"><div style="max-width:560px;margin:0 auto;padding:48px 20px;text-align:center;">
<p style="margin:0;font-family:${SERIF};font-size:40px;font-weight:500;color:${INK};"><a href="${SITE}" style="color:${INK};text-decoration:none;">eto</a></p>
<p style="margin:6px 0 34px 0;font-family:${MONO};font-size:12px;color:${QUIET};">One story. Every side. Then it ends.</p>
${body}
</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  )

const prose = (text: string): string =>
  `<p style="margin:0 0 14px 0;font-family:${SERIF};font-size:17px;line-height:1.6;color:${INK};">${text}</p>`

const formHtml = `
<form method="POST" action="/subscribe" style="margin:24px 0 0 0;">
  <div style="position:absolute;left:-5000px;" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>
  <input type="email" name="email" required placeholder="you@example.com" style="font-family:${MONO};font-size:15px;padding:10px 12px;border:1px solid #c9c9c9;width:60%;max-width:300px;color:${INK};">
  <button type="submit" style="font-family:${MONO};font-size:15px;padding:10px 18px;border:1px solid ${INK};background:${INK};color:#ffffff;cursor:pointer;">Subscribe</button>
  <p style="margin:12px 0 0 0;font-family:${MONO};font-size:12px;color:${QUIET};">One email each morning. Unsubscribe in every footer.</p>
</form>`

const hmac = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

const validEmail = (e: string): boolean =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const aws = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: REGION,
      service: "ses"
    })

    if (url.pathname === "/subscribe" && request.method === "GET") {
      return page(
        "subscribe",
        prose("Get the morning edition by email — one story, every side, then it ends.") + formHtml
      )
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      const form = await request.formData().catch(() => null)
      const email = String(form?.get("email") ?? "").trim().toLowerCase()
      const honeypot = String(form?.get("website") ?? "")

      // Bots that fill the hidden field get a polite lie and no email.
      if (honeypot !== "" || !validEmail(email)) {
        return page("check your inbox", prose("If that address is valid, a confirmation is on its way. Click the link inside and the morning edition is yours."))
      }

      const ts = Date.now().toString()
      const sig = await hmac(env.SUBSCRIBE_SECRET, `${email}:${ts}`)
      const confirmUrl = `${SITE}/subscribe/confirm?e=${encodeURIComponent(email)}&t=${ts}&s=${sig}`

      const send = await aws.fetch(`${SES}/outbound-emails`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          FromEmailAddress: FROM,
          Destination: { ToAddresses: [email] },
          Content: {
            Simple: {
              Subject: { Data: "eto — confirm your subscription" },
              Body: {
                Html: {
                  Data: `<div style="max-width:560px;margin:0 auto;padding:28px 20px;font-family:${SERIF};color:${INK};"><p style="font-size:34px;margin:0 0 4px 0;">eto</p><p style="font-family:${MONO};font-size:12px;color:${QUIET};margin:0 0 24px 0;">One story. Every side. Then it ends.</p><p style="font-size:16px;line-height:1.6;">You (or someone claiming your inbox) asked for the morning edition. One click to confirm, and it arrives each day, ends, and lets you leave:</p><p style="margin:22px 0;"><a href="${confirmUrl}" style="font-family:${MONO};font-size:15px;color:${CLARET};">Confirm subscription</a></p><p style="font-family:${MONO};font-size:12px;color:${QUIET};">If you didn't ask, ignore this and nothing happens. The link expires in 7 days.</p></div>`
                },
                Text: {
                  Data: `eto — one story, every side, then it ends.\n\nConfirm your subscription to the morning edition:\n${confirmUrl}\n\nIf you didn't ask, ignore this and nothing happens. The link expires in 7 days.`
                }
              }
            }
          }
        })
      })

      if (!send.ok) {
        return page(
          "try again",
          prose("The confirmation email could not be sent just now. Nothing was stored. Please try again in a minute."),
          502
        )
      }
      return page("check your inbox", prose(`A confirmation is on its way to <span style="font-family:${MONO};">${esc(email)}</span>. Click the link inside and the morning edition is yours.`))
    }

    if (url.pathname === "/subscribe/confirm" && request.method === "GET") {
      const email = (url.searchParams.get("e") ?? "").trim().toLowerCase()
      const ts = url.searchParams.get("t") ?? ""
      const sig = url.searchParams.get("s") ?? ""
      const expected = await hmac(env.SUBSCRIBE_SECRET, `${email}:${ts}`)
      const fresh = Number(ts) > 0 && Date.now() - Number(ts) < TOKEN_TTL_MS

      if (!validEmail(email) || !fresh || sig !== expected) {
        return page("link expired", prose(`That confirmation link is invalid or has expired. <a href="/subscribe" style="color:${CLARET};">Ask for a fresh one.</a>`), 400)
      }

      const create = await aws.fetch(`${SES}/contact-lists/${LIST}/contacts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          EmailAddress: email,
          TopicPreferences: [{ TopicName: TOPIC, SubscriptionStatus: "OPT_IN" }]
        })
      })

      if (!create.ok && create.status !== 409) {
        return page("try again", prose("Confirmation worked, but the list could not be updated just now. Please click the link again in a minute."), 502)
      }
      return page(
        "you're in",
        prose("Confirmed. The morning edition arrives each day, ends, and lets you leave — there's an unsubscribe link in every footer.") +
          prose(`Today's edition is already up: <a href="${SITE}" style="color:${CLARET};">eto.news</a>`)
      )
    }

    return Response.redirect(SITE, 302)
  }
}
