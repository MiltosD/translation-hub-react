import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appConfig } from '@/config/app.config';
import type { TranslationValue, Translation } from '@/types/translation';

interface AddLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLanguages: string[];
  onSave: (translation: TranslationValue) => void;
  translation: Translation | null;
}

export const AddLanguageDialog = ({
  open,
  onOpenChange,
  existingLanguages,
  onSave,
  translation,
}: AddLanguageDialogProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [value, setValue] = useState('');

  const availableLanguages = useMemo(() => {
    return appConfig.languages.filter(
      (lang) => !existingLanguages.includes(lang.code)
    );
  }, [existingLanguages]);

  const handleClear = () => {
    setValue('');
  };

  const handleCancel = () => {
    setSelectedLanguage('');
    setValue('');
    onOpenChange(false);
  };

  const handleSave = () => {
    if (selectedLanguage && value.trim()) {
      onSave({ language: selectedLanguage, value: value.trim() });
      setSelectedLanguage('');
      setValue('');
      onOpenChange(false);
    }
  };

  const isDisabled = availableLanguages.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Add Language Translation {translation && `(ID: ${translation.id})`}
          </DialogTitle>
          {translation && (
            <div className="text-sm text-muted-foreground mt-2">
              <div className="font-medium">Source Text:</div>
              <div className="mt-1 p-2 bg-muted rounded text-sm whitespace-pre-wrap">
                {translation.text}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
              disabled={isDisabled}
            >
              <SelectTrigger id="language">
                <SelectValue
                  placeholder={
                    isDisabled ? 'All languages added' : 'Select language'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="translation">Translation</Label>
            <Textarea
              id="translation"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter translated text..."
              className="min-h-[150px] max-h-[300px] resize-none scrollbar-thin"
              disabled={!selectedLanguage}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClear} disabled={!value}>
            Clear
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedLanguage || !value.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
