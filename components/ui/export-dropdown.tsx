'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react'

interface ExportDropdownProps {
  onExportCSV: () => void
  onExportPDF: () => void
  onExportXLS: () => void
}

export function ExportDropdown({ onExportCSV, onExportPDF, onExportXLS }: ExportDropdownProps) {
  const t = useTranslations('export')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {t('button')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportCSV}>
          <File className="h-4 w-4 mr-2" />
          {t('csv')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          {t('pdf')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportXLS}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t('excel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

