'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function OnboardingPage() {
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
      // Maak entiteiten aan
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
                  <h3 className="font-semibold">Entiteiten aanmaken</h3>
                  <p className="text-sm text-muted-foreground">
                    Voeg je organisatie-eenheden toe met kleuren en e-mailnotificaties
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Starters toevoegen</h3>
                  <p className="text-sm text-muted-foreground">
                    Begin met het plannen van nieuwe medewerkers
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Gebruikers uitnodigen</h3>
                  <p className="text-sm text-muted-foreground">
                    Nodig collega's uit en beheer hun toegangsrechten
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <Button onClick={() => setStep(2)} className="w-full">
                Start Setup
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
            <CardTitle>Entiteiten Aanmaken</CardTitle>
            <CardDescription>
              Voeg je organisatie-eenheden toe. Je kunt later meer toevoegen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {entities.map((entity, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Entiteit {index + 1}</h4>
                
                <div>
                  <Label htmlFor={`name-${index}`}>Naam *</Label>
                  <Input
                    id={`name-${index}`}
                    value={entity.name}
                    onChange={(e) => handleEntityChange(index, 'name', e.target.value)}
                    placeholder="Bv. HR, IT, Sales"
                  />
                </div>

                <div>
                  <Label htmlFor={`color-${index}`}>Kleur</Label>
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
                  <Label htmlFor={`emails-${index}`}>E-mailadressen voor reminders</Label>
                  <Input
                    id={`emails-${index}`}
                    value={entity.notifyEmails}
                    onChange={(e) => handleEntityChange(index, 'notifyEmails', e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ontvang automatisch een e-mail 7 dagen voor de startdatum
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
              + Nog een entiteit toevoegen
            </Button>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Terug
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !entities.some(e => e.name)}
                className="flex-1"
              >
                {loading ? 'Bezig...' : 'Entiteiten Aanmaken'}
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
                <CardTitle>Setup Voltooid!</CardTitle>
                <CardDescription>
                  Je Starterskalender is klaar voor gebruik
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Volgende stappen:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Ga naar de kalender en voeg je eerste starters toe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Pas indien nodig je entiteiten aan in de admin sectie</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Nodig collega's uit om samen te werken</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Configureer dropdown opties (regio, via, etc.)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1">💡 Tip</h4>
                <p className="text-sm text-blue-800">
                  E-mail reminders worden automatisch verstuurd 7 dagen voor de startdatum.
                  Zorg dat je SendGrid correct hebt geconfigureerd in de environment variabelen.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => router.push('/dashboard')} className="flex-1">
                Naar Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/kalender')}
                className="flex-1"
              >
                Naar Kalender
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

