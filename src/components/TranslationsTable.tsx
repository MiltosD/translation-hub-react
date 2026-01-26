import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  flexRender,
} from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Pencil,
  Trash2,
  Languages,
  Search,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileJson,
  FileSpreadsheet,
  FileCode,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { appConfig } from '@/config/app.config';
import { api } from '@/services/api';

// Lazy load dialog components for code splitting
const AddLanguageDialog = lazy(() => import('./AddLanguageDialog').then(module => ({ default: module.AddLanguageDialog })));
const EditTranslationDialog = lazy(() => import('./EditTranslationDialog').then(module => ({ default: module.EditTranslationDialog })));
const AddNewItemDialog = lazy(() => import('./AddNewItemDialog').then(module => ({ default: module.AddNewItemDialog })));
const ImportDialog = lazy(() => import('./ImportDialog').then(module => ({ default: module.ImportDialog })));
const ExportMenu = lazy(() => import('./ExportMenu').then(module => ({ default: module.ExportMenu })));
const ConfirmDialog = lazy(() => import('./ConfirmDialog').then(module => ({ default: module.ConfirmDialog })));
import type { Translation, TranslationValue, ExportFormat } from '@/types/translation';
import type { AdminCreateData, NonAdminCreateData } from '@/services/api';

// Types for create requests
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

export const TranslationsTable = () => {
  const { user, isAdmin, getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [exactMatch, setExactMatch] = useState(false);
  
  // Debounce search with 500ms delay and 2 character minimum
  const debouncedGlobalFilter = useDebounce(globalFilter, 500, 2);
  
  const [filters, setFilters] = useState<{
    bucket: string;
    categories: string[];
    client: string;
  }>({
    bucket: 'all',
    categories: [],
    client: '',
  });
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: appConfig.table.pageSize,
  });

  // Store next/previous URLs from backend
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setNextUrl(null);
    setPreviousUrl(null);
  }, [debouncedGlobalFilter, exactMatch, filters]);

  // Set API token when authenticated
  useEffect(() => {
    const token = getToken();
    api.setToken(token);
  }, [getToken]);

  // Dialog states
  const [addLanguageOpen, setAddLanguageOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addNewOpen, setAddNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<Translation | null>(null);

  // Fetch translations
  const { data: translationsData, isLoading } = useQuery({
    queryKey: ['translations', {
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sortBy: sorting[0]?.id || 'id',
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
      search: debouncedGlobalFilter,
      exactMatch,
      filters,
    }],
    queryFn: async () => {
      // Prepare filters - convert categories array to proper format for API
      const apiFilters: Record<string, string | string[]> = {};
      
      if (filters.bucket && filters.bucket !== 'all') {
        apiFilters.bucket = filters.bucket;
      }
      
      if (filters.categories.length > 0) {
        // Send as array for multiple filter_categories params
        apiFilters.categories = filters.categories;
      }
      
      if (filters.client) {
        apiFilters.client = filters.client;
      }
      
      const result = await api.getTranslations({
        page: pagination.pageIndex + 1, // API uses 1-based pagination
        pageSize: pagination.pageSize,
        sortBy: sorting[0]?.id || 'id', // Default sort by ID
        sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
        search: debouncedGlobalFilter,
        exactMatch,
        filters: apiFilters,
      });

      // Store next/previous URLs for pagination
      setNextUrl(result.next || null);
      setPreviousUrl(result.previous || null);

      return result;
    },
  });

  const data = translationsData?.data || [];
  const totalCount = translationsData?.total || 0;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: AdminCreateData | NonAdminCreateData) => api.createTranslation(data),
    onSuccess: (createdTranslation: Translation) => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      // Close add dialog and open edit dialog with the newly created item
      setAddNewOpen(false);
      setSelectedItem(createdTranslation);
      setEditDialogOpen(true);
      toast({
        title: "Success",
        description: "Translation created successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Failed to create translation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create translation",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Translation> }) =>
      api.updateTranslation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });

  const updateLanguageMutation = useMutation({
    mutationFn: ({ id, language, value }: { id: number; language: string; value: string }) =>
      api.updateTranslationLanguage(id, language, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTranslation(id),
    onSuccess: () => {
      // Invalidate queries to refetch data at current page
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast({
        title: "Success",
        description: "Translation deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete translation",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.deleteTranslations(ids),
    onSuccess: () => {
      // Invalidate queries to refetch data at current page
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      // Clear row selection after successful delete
      setRowSelection({});
      toast({
        title: "Success",
        description: `${Object.keys(rowSelection).length} translation(s) deleted successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete translations",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });

  const exportMutation = useMutation<Blob, Error, { ids: number[]; format: ExportFormat }>({
    mutationFn: ({ ids, format }: { ids: number[]; format: ExportFormat }) =>
      api.exportTranslations(ids, format),
  });

  const truncateText = (text: string, maxLength: number = appConfig.table.textTruncateLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getCategories = (category: Translation['category']) => {
    if (!category) return '-';
    
    // Parse the category - could be a string like "CONNECTOR", "FC", or JSON array like '["CONNECTOR", "FC"]'
    let categories: string[] = [];
    
    // Try parsing as JSON array first
    try {
      const parsed = JSON.parse(category);
      if (Array.isArray(parsed)) {
        categories = parsed;
      } else {
        categories = [String(parsed)];
      }
    } catch {
      // If not JSON, it's a simple string or comma-separated
      const categoryStr = String(category);
      if (categoryStr.includes(',')) {
        categories = categoryStr.split(',').map(c => c.trim());
      } else {
        categories = [categoryStr];
      }
    }
    
    // Map to display names: CONNECTOR -> CON, FC -> FC
    const displayNames = categories
      .filter(cat => cat && String(cat).trim()) // Filter out empty/null values
      .map(cat => {
        const upperCat = String(cat).toUpperCase().trim();
        if (upperCat === 'CONNECTOR') return 'CON';
        if (upperCat === 'FC') return 'FC';
        return cat;
      });
    
    return displayNames.length > 0 ? displayNames.join('/') : '-';
  };

  const hasAvailableLanguages = (item: Translation) => {
    const existingLanguages = item.translations.map(t => t.language);
    return appConfig.languages.some(lang => !existingLanguages.includes(lang.code));
  };

  const handleAddLanguage = (item: Translation) => {
    setSelectedItem(item);
    setAddLanguageOpen(true);
  };

  const handleEdit = (item: Translation) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (item: Translation) => {
    setSelectedItem(item);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedItem) {
      deleteMutation.mutate(selectedItem.id);
    }
    setDeleteConfirmOpen(false);
    setSelectedItem(null);
  };

  const handleBulkDelete = () => {
    setBulkDeleteConfirmOpen(true);
  };

  const handleConfirmBulkDelete = () => {
    const selectedIds = Object.keys(rowSelection).map(id => Number(id));
    bulkDeleteMutation.mutate(selectedIds);
    setBulkDeleteConfirmOpen(false);
  };

  const handleSaveLanguage = (translation: TranslationValue) => {
    if (selectedItem) {
      updateLanguageMutation.mutate({
        id: selectedItem.id,
        language: translation.language,
        value: translation.value
      });
    }
    setAddLanguageOpen(false);
    setSelectedItem(null);
  };

  const handleSaveTranslations = async (translations: TranslationValue[], newSourceText?: string) => {
    if (selectedItem) {
      // Update source text if changed (admin only)
      if (newSourceText && newSourceText !== selectedItem.text) {
        await updateMutation.mutateAsync({
          id: selectedItem.id,
          data: { text: newSourceText }
        });
      }

      // Create a map of existing translations for comparison
      const existingTranslationsMap = selectedItem.translations.reduce((acc, t) => {
        acc[t.language] = t.value;
        return acc;
      }, {} as Record<string, string>);

      // Only update translations that have actually changed
      const updatePromises = translations
        .filter((translation) => {
          const existingValue = existingTranslationsMap[translation.language];
          return existingValue !== translation.value;
        })
        .map((translation) =>
          updateLanguageMutation.mutateAsync({
            id: selectedItem.id,
            language: translation.language,
            value: translation.value
          })
        );

      await Promise.all(updatePromises);
    }
    setEditDialogOpen(false);
    setSelectedItem(null);
  };

  const handleSaveNewItem = (item: AdminCreateRequest | NonAdminCreateRequest) => {
    console.log('handleSaveNewItem called with:', item);
    
    // For admin requests, send the data directly
    if ('translations' in item) {
      // Admin request - send category as array
      const adminData = {
        text: item.text,
        translations: item.translations.map(t => ({
          language: t.language,
          value: t.value
        })),
        ...(item.message_field_name && { message_field_name: item.message_field_name }),
        ...(item.bucket && { bucket: item.bucket }),
        ...(item.category && item.category.length > 0 && { category: item.category }),
      };
      console.log('Sending admin data:', adminData);
      createMutation.mutate(adminData);
    } else {
      // Non-admin request - send text + client from JWT
      const nonAdminData = {
        text: item.text,
        client: item.client,
      };
      console.log('Sending non-admin data:', nonAdminData);
      createMutation.mutate(nonAdminData);
    }
    
    // Dialog will be closed by the mutation onSuccess handler
  };

  const handleImport = async (file: File) => {
    try {
      await importMutation.mutateAsync(file);
      setImportOpen(false);
    } catch (error) {
      console.error('Import failed:', error);
      // Handle error (show toast, etc.)
    }
  };

  const handleExport = async (format: ExportFormat) => {
    const selectedIds = Object.keys(rowSelection).map(id => Number(id));
    try {
      const blob = await exportMutation.mutateAsync({ ids: selectedIds, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translations.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error
    }
  };

  const columns = useMemo<ColumnDef<Translation>[]>(() => {
    const baseColumns: ColumnDef<Translation>[] = [];

    // Checkbox column for admin only
    if (isAdmin) {
      baseColumns.push({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      });
    }

    // ID column
    baseColumns.push({
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.getValue('id')}
        </span>
      ),
      size: 80,
    });

    // Text column
    baseColumns.push({
      accessorKey: 'text',
      header: 'Text',
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-truncate block max-w-[200px]">
              {truncateText(row.getValue('text'))}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[400px]">
            <p className="whitespace-pre-wrap">{row.getValue('text')}</p>
          </TooltipContent>
        </Tooltip>
      ),
    });

    // Admin-only columns
    if (isAdmin) {
      baseColumns.push(
        {
          accessorKey: 'bucket',
          header: 'Bucket',
          cell: ({ row }) => {
            const bucket = row.getValue('bucket') as string | undefined;
            const bucketName = appConfig.buckets.find((b) => b.id === bucket)?.name;
            return bucket ? (
              <Badge variant="outline">{bucketName || bucket}</Badge>
            ) : (
              '-'
            );
          },
          size: 80,
        },
        {
          id: 'categories',
          header: 'Categories',
          cell: ({ row }) => getCategories(row.original.category),
          size: 80,
        },
        {
          accessorKey: 'message_field_name',
          header: 'Field Name',
          cell: ({ row }) => row.getValue('message_field_name') || '-',
          size: 100,
        },
        {
          accessorKey: 'client',
          header: 'Connector',
          cell: ({ row }) => (
            <Badge variant="secondary">{row.getValue('client')}</Badge>
          ),
          size: 100,
        }
      );
    }

    // Actions column
    baseColumns.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAddLanguage(row.original)}
                disabled={!hasAvailableLanguages(row.original)}
              >
                <Languages className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasAvailableLanguages(row.original) ? 'Add Language' : 'All languages added'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(row.original)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(row.original)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
      size: 100,
    });

    return baseColumns;
  }, [isAdmin]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
      pagination,
    },
    enableRowSelection: isAdmin,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id.toString(),
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {isAdmin && selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedCount})
          </Button>
          <Suspense fallback={<div>Loading...</div>}>
            <ExportMenu
              onExport={handleExport}
              selectedCount={selectedCount}
            />
          </Suspense>
        </div>
      )}

      {/* Search and Filters */}
      {isAdmin ? (
        <div className="flex flex-wrap gap-4 items-end">
          <div className="grid gap-2 flex-1 min-w-[200px] max-w-md">
            <Label htmlFor="search-filter">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-filter"
                placeholder="Search text or translations..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 pr-9"
              />
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setGlobalFilter('')}
                >
                  <span className="sr-only">Clear search</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="exact-match"
              checked={exactMatch}
              onCheckedChange={(checked) => setExactMatch(!!checked)}
            />
            <Label htmlFor="exact-match" className="text-sm font-normal cursor-pointer whitespace-nowrap">
              Matches entire English text (case sensitive)
            </Label>
          </div>

          <div className="grid gap-2 min-w-[150px]">
            <Label htmlFor="bucket-filter">Bucket</Label>
            <Select
              value={filters.bucket}
              onValueChange={(value) => setFilters(prev => ({ ...prev, bucket: value }))}
            >
              <SelectTrigger id="bucket-filter">
                <SelectValue placeholder="All buckets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buckets</SelectItem>
                {appConfig.buckets.map((bucket) => (
                  <SelectItem key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 min-w-[200px]">
            <Label>Categories</Label>
            <div className="flex gap-4 p-3 border rounded-md">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="category-connector-filter"
                  checked={filters.categories.includes('CONNECTOR')}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      categories: checked
                        ? [...prev.categories, 'CONNECTOR']
                        : prev.categories.filter(c => c !== 'CONNECTOR')
                    }));
                  }}
                />
                <Label htmlFor="category-connector-filter" className="cursor-pointer font-normal">
                  CONNECTOR
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="category-fc-filter"
                  checked={filters.categories.includes('FC')}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      categories: checked
                        ? [...prev.categories, 'FC']
                        : prev.categories.filter(c => c !== 'FC')
                    }));
                  }}
                />
                <Label htmlFor="category-fc-filter" className="cursor-pointer font-normal">
                  FC
                </Label>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ bucket: 'all', categories: [], client: '' })}
            disabled={filters.bucket === 'all' && filters.categories.length === 0 && !filters.client}
          >
            Clear Filters
          </Button>

          <div className="flex items-end gap-2 ml-auto">
            <Button size="sm" onClick={() => setAddNewOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 items-end">
          <div className="grid gap-2 flex-1 min-w-[200px] max-w-md">
            <Label htmlFor="search-filter">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-filter"
                placeholder="Search text or translations..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 pr-9"
              />
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setGlobalFilter('')}
                >
                  <span className="sr-only">Clear search</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="exact-match"
              checked={exactMatch}
              onCheckedChange={(checked) => setExactMatch(!!checked)}
            />
            <Label htmlFor="exact-match" className="text-sm font-normal cursor-pointer whitespace-nowrap">
              Match exact
            </Label>
          </div>

          {/* <div className="flex items-end gap-2 ml-auto">
            <Button size="sm" onClick={() => setAddNewOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div> */}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          <span className="block mb-1">Results: {totalCount}</span>
          {isAdmin && selectedCount > 0 && (
            <span className="mr-4">{selectedCount} selected</span>
          )}
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <span className="ml-4">
            ({table.getFilteredRowModel().rows.length} total rows)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
            disabled={!previousUrl}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
            disabled={!previousUrl}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
            disabled={!nextUrl}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: table.getPageCount() - 1 }))}
            disabled={!nextUrl}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card max-h-[calc(100vh-380px)] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading translations...</div>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-table-header hover:bg-table-header">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="font-semibold"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                <ContextMenu key={row.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      data-state={row.getIsSelected() && 'selected'}
                      className="hover:bg-table-row-hover data-[state=selected]:bg-table-row-selected"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem 
                      onClick={() => handleAddLanguage(row.original)}
                      disabled={!hasAvailableLanguages(row.original)}
                    >
                      <Languages className="h-4 w-4 mr-2" />
                      Add Language
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleEdit(row.original)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </ContextMenuItem>
                    {isAdmin && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleDelete(row.original)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </div>

      {/* Dialogs */}
      <Suspense fallback={<div>Loading...</div>}>
        <AddLanguageDialog
          open={addLanguageOpen}
          onOpenChange={setAddLanguageOpen}
          existingLanguages={selectedItem?.translations.map((t) => t.language) || []}
          onSave={handleSaveLanguage}
          translation={selectedItem}
        />

        <EditTranslationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          translations={selectedItem?.translations || []}
          onSave={handleSaveTranslations}
          translation={selectedItem}
        />

        <AddNewItemDialog
          key={addNewOpen ? 'add-new-open' : 'add-new-closed'}
          open={addNewOpen}
          onOpenChange={setAddNewOpen}
          onSave={handleSaveNewItem}
          isLoading={createMutation.isPending}
        />

        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImport={handleImport}
        />

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="Delete Translation"
          description="Are you sure you want to delete this translation? This action cannot be undone."
          confirmText="Delete"
          variant="destructive"
          onConfirm={handleConfirmDelete}
        />

        <ConfirmDialog
          open={bulkDeleteConfirmOpen}
          onOpenChange={setBulkDeleteConfirmOpen}
          title="Delete Selected Translations"
          description={`Are you sure you want to delete ${selectedCount} translations? This action cannot be undone.`}
          confirmText="Delete All"
          variant="destructive"
          onConfirm={handleConfirmBulkDelete}
        />
      </Suspense>
    </div>
  );
};
