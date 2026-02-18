'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [entities, setEntities] = useState([
    { name: '', colorHex: '#3b82f6', notifyEmails: '' }
  ])

  const handleAddEntity = () => {
    setEntities([...entities, { name: '', colorHex: '#10b981', notifyEmails: '' }])
  }

  const handleEntityChange = (index: number, field: string, value: string) => {
    const newEntities = [...entities]
    newEntities[index] = { ...newEntities[index], [field]: value }
    setEntities(newEntities)
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      for (const entity of entities) {
        if (!entity.name) continue

        const emails = entity.notifyEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e)

        await fetch('/api/entities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: entity.name,
            colorHex: entity.colorHex,
            notifyEmails: emails,
          }),
        })
      }

      setStep(3)
    } catch (error) {
      console.error('Error creating entities:', error)
      alert('Er is een fout opgetreden. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Welkom bij Starterskalender!</CardTitle>
            <CardDescription>
              Laten we je applicatie opzetten in een paar eenvoudige stappen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">{t('createEntities')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('createEntitiesDescription')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">{t('addStarters')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('addStartersDescription')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">{t('inviteUsers')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('inviteUsersDescription')}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <Button onClick={() => setStep(2)} className="w-full">
                {t('startSetup')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>{t('createEntitiesTitle')}</CardTitle>
            <CardDescription>
              {t('createEntitiesStep')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {entities.map((entity, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">{t('entityNumber')} {index + 1}</h4>
                
                <div>
                  <Label htmlFor={`name-${index}`}>{t('nameRequired')}</Label>
                  <Input
                    id={`name-${index}`}
                    value={entity.name}
                    onChange={(e) => handleEntityChange(index, 'name', e.target.value)}
                    placeholder={t('namePlaceholder')}
                  />
                </div>

                <div>
                  <Label htmlFor={`color-${index}`}>{t('color')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`color-${index}`}
                      type="color"
                      value={entity.colorHex}
                      onChange={(e) => handleEntityChange(index, 'colorHex', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={entity.colorHex}
                      onChange={(e) => handleEntityChange(index, 'colorHex', e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`emails-${index}`}>{t('emailsForReminders')}</Label>
                  <Input
                    id={`emails-${index}`}
                    value={entity.notifyEmails}
                    onChange={(e) => handleEntityChange(index, 'notifyEmails', e.target.value)}
                    placeholder={t('emailsPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('emailReminderHint')}
                  </p>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddEntity}
              className="w-full"
            >
              {t('addAnotherEntity')}
            </Button>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                {t('back')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !entities.some(e => e.name)}
                className="flex-1"
              >
                {loading ? t('loading') : t('createEntitiesButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <CardTitle>{t('setupComplete')}</CardTitle>
                <CardDescription>
                  {t('readyToUse')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">{t('nextSteps')}</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>{t('nextStep1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>{t('nextStep2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>{t('nextStep3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>{t('nextStep4')}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1">💡 {t('tip')}</h4>
                <p className="text-sm text-blue-800">
                  {t('tipEmailReminders')}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => router.push('/dashboard')} className="flex-1">
                {t('toDashboard')}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/kalender')}
                className="flex-1"
              >
                {t('toCalendar')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

