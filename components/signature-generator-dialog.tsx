'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface SignatureGeneratorDialogProps {
  open: boolean
  onClose: () => void
  starterData: {
    name: string
    roleTitle: string
    phoneNumber: string
    desiredEmail: string
  }
}

export function SignatureGeneratorDialog({ open, onClose, starterData }: SignatureGeneratorDialogProps) {
  const [copied, setCopied] = useState(false)

  const generateSignature = () => {
    return `<table cellpadding='0' cellspacing='0' border='0' class='sh-src' style='margin: 0px; border-collapse: collapse; width: 600px;' width='600'>
      <tr>
            <td style='padding: 0px 1px 0px 0px;'>
                  <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
                        <tr>
                              <td align='center' style='padding:0; vertical-align: top; width: 150px' width='150'>
                                    <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
                                          <tr>
                                                <td></td>
                                          </tr>
                                          <tr>
                                                <td>
                                                      <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
                                                            <tr>
                                                                  <td style='padding: 0;'>
                                                                        <p style='margin: 1px;'>
                                                                              <img src='https://signatures.spoq.digital/uploads/62/199/logo-148.png' alt='' title='Logo' style='display: block; border: 0px;'>
                                                                        </p>
                                                                  </td>
                                                            </tr>
                                                      </table>
                                                </td>
                                          </tr>
                                    </table>
                              </td>
                              <td width='15' style='width:30px;'></td>
                              <td style='padding: 0; vertical-align: top; width:420px' width='420'>
                                    <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
                                          <tr>
                                                <td style='padding: 10px 1px 10px 0px; white-space: nowrap;'>
                                                      <p style='font-family: Helvetica, sans-serif; font-size: 24px; line-height: 1.44; font-weight: 700; color: #0084ba; white-space: normal; margin: 1px 1px 1px 1px;'>
                                                            ${starterData.name}
                                                      </p>
                                                      <p style='font-family: Helvetica, sans-serif; font-size: 16px; line-height: 1.44; white-space: normal; color:#0084ba; margin: 1px;'>
                                                            ${starterData.roleTitle}
                                                      </p>
                                                      <p style='font-weight:bold; font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.44; white-space: normal; color:#0084ba; margin: 1px;'>
                                                            Signature Design Lab
                                                      </p>
                                                </td>
                                          </tr>
                                          <tr></tr>
                                          <tr>
                                                <td style='padding: 10px 1px 10px 0px;'>
                                                      <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
                                                            <tr>
                                                                  <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                                                                        <p style='margin: 1px;'>
                                                                              <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height:1.2; white-space: nowrap; color: #0084ba;'>
                                                                                    <img style='height:15px;' src='https://signatures.spoq.digital/uploads/62/199/email.png?cache_bust=1763730354' height='15'>
                                                                              </span>
                                                                        </p>
                                                                  </td>
                                                                  <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'> 
                                                                        <p style='margin: 1px;'>
                                                                              <a href='mailto:${starterData.desiredEmail}' target='_blank' style='font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.2; white-space: nowrap; color: #0084ba; text-decoration: none !important;'>
                                                                                    ${starterData.desiredEmail}
                                                                              </a>
                                                                        </p>
                                                                  </td>
                                                                  <td width='4' style='padding: 0px 0px 1px;'></td>
                                                            </tr>
                                                            <tr>
                                                                  <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                                                                        <p style='margin: 1px;'>
                                                                              <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height:1.2; white-space: nowrap; color: #0084ba;'>
                                                                                    <img style='height:15px;' src='https://signatures.spoq.digital/uploads/62/199/mobile.png?cache_bust=1763730354' height='15'>
                                                                              </span>
                                                                        </p>
                                                                  </td>
                                                                  <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'>
                                                                        <p style='margin: 1px;'>
                                                                              <a href='tel:${starterData.phoneNumber.replace(/\s/g, '')}' target='_blank' style='font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.2; white-space: nowrap; color: #0084ba; text-decoration: none !important;'>
                                                                                    ${starterData.phoneNumber}
                                                                              </a>
                                                                        </p>
                                                                  </td>
                                                                  <td width='4' style='padding: 0px 0px 1px;'></td>
                                                            </tr>
                                                            <tr>
                                                                  <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                                                                        <p style='margin: 1px;'>
                                                                              <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height:1.2; white-space: nowrap; color: #0084ba;'>
                                                                                    <img style='height:15px;' src='https://signatures.spoq.digital/uploads/62/199/phone.png?cache_bust=1763730354' height='15'>
                                                                              </span>
                                                                        </p>
                                                                  </td>
                                                                  <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'>
                                                                        <p style='margin: 1px;'>
                                                                              <a href='tel:+32(0)12 34 56 78' target='_blank' style='font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.2; white-space: nowrap; color: #0084ba; text-decoration: none !important;'>
                                                                                    +32(0)12 34 56 78
                                                                              </a>
                                                                        </p>
                                                                  </td>
                                                                  <td width='4' style='padding: 0px 0px 1px;'></td>
                                                            </tr>
                                                            <tr>
                                                                  <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                                                                        <p style='margin: 1px;'>
                                                                              <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height:1.2; white-space: nowrap; color: #0084ba;'>
                                                                                    <img style='height:15px;' src='https://signatures.spoq.digital/uploads/62/199/website.png?cache_bust=1763730354' height='15'>
                                                                              </span>
                                                                        </p>
                                                                  </td>
                                                                  <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'>
                                                                        <p style='margin: 1px;'>
                                                                              <a href='http://www.aceg.be' target='_blank' style='font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.2; white-space: nowrap; color: #0084ba; text-decoration: none !important;'>
                                                                                    www.aceg.be
                                                                              </a>
                                                                        </p>
                                                                  </td>
                                                                  <td width='4' style='padding: 0px 0px 1px;'></td>
                                                            </tr>
                                                            <tr>
                                                                  <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                                                                        <p style='margin: 1px;'>
                                                                              <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height:1.2; white-space: nowrap; color: #0084ba;'>
                                                                                    <img style='height:15px;' src='https://signatures.spoq.digital/uploads/62/199/address.png?cache_bust=1763730354' height='15'>
                                                                              </span>
                                                                        </p>
                                                                  </td>
                                                                  <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'>
                                                                        <p style='margin: 1px;'>
                                                                              <a href='https://www.google.com/maps/place/Ringlaan+39,+1853+STROMBEEK-BEVER' target='_blank' style='font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.2; white-space: nowrap; color: #0084ba; text-decoration: none !important;'>
                                                                                    Ringlaan 39, 1853 STROMBEEK-BEVER
                                                                              </a>
                                                                        </p>
                                                                  </td>
                                                                  <td width='4' style='padding: 0px 0px 1px;'></td>
                                                            </tr>
                                                            <tr>
                                                                  <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                                                                        <p style='margin: 1px;'>
                                                                              <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height:1.2; white-space: nowrap; color: #0084ba;'>
                                                                                    <img style='height:15px;' src='https://signatures.spoq.digital/uploads/62/199/fax.png?cache_bust=1763730354' height='15'>
                                                                              </span>
                                                                        </p>
                                                                  </td>
                                                                  <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'>
                                                                        <p style='margin: 1px;'>
                                                                              <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.2; white-space: nowrap; color: #0084ba; text-decoration: none !important;'>
                                                                                    +32(0)23 45 67 89
                                                                              </span>
                                                                        </p>
                                                                  </td>
                                                                  <td width='4' style='padding: 0px 0px 1px;'></td>
                                                            </tr>
                                                      </table>
                                                </td> 
                                          </tr>
                                          <tr></tr>
                                          <tr>
                                                <td style='padding: 10px 1px 10px 0px;'>
                                                      <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
                                                            <tr>
                                                                  <td style='padding:0px 10px 0px 0px;'>
                                                                        <a href='https://www.facebook.com/aceg.be/' target='_blank'>
                                                                              <img src='https://signatures.spoq.digital/uploads/62/199/facebook.png' style='heigh:22px' height='22'>
                                                                        </a>
                                                                  </td>
                                                                  <td style='padding:0px 10px 0px 0px;'>
                                                                        <a href='https://www.linkedin.com/company/keuringenaceg' target='_blank'>
                                                                              <img src='https://signatures.spoq.digital/uploads/62/199/linkedin.png' style='height:22px' height='22'>
                                                                        </a>
                                                                  </td>
                                                                  <td style='padding:0px 10px 0px 0px;'>
                                                                        <a href='https://www.instagram.com/aceg.be/' target='_blank'>
                                                                              <img src='https://signatures.spoq.digital/uploads/62/199/instagram.png' style='heigh:22px' height='22'>
                                                                        </a>
                                                                  </td>
                                                            </tr>
                                                      </table>
                                                </td>
                                          </tr>
                                    </table>
                              </td>
                        </tr>
                        <tr>
                              <td colspan='3' align='center' style='vertical-align: top; text-align:left;'>
                              </td>
                        </tr>
                        <tr>
                              <td colspan='3' align='center' style='vertical-align: top; text-align:left;'>
                              </td>
                        </tr>
                  </table>
            </td>
      </tr>
</table>`
  }

  const signature = generateSignature()

  const handleCopySignature = async () => {
    try {
      await navigator.clipboard.writeText(signature)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying signature:', error)
      alert('Kon signature niet kopiëren')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Signature Generator</DialogTitle>
          <DialogDescription>
            Gegenereerde signature voor {starterData.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visual Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground">
                VISUELE PREVIEW:
              </p>
              <Button 
                onClick={handleCopySignature}
                variant="outline"
                size="sm"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Gekopieerd!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopieer HTML
                  </>
                )}
              </Button>
            </div>
            <div className="border rounded-lg p-6 bg-white">
              <div 
                dangerouslySetInnerHTML={{ __html: signature }}
                className="signature-preview"
              />
            </div>
          </div>

          {/* HTML Code */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">
              HTML CODE (voor Outlook):
            </p>
            <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {signature}
              </pre>
            </div>
          </div>

          {/* Instructies */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
              📋 Instructies voor Outlook:
            </p>
            <ol className="text-sm space-y-1 text-blue-800 dark:text-blue-200 list-decimal list-inside">
              <li>Klik op "Kopieer HTML" hierboven</li>
              <li>Open Outlook → Bestand → Opties → E-mail → Handtekeningen</li>
              <li>Maak nieuwe handtekening of bewerk bestaande</li>
              <li>Klik in het tekstvak en druk Ctrl+V (plakken)</li>
              <li>Klik OK om op te slaan</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

