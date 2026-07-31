import { describe, it, expect } from 'vitest'
import {
  parseRecipientList,
  pairRecipientsAndPdfs,
  renderPdfMailTemplate,
  isPdfFileName,
} from '@/lib/pdf-mailer'

describe('parseRecipientList', () => {
  it('parses one email per line', () => {
    const { recipients, errors } = parseRecipientList('a@x.be\nb@x.be\n')
    expect(errors).toEqual([])
    expect(recipients).toEqual([
      { email: 'a@x.be', name: null },
      { email: 'b@x.be', name: null },
    ])
  })

  it('parses CSV with header email,name', () => {
    const { recipients, errors } = parseRecipientList('email,name\na@x.be,Ann\nb@x.be,Bob')
    expect(errors).toEqual([])
    expect(recipients).toEqual([
      { email: 'a@x.be', name: 'Ann' },
      { email: 'b@x.be', name: 'Bob' },
    ])
  })

  it('flags invalid and duplicate emails', () => {
    const { recipients, errors } = parseRecipientList('not-an-email\na@x.be\na@x.be')
    expect(recipients).toEqual([{ email: 'a@x.be', name: null }])
    expect(errors.length).toBe(2)
  })

  it('returns error on empty list', () => {
    const { recipients, errors } = parseRecipientList('   ')
    expect(recipients).toEqual([])
    expect(errors[0]).toMatch(/Empty/)
  })
})

describe('pairRecipientsAndPdfs', () => {
  const pdf = (n: string) => ({ fileName: n, storagePath: `/tmp/${n}` })

  it('pairs equal counts with no leftovers', () => {
    const result = pairRecipientsAndPdfs(
      [{ email: 'a@x.be' }, { email: 'b@x.be' }],
      [pdf('1.pdf'), pdf('2.pdf')]
    )
    expect(result.pairs).toHaveLength(2)
    expect(result.leftoverEmails).toEqual([])
    expect(result.leftoverPdfNames).toEqual([])
  })

  it('reports leftover PDFs', () => {
    const result = pairRecipientsAndPdfs(
      [{ email: 'a@x.be' }],
      [pdf('1.pdf'), pdf('2.pdf'), pdf('3.pdf')]
    )
    expect(result.pairs).toHaveLength(1)
    expect(result.leftoverPdfNames).toEqual(['2.pdf', '3.pdf'])
  })

  it('reports leftover emails', () => {
    const result = pairRecipientsAndPdfs(
      [{ email: 'a@x.be' }, { email: 'b@x.be' }, { email: 'c@x.be' }],
      [pdf('1.pdf')]
    )
    expect(result.pairs).toHaveLength(1)
    expect(result.leftoverEmails).toEqual(['b@x.be', 'c@x.be'])
  })
})

describe('renderPdfMailTemplate', () => {
  it('replaces placeholders', () => {
    const out = renderPdfMailTemplate('Hi {name} ({email}) — {filename}', {
      name: 'Ann',
      email: 'a@x.be',
      filename: 'bon.pdf',
    })
    expect(out).toBe('Hi Ann (a@x.be) — bon.pdf')
  })

  it('falls back name to email', () => {
    const out = renderPdfMailTemplate('Hi {name}', { email: 'a@x.be', filename: 'x.pdf' })
    expect(out).toBe('Hi a@x.be')
  })
})

describe('isPdfFileName', () => {
  it('accepts pdf extension case-insensitively', () => {
    expect(isPdfFileName('a.PDF')).toBe(true)
    expect(isPdfFileName('a.txt')).toBe(false)
  })
})
