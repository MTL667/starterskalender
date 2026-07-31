/**
 * Validate that a From address is usable with the configured SendGrid account
 * (verified sender identity or authenticated domain).
 */
export async function validateSendGridFrom(fromEmail: string): Promise<{
  ok: boolean
  error?: string
}> {
  const email = fromEmail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) {
    return { ok: false, error: 'Invalid email address format' }
  }

  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'SendGrid API key is not configured' }
  }

  const domain = email.split('@')[1]

  try {
    const [sendersRes, domainsRes] = await Promise.all([
      fetch('https://api.sendgrid.com/v3/verified_senders?limit=100', {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
    ])

    if (sendersRes.status === 401 || domainsRes.status === 401) {
      return { ok: false, error: 'SendGrid authentication failed — check API key' }
    }

    let matchedSender = false
    if (sendersRes.ok) {
      const senders = await sendersRes.json()
      const list = Array.isArray(senders) ? senders : senders?.results || []
      matchedSender = list.some((s: any) => {
        const from = String(s.from_email || s.fromEmail || '').toLowerCase()
        const verified = s.verified === true || s.verified?.status === true
        return from === email && verified
      })
    }

    let matchedDomain = false
    if (domainsRes.ok) {
      const domains = await domainsRes.json()
      const list = Array.isArray(domains) ? domains : []
      matchedDomain = list.some((d: any) => {
        const dName = String(d.domain || '').toLowerCase()
        const valid = d.valid === true
        return valid && (dName === domain || domain.endsWith(`.${dName}`))
      })
    }

    // Fallback: if both list endpoints fail/empty but env From matches, allow env default
    const envFrom = (process.env.SENDGRID_FROM_EMAIL || process.env.MAIL_FROM || '').toLowerCase()
    if (!matchedSender && !matchedDomain && envFrom && envFrom === email) {
      return { ok: true }
    }

    if (matchedSender || matchedDomain) {
      return { ok: true }
    }

    // If APIs returned non-ok (permissions), don't hard-block when we couldn't inspect
    if (!sendersRes.ok && !domainsRes.ok) {
      return {
        ok: false,
        error: `Could not verify From address with SendGrid (HTTP ${sendersRes.status}/${domainsRes.status}). Ensure the API key can read verified senders.`,
      }
    }

    return {
      ok: false,
      error: `"${email}" is not a verified SendGrid sender and its domain is not authenticated. Verify the sender or domain in SendGrid first.`,
    }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to validate From address' }
  }
}
