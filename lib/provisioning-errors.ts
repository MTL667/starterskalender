/** Graph UPN/domain errors that warrant alternate-tenant recovery. */
export function isUpnDomainError(error: string | null | undefined): boolean {
  if (!error) return false
  const msg = error.toLowerCase()
  return (
    msg.includes('userprincipalname') &&
    (msg.includes('invalid') || msg.includes('verified domain') || msg.includes('domain portion'))
  )
}
