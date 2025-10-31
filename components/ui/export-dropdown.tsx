'use client'

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportCSV}>
          <File className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportXLS}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel (XLS)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

