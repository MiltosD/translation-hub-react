import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus, Sparkles } from 'lucide-react';
import { appConfig } from '@/config/app.config';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import type { Translation, TranslationValue } from '@/types/translation';

interface AdminCreateRequest {
  text: string;
  translations: Array<{
    language: string;
    value: string;
    auto: boolean;
  }>;
  message_field_name?: string;
  bucket?: string;
  category?: string[];
}

interface NonAdminCreateRequest {
  client: string;
  text: string;
  bucket: string;
  category: string;
}

interface AddNewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: AdminCreateRequest | NonAdminCreateRequest) => Promise<void>;
  isLoading?: boolean;
}

export const AddNewItemDialog = ({
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: AddNewItemDialogProps) => {
  const IGNORED_LANGUAGE_CODE = 'en';
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  const [text, setText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<TranslationValue[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [currentTranslationValue, setCurrentTranslationValue] = useState('');
  const [bucket, setBucket] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [fieldName, setFieldName] = useState('');
  const [showTranslateConfirm, setShowTranslateConfirm] = useState(false);
  const [showReuseTranslationsDialog, setShowReuseTranslationsDialog] = useState(false);
  const [existingMatch, setExistingMatch] = useState<Translation | null>(null);
  const [isCheckingExistingMatch, setIsCheckingExistingMatch] = useState(false);
  const [isReusingExistingTranslations, setIsReusingExistingTranslations] = useState(false);
  const checkedDuplicateTextRef = useRef('');
  const promptedDuplicateTextRef = useRef('');

  const trimmedText = text.trim();
  const debouncedTrimmedText = useDebounce(trimmedText, 400, 1);

  const handleBucketChange = (value: string) => {
    setBucket(value);

    // Category applies only to MESSAGES.
    if (value !== 'MESSAGES') {
      setSelectedCategory([]);
    }
  };

  const availableLanguages = appConfig.languages.filter(
    (lang) =>
      lang.code !== IGNORED_LANGUAGE_CODE &&
      !translations.some((t) => t.language === lang.code)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleAddTranslation = () => {
    if (isReusingExistingTranslations) return;

    if (selectedLanguage && currentTranslationValue.trim()) {
      setTranslations([
        ...translations,
        { language: selectedLanguage, value: currentTranslationValue.trim() },
      ]);
      setSelectedLanguage('');
      setCurrentTranslationValue('');
    }
  };

  const handleRemoveTranslation = (languageCode: string) => {
    if (isReusingExistingTranslations) return;

    setTranslations(translations.filter((t) => t.language !== languageCode));
  };

  const handleClearCurrentTranslation = () => {
    setCurrentTranslationValue('');
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm(); // Reset form when dialog closes
    }
    onOpenChange(newOpen);
  };

  const handleCancel = () => {
    onOpenChange(false); // Form will be reset by handleDialogOpenChange
  };

  const handleSave = () => {
    if (isAdmin) {
      const category =
        bucket === 'DCAT-AP'
          ? ['VOC']
          : bucket === 'MESSAGES' && selectedCategory.length > 0
            ? selectedCategory
            : undefined;

      // Admin user request structure
      const adminRequest: AdminCreateRequest = {
        text: text.trim(),
        translations: translations.map(t => ({
          language: t.language,
          value: t.value,
          auto: t.auto ?? false,
        })).filter((t) => t.language !== IGNORED_LANGUAGE_CODE),
        message_field_name: fieldName.trim() || undefined,
        bucket: bucket || undefined,
        category,
      };
      console.log('Admin request:', adminRequest);
      onSave(adminRequest);
    } else {
      // Non-admin user request structure
      const nonAdminRequest: NonAdminCreateRequest = {
        client: user?.client || 'default',
        text: text.trim(),
        bucket: 'METADATA',
        category: 'CONNECTOR',
      };
      console.log('Non-admin request:', nonAdminRequest);
      onSave(nonAdminRequest);
    }
    // Dialog will be closed and form reset by the parent component on success
  };

  const buildAdminRequest = (): AdminCreateRequest => {
    const category =
      bucket === 'DCAT-AP'
        ? ['VOC']
        : bucket === 'MESSAGES' && selectedCategory.length > 0
          ? selectedCategory
          : undefined;
    return {
      text: text.trim(),
      translations: translations.map(t => ({
        language: t.language,
        value: t.value,
        auto: t.auto ?? false,
      })).filter((t) => t.language !== IGNORED_LANGUAGE_CODE),
      message_field_name: fieldName.trim() || undefined,
      bucket: bucket || undefined,
      category,
    };
  };

  const handleTranslate = async () => {
    if (!trimmedText) return;
    setShowTranslateConfirm(false);
    setIsTranslating(true);
    try {
      await onSave(buildAdminRequest());
      await api.adminTranslate([trimmedText]);
      toast({
        title: 'Success',
        description: 'Item saved and translation initiated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save or initiate translation',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const resetForm = () => {
    setText('');
    setTranslations([]);
    setSelectedLanguage('');
    setCurrentTranslationValue('');
    setBucket('');
    setSelectedCategory([]);
    setFieldName('');
    setIsTranslating(false);
    setShowTranslateConfirm(false);
    setShowReuseTranslationsDialog(false);
    setExistingMatch(null);
    setIsCheckingExistingMatch(false);
    setIsReusingExistingTranslations(false);
    checkedDuplicateTextRef.current = '';
    promptedDuplicateTextRef.current = '';
  };

  const handleTranslateClick = () => {
    if (!isTranslateEnabled) return;
    setShowTranslateConfirm(true);
  };

  const getLanguageName = (code: string) => {
    return appConfig.languages.find((l) => l.code === code)?.name || code;
  };

  const meetsTranslatePrerequisites =
    isAdmin &&
    !!trimmedText &&
    !isTranslating &&
    (bucket === 'DCAT-AP' ||
      (bucket === 'MESSAGES' && selectedCategory.length > 0 && !!fieldName.trim()));

  useEffect(() => {
    if (!open || !isAdmin || isReusingExistingTranslations) {
      return;
    }

    if (!debouncedTrimmedText) {
      setIsCheckingExistingMatch(false);
      setExistingMatch(null);
      setShowReuseTranslationsDialog(false);
      checkedDuplicateTextRef.current = '';
      promptedDuplicateTextRef.current = '';
      return;
    }

    if (debouncedTrimmedText === checkedDuplicateTextRef.current) {
      return;
    }

    checkedDuplicateTextRef.current = debouncedTrimmedText;

    let isCancelled = false;

    const checkForExistingTranslation = async () => {
      setIsCheckingExistingMatch(true);

      try {
        const response = await api.getTranslations({
          search: debouncedTrimmedText,
          exactMatch: true,
        });

        if (isCancelled) {
          return;
        }

        const match = response.total > 0 ? (response.data[0] ?? null) : null;

        setExistingMatch(match);

        if (match) {
          if (promptedDuplicateTextRef.current !== debouncedTrimmedText) {
            promptedDuplicateTextRef.current = debouncedTrimmedText;
            setShowReuseTranslationsDialog(true);
          }
        } else {
          promptedDuplicateTextRef.current = '';
          setShowReuseTranslationsDialog(false);
        }
      } catch {
        if (!isCancelled) {
          setExistingMatch(null);
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingExistingMatch(false);
        }
      }
    };

    checkForExistingTranslation();

    return () => {
      isCancelled = true;
    };
  }, [debouncedTrimmedText, isAdmin, isReusingExistingTranslations, open]);

  const handleReuseExistingTranslations = () => {
    if (!existingMatch) {
      setShowReuseTranslationsDialog(false);
      return;
    }

    setTranslations(
      existingMatch.translations
        .filter((translation) => translation.language !== IGNORED_LANGUAGE_CODE)
        .map((translation) => ({
          language: translation.language,
          value: translation.value,
          auto: translation.auto,
        }))
    );
    setSelectedLanguage('');
    setCurrentTranslationValue('');
    setIsReusingExistingTranslations(true);
    setShowReuseTranslationsDialog(false);
  };

  const handleDeclineReuseExistingTranslations = () => {
    setShowReuseTranslationsDialog(false);
  };

  const isValid =
    !!trimmedText &&
    (isAdmin
      ? (
        translations.length > 0 &&
        !!bucket &&
        (bucket !== 'MESSAGES' || (!!fieldName.trim() && selectedCategory.length > 0))
      )
      : true);

  const isTranslateEnabled =
    meetsTranslatePrerequisites &&
    !isCheckingExistingMatch &&
    !existingMatch &&
    !isReusingExistingTranslations;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <AlertDialog open={showTranslateConfirm} onOpenChange={setShowTranslateConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>New Item Translation</AlertDialogTitle>
              <AlertDialogDescription>
                Translation in all languages is progressive and may take a while to complete. Some translations may fail, depending on the service availability.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="outline" onClick={handleTranslate} disabled={isTranslating}>
                {isTranslating ? 'Translating...' : 'Translate'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>
              {isAdmin ? 'Add New Translation Item' : 'Request New Translation Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Source Text */}
            <div className="grid gap-2">
              <Label htmlFor="text">Source Text *</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the source text..."
                className="min-h-[100px] max-h-[200px] resize-none scrollbar-thin"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTranslateClick}
                  disabled={!isTranslateEnabled}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {isCheckingExistingMatch
                    ? 'Checking...'
                    : isTranslating
                      ? 'Translating...'
                      : 'Translate'}
                </Button>
              </div>
              {showReuseTranslationsDialog && (
                <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                  <p className="font-medium mb-1">Existing item found</p>
                  <p className="text-muted-foreground mb-3">
                    A translation item with this exact source text already exists. Automatic translation is disabled for duplicates.
                    Do you want to reuse its translations?
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={handleDeclineReuseExistingTranslations}>
                      No
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReuseExistingTranslations}>
                      Yes, reuse translations
                    </Button>
                  </div>
                </div>
              )}
              {existingMatch && !isReusingExistingTranslations && !showReuseTranslationsDialog && (
                <p className="text-sm text-muted-foreground">
                  An item with this exact source text already exists. Automatic translation is disabled for duplicates.
                </p>
              )}
              {isReusingExistingTranslations && (
                <p className="text-sm text-muted-foreground">
                  Reusing translations from the existing item. You can continue editing the form and save with these copied translations.
                </p>
              )}
            </div>

            {/* Admin-only fields */}
            {isAdmin && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="bucket">Bucket *</Label>
                  <Select value={bucket} onValueChange={handleBucketChange}>
                    <SelectTrigger id="bucket">
                      <SelectValue placeholder="Select bucket" />
                    </SelectTrigger>
                    <SelectContent>
                      {appConfig.buckets
                        .filter((b) => b.id !== 'METADATA')
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {bucket === 'MESSAGES' && (
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category *</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="category-connector"
                          checked={selectedCategory.includes('CONNECTOR')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategory([...selectedCategory, 'CONNECTOR']);
                            } else {
                              setSelectedCategory(selectedCategory.filter(c => c !== 'CONNECTOR'));
                            }
                          }}
                        />
                        <Label htmlFor="category-connector" className="cursor-pointer font-normal">
                          CONNECTOR
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="category-fc"
                          checked={selectedCategory.includes('FC')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategory([...selectedCategory, 'FC']);
                            } else {
                              setSelectedCategory(selectedCategory.filter(c => c !== 'FC'));
                            }
                          }}
                        />
                        <Label htmlFor="category-fc" className="cursor-pointer font-normal">
                          FC
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {bucket === 'MESSAGES' && (
                  <div className="grid gap-2">
                    <Label htmlFor="fieldName">Field Name *</Label>
                    <Input
                      id="fieldName"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                      placeholder="Enter field name..."
                    />
                  </div>
                )}
              </>
            )}

            {/* Added translations - only for admin users */}
            {isAdmin && translations.length > 0 && (
              <div className="grid gap-2">
                <Label>Added Translations</Label>
                <div className="flex flex-wrap gap-2">
                  {translations.map((t) => (
                    <Badge
                      key={t.language}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 flex items-center gap-1"
                    >
                      {getLanguageName(t.language)}
                      <button
                        onClick={() => handleRemoveTranslation(t.language)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                        disabled={isReusingExistingTranslations}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add language section - only for admin users */}
            {isAdmin && (
              <div className="grid gap-2 border-t pt-4">
                <Label>Add Translation *</Label>
                {isReusingExistingTranslations && (
                  <p className="text-sm text-muted-foreground">
                    Existing translations were copied from a matching item, so manual additions are disabled for this new entry.
                  </p>
                )}
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                  disabled={isReusingExistingTranslations || availableLanguages.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        availableLanguages.length === 0
                          ? 'All languages added'
                          : 'Select language to add'
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

                {selectedLanguage && (
                  <>
                    <Textarea
                      value={currentTranslationValue}
                      onChange={(e) => setCurrentTranslationValue(e.target.value)}
                      placeholder={`Enter ${getLanguageName(selectedLanguage)} translation...`}
                      className="min-h-[100px] max-h-[200px] resize-none scrollbar-thin"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearCurrentTranslation}
                        disabled={isReusingExistingTranslations || !currentTranslationValue}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddTranslation}
                        disabled={isReusingExistingTranslations || !currentTranslationValue.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Translation
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleCancel} disabled={isLoading} className="hover:bg-muted hover:text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid || isLoading}>
              {isLoading ? 'Saving...' : (isAdmin ? 'Save Item' : 'Request Item')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
