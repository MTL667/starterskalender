import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

export const alt = 'Open positions'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({
  params,
}: {
  params: { entityGroup: string }
}) {
  const siteGroup = await prisma.siteGroup.findUnique({
    where: { slug: params.entityGroup },
    select: { name: true, entities: { select: { colorHex: true }, take: 1 } },
  })

  const orgName = siteGroup?.name ?? 'Jobs'
  const brandColor = siteGroup?.entities[0]?.colorHex ?? '#2563eb'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${brandColor} 0%, #1e293b 100%)`,
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {orgName}
          </div>
          <div
            style={{
              fontSize: 36,
              color: 'rgba(255,255,255,0.85)',
              textAlign: 'center',
            }}
          >
            Bekijk onze openstaande vacatures
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
