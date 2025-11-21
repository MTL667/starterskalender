'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Image, Type, Mail, Phone, Globe, MapPin, 
  Facebook, Linkedin, Instagram, Twitter, Youtube,
  Palette, Eye, Code, Plus, Trash2, MoveUp, MoveDown
} from 'lucide-react'

interface SignatureComponent {
  id: string
  type: 'logo' | 'name' | 'jobTitle' | 'company' | 'email' | 'phone' | 'mobile' | 'website' | 'address' | 'fax' | 'social'
  enabled: boolean
  value?: string // For fixed values like company name, website
  placeholder?: string // For dynamic fields
  style?: {
    fontSize?: string
    fontWeight?: string
    color?: string
  }
}

interface SocialLink {
  platform: 'facebook' | 'linkedin' | 'instagram' | 'twitter' | 'youtube'
  url: string
  enabled: boolean
}

interface BuilderConfig {
  layout: 'side' | 'top' | 'bottom'
  logoUrl: string
  logoWidth: string
  accentColor: string
  fontFamily: string
  components: SignatureComponent[]
  socialLinks: SocialLink[]
}

interface SignatureBuilderProps {
  initialConfig?: Partial<BuilderConfig>
  onChange: (html: string, config: BuilderConfig) => void
}

const defaultConfig: BuilderConfig = {
  layout: 'side',
  logoUrl: 'https://signatures.spoq.digital/uploads/62/199/logo-148.png',
  logoWidth: '150',
  accentColor: '#0084ba',
  fontFamily: 'Helvetica, sans-serif',
  components: [
    { id: '1', type: 'name', enabled: true, placeholder: '{NAME}', style: { fontSize: '24px', fontWeight: '700', color: '#0084ba' } },
    { id: '2', type: 'jobTitle', enabled: true, placeholder: '{JOB_TITLE}', style: { fontSize: '16px', fontWeight: 'normal', color: '#0084ba' } },
    { id: '3', type: 'company', enabled: true, value: 'Bedrijfsnaam', style: { fontSize: '12px', fontWeight: 'bold', color: '#0084ba' } },
    { id: '4', type: 'email', enabled: true, placeholder: '{EMAIL}', style: { fontSize: '12px', color: '#0084ba' } },
    { id: '5', type: 'mobile', enabled: true, placeholder: '{PHONE}', style: { fontSize: '12px', color: '#0084ba' } },
    { id: '6', type: 'phone', enabled: false, value: '+32(0)12 34 56 78', style: { fontSize: '12px', color: '#0084ba' } },
    { id: '7', type: 'website', enabled: false, value: 'www.bedrijf.be', style: { fontSize: '12px', color: '#0084ba' } },
    { id: '8', type: 'address', enabled: false, value: 'Straat 1, 1000 Brussel', style: { fontSize: '12px', color: '#0084ba' } },
  ],
  socialLinks: [
    { platform: 'facebook', url: '', enabled: false },
    { platform: 'linkedin', url: '', enabled: false },
    { platform: 'instagram', url: '', enabled: false },
    { platform: 'twitter', url: '', enabled: false },
    { platform: 'youtube', url: '', enabled: false },
  ],
}

const componentIcons: Record<SignatureComponent['type'], any> = {
  logo: Image,
  name: Type,
  jobTitle: Type,
  company: Type,
  email: Mail,
  phone: Phone,
  mobile: Phone,
  website: Globe,
  address: MapPin,
  fax: Phone,
  social: Facebook,
}

const componentLabels: Record<SignatureComponent['type'], string> = {
  logo: 'Logo',
  name: 'Naam (dynamisch)',
  jobTitle: 'Functie (dynamisch)',
  company: 'Bedrijfsnaam',
  email: 'Email (dynamisch)',
  phone: 'Telefoon vast',
  mobile: 'Mobiel (dynamisch)',
  website: 'Website',
  address: 'Adres',
  fax: 'Fax',
  social: 'Social Media',
}

const socialIcons = {
  facebook: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
}

export function SignatureBuilder({ initialConfig, onChange }: SignatureBuilderProps) {
  const [config, setConfig] = useState<BuilderConfig>({
    ...defaultConfig,
    ...initialConfig,
  })
  const [previewMode, setPreviewMode] = useState<'visual' | 'code'>('visual')

  useEffect(() => {
    const html = generateHTML(config)
    onChange(html, config)
  }, [config])

  const generateHTML = (cfg: BuilderConfig): string => {
    const { layout, logoUrl, logoWidth, components, socialLinks } = cfg

    const logoHTML = `
      <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
        <tr><td></td></tr>
        <tr>
          <td>
            <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
              <tr>
                <td style='padding: 0;'>
                  <p style='margin: 1px;'>
                    <img src='${logoUrl}' alt='Logo' title='Logo' style='display: block; border: 0px; width: ${logoWidth}px;'>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`

    const contactComponents = components.filter(c => c.enabled)
    
    const contactHTML = contactComponents.map(comp => {
      const icon = getIconUrl(comp.type)
      const displayValue = comp.placeholder || comp.value || ''
      const isLink = ['email', 'phone', 'mobile', 'website', 'address'].includes(comp.type)
      
      let href = ''
      if (comp.type === 'email') href = `mailto:${displayValue}`
      else if (comp.type === 'phone' || comp.type === 'mobile') href = `tel:${displayValue}`
      else if (comp.type === 'website') href = `http://${displayValue}`
      else if (comp.type === 'address') href = `https://www.google.com/maps/search/${encodeURIComponent(displayValue)}`

      if (['name', 'jobTitle', 'company'].includes(comp.type)) {
        return `
          <p style='font-family: ${cfg.fontFamily}; font-size: ${comp.style?.fontSize}; line-height: 1.44; font-weight: ${comp.style?.fontWeight}; color: ${comp.style?.color}; white-space: normal; margin: 1px;'>
            ${displayValue}
          </p>`
      }

      return `
        <tr>
          ${icon ? `
            <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
              <p style='margin: 1px;'>
                <span style='font-family: ${cfg.fontFamily}; font-size: 12px; line-height:1.2; white-space: nowrap; color: ${comp.style?.color};'>
                  <img style='height:15px;' src='${icon}' height='15'>
                </span>
              </p>
            </td>
          ` : ''}
          <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'>
            <p style='margin: 1px;'>
              ${isLink ? `<a href='${href}' target='_blank' style='font-family: ${cfg.fontFamily}; font-size: ${comp.style?.fontSize}; line-height: 1.2; white-space: nowrap; color: ${comp.style?.color}; text-decoration: none !important;'>` : ''}
              ${displayValue}
              ${isLink ? '</a>' : ''}
            </p>
          </td>
          <td width='4' style='padding: 0px 0px 1px;'></td>
        </tr>`
    }).join('\n')

    const enabledSocial = socialLinks.filter(s => s.enabled && s.url)
    const socialHTML = enabledSocial.length > 0 ? `
      <tr>
        <td style='padding: 10px 1px 10px 0px;'>
          <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
            <tr>
              ${enabledSocial.map(social => `
                <td style='padding:0px 10px 0px 0px;'>
                  <a href='${social.url}' target='_blank'>
                    <img src='${getSocialIconUrl(social.platform)}' style='height:22px' height='22'>
                  </a>
                </td>
              `).join('\n')}
            </tr>
          </table>
        </td>
      </tr>` : ''

    const textComponents = components.filter(c => c.enabled && ['name', 'jobTitle', 'company'].includes(c.type))
    const textHTML = textComponents.map(comp => {
      const displayValue = comp.placeholder || comp.value || ''
      return `
        <p style='font-family: ${cfg.fontFamily}; font-size: ${comp.style?.fontSize}; line-height: 1.44; font-weight: ${comp.style?.fontWeight}; color: ${comp.style?.color}; white-space: normal; margin: 1px;'>
          ${displayValue}
        </p>`
    }).join('\n')

    const contactOnlyComponents = components.filter(c => c.enabled && !['name', 'jobTitle', 'company'].includes(c.type))
    const contactOnlyHTML = contactOnlyComponents.length > 0 ? `
      <tr>
        <td style='padding: 10px 1px 10px 0px;'>
          <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
            ${contactOnlyComponents.map(comp => {
              const icon = getIconUrl(comp.type)
              const displayValue = comp.placeholder || comp.value || ''
              const isLink = ['email', 'phone', 'mobile', 'website', 'address'].includes(comp.type)
              
              let href = ''
              if (comp.type === 'email') href = `mailto:${displayValue}`
              else if (comp.type === 'phone' || comp.type === 'mobile') href = `tel:${displayValue.replace(/\s/g, '')}`
              else if (comp.type === 'website') href = `http://${displayValue}`
              else if (comp.type === 'address') href = `https://www.google.com/maps/search/${encodeURIComponent(displayValue)}`

              return `
                <tr>
                  <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                    <p style='margin: 1px;'>
                      <span style='font-family: ${cfg.fontFamily}; font-size: 12px; line-height:1.2; white-space: nowrap; color: ${comp.style?.color};'>
                        <img style='height:15px;' src='${icon}' height='15'>
                      </span>
                    </p>
                  </td>
                  <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'>
                    <p style='margin: 1px;'>
                      ${isLink ? `<a href='${href}' target='_blank' style='font-family: ${cfg.fontFamily}; font-size: ${comp.style?.fontSize}; line-height: 1.2; white-space: nowrap; color: ${comp.style?.color}; text-decoration: none !important;'>` : '<span style=\'font-family: ' + cfg.fontFamily + '; font-size: ' + comp.style?.fontSize + '; line-height: 1.2; white-space: nowrap; color: ' + comp.style?.color + ';\'>'}
                        ${displayValue}
                      ${isLink ? '</a>' : '</span>'}
                    </p>
                  </td>
                  <td width='4' style='padding: 0px 0px 1px;'></td>
                </tr>`
            }).join('\n')}
          </table>
        </td>
      </tr>` : ''

    if (layout === 'side') {
      return `<table cellpadding='0' cellspacing='0' border='0' class='sh-src' style='margin: 0px; border-collapse: collapse; width: 600px;' width='600'>
  <tr>
    <td style='padding: 0px 1px 0px 0px;'>
      <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
        <tr>
          <td align='center' style='padding:0; vertical-align: top; width: ${parseInt(logoWidth) + 20}px' width='${parseInt(logoWidth) + 20}'>
            ${logoHTML}
          </td>
          <td width='15' style='width:30px;'></td>
          <td style='padding: 0; vertical-align: top; width:${580 - parseInt(logoWidth)}px' width='${580 - parseInt(logoWidth)}'>
            <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
              <tr>
                <td style='padding: 10px 1px 10px 0px; white-space: nowrap;'>
                  ${textHTML}
                </td>
              </tr>
              <tr></tr>
              ${contactOnlyHTML}
              <tr></tr>
              ${socialHTML}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
    }

    // Top layout
    return `<table cellpadding='0' cellspacing='0' border='0' class='sh-src' style='margin: 0px; border-collapse: collapse; width: 600px;' width='600'>
  <tr>
    <td style='padding: 0px 1px 0px 0px;'>
      <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse; width: 100%;'>
        <tr>
          <td align='center' style='padding: 10px 0;'>
            ${logoHTML}
          </td>
        </tr>
        <tr>
          <td style='padding: 10px 1px 10px 0px;'>
            ${textHTML}
          </td>
        </tr>
        ${contactOnlyHTML}
        ${socialHTML}
      </table>
    </td>
  </tr>
</table>`
  }

  const getIconUrl = (type: string): string => {
    const iconMap: Record<string, string> = {
      email: 'https://signatures.spoq.digital/uploads/62/199/email.png',
      mobile: 'https://signatures.spoq.digital/uploads/62/199/mobile.png',
      phone: 'https://signatures.spoq.digital/uploads/62/199/phone.png',
      website: 'https://signatures.spoq.digital/uploads/62/199/website.png',
      address: 'https://signatures.spoq.digital/uploads/62/199/address.png',
      fax: 'https://signatures.spoq.digital/uploads/62/199/fax.png',
    }
    return iconMap[type] || ''
  }

  const getSocialIconUrl = (platform: string): string => {
    const iconMap: Record<string, string> = {
      facebook: 'https://signatures.spoq.digital/uploads/62/199/facebook.png',
      linkedin: 'https://signatures.spoq.digital/uploads/62/199/linkedin.png',
      instagram: 'https://signatures.spoq.digital/uploads/62/199/instagram.png',
      twitter: 'https://cdn-icons-png.flaticon.com/512/733/733579.png',
      youtube: 'https://cdn-icons-png.flaticon.com/512/174/174883.png',
    }
    return iconMap[platform] || ''
  }

  const updateComponent = (id: string, updates: Partial<SignatureComponent>) => {
    setConfig(prev => ({
      ...prev,
      components: prev.components.map(c => c.id === id ? { ...c, ...updates } : c)
    }))
  }

  const moveComponent = (id: string, direction: 'up' | 'down') => {
    setConfig(prev => {
      const components = [...prev.components]
      const index = components.findIndex(c => c.id === id)
      if (direction === 'up' && index > 0) {
        [components[index], components[index - 1]] = [components[index - 1], components[index]]
      } else if (direction === 'down' && index < components.length - 1) {
        [components[index], components[index + 1]] = [components[index + 1], components[index]]
      }
      return { ...prev, components }
    })
  }

  const updateSocial = (platform: string, updates: Partial<SocialLink>) => {
    setConfig(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map(s => s.platform === platform ? { ...s, ...updates } : s)
    }))
  }

  const previewHTML = generateHTML(config)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Builder */}
      <div className="space-y-6">
        <Card className="p-6">
          <Tabs defaultValue="layout">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="components">Componenten</TabsTrigger>
              <TabsTrigger value="style">Stijl</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
            </TabsList>

            <TabsContent value="layout" className="space-y-4 mt-4">
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={config.logoUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Logo Breedte (px)</Label>
                <Input
                  type="number"
                  value={config.logoWidth}
                  onChange={(e) => setConfig(prev => ({ ...prev, logoWidth: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Layout</Label>
                <Select value={config.layout} onValueChange={(value: any) => setConfig(prev => ({ ...prev, layout: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="side">Logo Links</SelectItem>
                    <SelectItem value="top">Logo Boven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="components" className="space-y-3 mt-4 max-h-[500px] overflow-y-auto">
              {config.components.map((comp, index) => {
                const Icon = componentIcons[comp.type]
                return (
                  <Card key={comp.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={comp.enabled}
                        onCheckedChange={(checked) => updateComponent(comp.id, { enabled: checked as boolean })}
                      />
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-sm">{componentLabels[comp.type]}</div>
                        {comp.enabled && !comp.placeholder && (
                          <Input
                            value={comp.value || ''}
                            onChange={(e) => updateComponent(comp.id, { value: e.target.value })}
                            placeholder="Waarde..."
                            className="h-8 text-sm"
                          />
                        )}
                        {comp.enabled && comp.placeholder && (
                          <div className="text-xs text-muted-foreground">
                            Dynamisch: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{comp.placeholder}</code>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveComponent(comp.id, 'up')}
                          disabled={index === 0}
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveComponent(comp.id, 'down')}
                          disabled={index === config.components.length - 1}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="style" className="space-y-4 mt-4">
              <div>
                <Label>Accent Kleur</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-20"
                  />
                  <Input
                    value={config.accentColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                    placeholder="#0084ba"
                  />
                </div>
              </div>
              <div>
                <Label>Font Familie</Label>
                <Select value={config.fontFamily} onValueChange={(value) => setConfig(prev => ({ ...prev, fontFamily: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                    <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-3 mt-4">
              {config.socialLinks.map(social => {
                const Icon = socialIcons[social.platform]
                return (
                  <Card key={social.platform} className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={social.enabled}
                        onCheckedChange={(checked) => updateSocial(social.platform, { enabled: checked as boolean })}
                      />
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-sm capitalize">{social.platform}</div>
                        {social.enabled && (
                          <Input
                            value={social.url}
                            onChange={(e) => updateSocial(social.platform, { url: e.target.value })}
                            placeholder={`https://${social.platform}.com/...`}
                            className="h-8 text-sm"
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Preview */}
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Preview</h3>
            <div className="flex gap-2">
              <Button
                variant={previewMode === 'visual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('visual')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Visueel
              </Button>
              <Button
                variant={previewMode === 'code' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('code')}
              >
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
            </div>
          </div>

          {previewMode === 'visual' ? (
            <div className="border rounded-lg p-6 bg-white overflow-x-auto min-h-[300px]">
              <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {previewHTML}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

