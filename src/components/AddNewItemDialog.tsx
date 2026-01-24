import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { X, Plus } from 'lucide-react';
import { appConfig } from '@/config/app.config';
import { useAuth } from '@/contexts/AuthContext';
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
  onSave: (item: AdminCreateRequest | NonAdminCreateRequest) => void;
  isLoading?: boolean;
}

export const AddNewItemDialog = ({
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: AddNewItemDialogProps) => {
  const { isAdmin, user } = useAuth();
  
  const [text, setText] = useState('');
  const [translations, setTranslations] = useState<TranslationValue[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [currentTranslationValue, setCurrentTranslationValue] = useState('');
  const [bucket, setBucket] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [fieldName, setFieldName] = useState('');

  const availableLanguages = appConfig.languages.filter(
    (lang) => !translations.some((t) => t.language === lang.code)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleAddTranslation = () => {
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
      // Admin user request structure
      const adminRequest: AdminCreateRequest = {
        text: text.trim(),
        translations: translations.map(t => ({
          language: t.language,
          value: t.value,
          auto: false
        })),
        message_field_name: fieldName.trim() || undefined,
        bucket: bucket || undefined,
        category: selectedCategory.length > 0 ? selectedCategory : undefined,
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

  const resetForm = () => {
    setText('');
    setTranslations([]);
    setSelectedLanguage('');
    setCurrentTranslationValue('');
    setBucket('');
    setSelectedCategory([]);
    setFieldName('');
  };

  const getLanguageName = (code: string) => {
    return appConfig.languages.find((l) => l.code === code)?.name || code;
  };

  const isValid = text.trim() && (isAdmin ? (translations.length > 0 && (bucket !== 'MESSAGES' || fieldName.trim())) : true);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
          </div>

          {/* Admin-only fields */}
          {isAdmin && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="bucket">Bucket</Label>
                <Select value={bucket} onValueChange={setBucket}>
                  <SelectTrigger id="bucket">
                    <SelectValue placeholder="Select bucket (optional, default: METADATA)" />
                  </SelectTrigger>
                  <SelectContent>
                    {appConfig.buckets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
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
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
                disabled={availableLanguages.length === 0}
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
                      disabled={!currentTranslationValue}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddTranslation}
                      disabled={!currentTranslationValue.trim()}
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
  );
};
