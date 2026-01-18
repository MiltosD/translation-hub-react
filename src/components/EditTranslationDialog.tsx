import { useState, useEffect, useMemo } from 'react';
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

interface EditTranslationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translations: TranslationValue[];
  onSave: (translations: TranslationValue[]) => void;
  translation: Translation | null;
}

export const EditTranslationDialog = ({
  open,
  onOpenChange,
  translations,
  onSave,
  translation,
}: EditTranslationDialogProps) => {
  const [editedTranslations, setEditedTranslations] = useState<TranslationValue[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  useEffect(() => {
    if (open) {
      setEditedTranslations([...translations]);
      setSelectedLanguage(translations[0]?.language || '');
    }
  }, [open, translations]);

  const currentTranslation = useMemo(() => {
    return editedTranslations.find((t) => t.language === selectedLanguage);
  }, [editedTranslations, selectedLanguage]);

  const handleValueChange = (value: string) => {
    setEditedTranslations((prev) =>
      prev.map((t) =>
        t.language === selectedLanguage ? { ...t, value } : t
      )
    );
  };

  const handleClear = () => {
    handleValueChange('');
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSave = () => {
    onSave(editedTranslations);
    onOpenChange(false);
  };

  const getLanguageName = (code: string) => {
    return appConfig.languages.find((l) => l.code === code)?.name || code;
  };

  if (translations.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Edit Translation {translation && `(ID: ${translation.id})`}
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
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language to edit" />
              </SelectTrigger>
              <SelectContent>
                {editedTranslations.map((t) => (
                  <SelectItem key={t.language} value={t.language}>
                    {getLanguageName(t.language)} ({t.language.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="translation">Translation</Label>
            <Textarea
              id="translation"
              value={currentTranslation?.value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter translated text..."
              className="min-h-[150px] max-h-[300px] resize-none scrollbar-thin"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
