import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, BadgeCheck, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { appConfig } from '@/config/app.config';
import { api } from '@/services/api';
import type { TranslationValue, Translation } from '@/types/translation';

interface EditTranslationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translations: TranslationValue[];
  onSave: (
    translations: TranslationValue[],
    newSourceText?: string,
    forceSaveLanguages?: string[],
    newMessageFieldName?: string
  ) => Promise<void>;
  translation: Translation | null;
}

export const EditTranslationDialog = ({
  open,
  onOpenChange,
  translations,
  onSave,
  translation,
}: EditTranslationDialogProps) => {
  const IGNORED_LANGUAGE_CODE = 'en';
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [editedTranslations, setEditedTranslations] = useState<TranslationValue[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [sourceText, setSourceText] = useState<string>('');
  const [originalSourceText, setOriginalSourceText] = useState<string>('');
  const [isEditingSource, setIsEditingSource] = useState<boolean>(false);
  const [messageFieldName, setMessageFieldName] = useState<string>('');
  const [originalMessageFieldName, setOriginalMessageFieldName] = useState<string>('');
  const [isEditingMessageField, setIsEditingMessageField] = useState<boolean>(false);
  const [originalTranslations, setOriginalTranslations] = useState<TranslationValue[]>([]);
  const [acceptedTranslations, setAcceptedTranslations] = useState<Set<string>>(new Set());
  const [showTranslateConfirm, setShowTranslateConfirm] = useState<boolean>(false);

  const visibleTranslations = useMemo(
    () => editedTranslations.filter(
      (t) =>
        t.language !== IGNORED_LANGUAGE_CODE &&
        appConfig.languages.some((lang) => lang.code === t.language)
    ),
    [editedTranslations]
  );

  useEffect(() => {
    if (open) {
      setEditedTranslations([...translations]);
      setOriginalTranslations([...translations]);
      const firstVisibleLanguage = translations.find((t) => t.language !== IGNORED_LANGUAGE_CODE)?.language || '';
      setSelectedLanguage(firstVisibleLanguage);
      setSourceText(translation?.text || '');
      setOriginalSourceText(translation?.text || '');
      setIsEditingSource(false);
      const initialMessageFieldName = translation?.message_field_name || '';
      setMessageFieldName(initialMessageFieldName);
      setOriginalMessageFieldName(initialMessageFieldName);
      setIsEditingMessageField(false);
      setAcceptedTranslations(new Set());
    }
  }, [open]);

  // Update state when data refetches while dialog is open
  useEffect(() => {
    if (open && translations.length > 0) {
      // Update translations data from backend
      setEditedTranslations([...translations]);
      setOriginalTranslations([...translations]);

      // Update source text if changed
      if (translation?.text) {
        setSourceText(translation.text);
      }

      if (translation) {
        const latestMessageFieldName = translation.message_field_name || '';
        setMessageFieldName(latestMessageFieldName);
        setOriginalMessageFieldName(latestMessageFieldName);
      }

      // Ensure selected language is still valid
      const isSelectedLanguageValid = translations.some(
        (t) => t.language === selectedLanguage && t.language !== IGNORED_LANGUAGE_CODE
      );
      if (!isSelectedLanguageValid) {
        const firstVisibleLanguage = translations.find((t) => t.language !== IGNORED_LANGUAGE_CODE)?.language || '';
        setSelectedLanguage(firstVisibleLanguage);
      }

      // Clear modified/accepted state since we have fresh data
      setAcceptedTranslations(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(translations), JSON.stringify(translation)]);

  const currentTranslation = useMemo(() => {
    return visibleTranslations.find((t) => t.language === selectedLanguage);
  }, [visibleTranslations, selectedLanguage]);

  const handleValueChange = (value: string) => {
    setEditedTranslations((prev) =>
      prev.map((t) =>
        t.language === selectedLanguage ? { ...t, value } : t
      )
    );
    // Remove from accepted translations when user edits
    setAcceptedTranslations(prev => {
      const newSet = new Set(prev);
      newSet.delete(selectedLanguage);
      return newSet;
    });
  };

  const handleClear = () => {
    handleValueChange('');
  };

  const handleAcceptChange = (checked: boolean) => {
    if (checked) {
      setAcceptedTranslations(prev => new Set(prev).add(selectedLanguage));
    } else {
      setAcceptedTranslations(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedLanguage);
        return newSet;
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSave = async () => {
    try {
      // Always save with the current value
      const finalTranslations = editedTranslations.map(t => {
        if (t.language === selectedLanguage) {
          return { ...t };
        }
        return t;
      });

      // If checkbox is checked but value hasn't changed, force save this language
      const forceSaveLanguages = acceptedTranslations.has(selectedLanguage) ? [selectedLanguage] : [];
      const newMessageFieldName =
        translation?.bucket === 'MESSAGES' && messageFieldName !== originalMessageFieldName
          ? messageFieldName
          : undefined;

      await onSave(
        finalTranslations,
        sourceText !== translation?.text ? sourceText : undefined,
        forceSaveLanguages,
        newMessageFieldName
      );
      toast({
        title: "Success",
        description: "Translation updated successfully",
      });
      // Don't manually update state here - let the refetch from backend handle it
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update translation",
        variant: "destructive",
      });
    }
  };

  const isSaveDisabled = () => {
    // Check if value actually changed from original
    const originalTranslation = originalTranslations.find(t => t.language === selectedLanguage);
    const hasValueChanged = currentTranslation?.value !== originalTranslation?.value;
    const hasMessageFieldChanged =
      translation?.bucket === 'MESSAGES' && messageFieldName !== originalMessageFieldName;

    return !hasValueChanged && !acceptedTranslations.has(selectedLanguage) && !hasMessageFieldChanged;
  };

  const hasValueChanged = () => {
    const originalTranslation = originalTranslations.find(t => t.language === selectedLanguage);
    return currentTranslation?.value !== originalTranslation?.value;
  };

  const getLanguageName = (code: string) => {
    return appConfig.languages.find((l) => l.code === code)?.name || code;
  };

  const hasSourceChanged = () => {
    return sourceText !== originalSourceText;
  };

  const hasMessageFieldNameChanged = () => {
    return messageFieldName !== originalMessageFieldName;
  };

  const hasCuratedTranslations = () => {
    return editedTranslations.some(t => !t.auto && t.language !== 'en');
  };

  const handleTranslateClick = () => {
    if (hasCuratedTranslations()) {
      setShowTranslateConfirm(true);
    } else {
      handleTranslate(false);
    }
  };

  const handleTranslate = async (backup: boolean) => {
    try {
      if (!translation) return;

      if (backup) {
        // Save backup JSON file
        const backupData = {
          id: translation.id,
          text: translation.text,
          translations: translation.translations,
          timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation-${translation.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // First, save the source text (first API request)
      const newMessageFieldName =
        translation?.bucket === 'MESSAGES' && messageFieldName !== originalMessageFieldName
          ? messageFieldName
          : undefined;

      await onSave(editedTranslations, sourceText, undefined, newMessageFieldName);

      // Then, call translate endpoint (second API request)
      await api.adminTranslate([sourceText]);

      toast({
        title: "Success",
        description: "Source text saved and translation initiated successfully",
      });
      setShowTranslateConfirm(false);
      setOriginalSourceText(sourceText);
      if (newMessageFieldName !== undefined) {
        setOriginalMessageFieldName(messageFieldName);
        setIsEditingMessageField(false);
      }
      setIsEditingSource(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to translate",
        variant: "destructive",
      });
    }
  };

  if (translations.length === 0) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Edit Translation {translation && `(ID: ${translation.id})`}
            </DialogTitle>
            {translation && (
              <div className="text-sm text-muted-foreground mt-2">
                <div className="font-medium">
                  Source Text{isAdmin && ' (double-click to edit)'}:
                </div>
                {isAdmin && isEditingSource ? (
                  <>
                    <Textarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      autoFocus
                      className="mt-1 min-h-[100px] resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleTranslateClick();
                        }}
                        disabled={!hasSourceChanged()}
                      >
                        Translate
                      </Button>
                    </div>
                  </>
                ) : (
                  <div
                    className="mt-1 p-2 bg-muted rounded text-sm whitespace-pre-wrap cursor-text"
                    onDoubleClick={() => isAdmin && setIsEditingSource(true)}
                  >
                    {sourceText}
                  </div>
                )}

                {translation.bucket === 'MESSAGES' && (
                  <div className="mt-3">
                    <div className="font-medium">
                      Message Field Name{isAdmin && ' (double-click to edit)'}:
                    </div>
                    {isAdmin && isEditingMessageField ? (
                      <Input
                        value={messageFieldName}
                        onChange={(e) => setMessageFieldName(e.target.value)}
                        autoFocus
                        className="mt-1"
                      />
                    ) : (
                      <div
                        className="mt-1 p-2 bg-muted rounded text-sm whitespace-pre-wrap cursor-text"
                        onDoubleClick={() => isAdmin && setIsEditingMessageField(true)}
                      >
                        {messageFieldName || '-'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="language">Language</Label>
                {currentTranslation && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {currentTranslation.auto ? (
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        ) : (
                          <BadgeCheck className="h-4 w-4 text-green-500" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{currentTranslation.auto ? 'Automatically translated' : 'Curated'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language to edit" />
                </SelectTrigger>
                <SelectContent>
                  {visibleTranslations
                    .sort((a, b) => getLanguageName(a.language).localeCompare(getLanguageName(b.language)))
                    .map((t) => (
                      <SelectItem key={t.language} value={t.language}>
                        <span className="flex items-center gap-2">
                          {t.auto ? (
                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                          ) : (
                            <BadgeCheck className="h-3.5 w-3.5 text-green-500" />
                          )}
                          <span>
                            {getLanguageName(t.language)} ({t.language.toUpperCase()})
                          </span>
                        </span>
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
              {currentTranslation && (
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="accept-translation"
                    checked={currentTranslation.auto ? acceptedTranslations.has(selectedLanguage) : true}
                    onCheckedChange={currentTranslation.auto && !hasValueChanged() ? handleAcceptChange : undefined}
                    disabled={!currentTranslation.auto || hasValueChanged()}
                  />
                  <Label
                    htmlFor="accept-translation"
                    className="text-sm font-normal cursor-default"
                  >
                    Accept translation
                  </Label>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClear} className="bg-background hover:bg-muted hover:text-foreground">
              Clear
            </Button>
            <Button variant="ghost" onClick={handleCancel} className="hover:bg-muted hover:text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaveDisabled()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showTranslateConfirm} onOpenChange={setShowTranslateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Translations?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will replace all translations, <span style={{ color: 'orange', fontWeight: 'bold' }}>including curated ones.</span>
              Click <strong>"Backup and Translate"</strong> if you want to keep a backup or <strong>"Translate"</strong> to proceed without backup.
              <br />
              <br />
              <span style={{ color: 'orange' }}>Translation in all languages is progressive and may take a while to complete. Some translations may fail,
                depending on the service availability.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleTranslate(false)}>
              Translate
            </Button>
            <AlertDialogAction onClick={() => handleTranslate(true)}>
              Backup and Translate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
