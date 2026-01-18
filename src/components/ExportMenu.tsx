import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileSpreadsheet, FileText, FileCode } from 'lucide-react';
import type { ExportFormat } from '@/types/translation';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  selectedCount?: number;
}

export const ExportMenu = ({ onExport, disabled, selectedCount }: ExportMenuProps) => {
  const formats: { format: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { format: 'json', label: 'JSON', icon: <FileJson className="h-4 w-4 mr-2" /> },
    { format: 'tsv', label: 'TSV', icon: <FileSpreadsheet className="h-4 w-4 mr-2" /> },
    { format: 'xml', label: 'XML', icon: <FileCode className="h-4 w-4 mr-2" /> },
    { format: 'yaml', label: 'YAML', icon: <FileText className="h-4 w-4 mr-2" /> },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          Export {selectedCount ? `(${selectedCount})` : ''}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map(({ format, label, icon }) => (
          <DropdownMenuItem key={format} onClick={() => onExport(format)}>
            {icon}
            Export as {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
