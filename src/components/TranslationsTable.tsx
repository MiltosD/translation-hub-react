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
  category?: string;
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
  
  // Debounce search with 400ms delay and 3 character minimum
  const debouncedGlobalFilter = useDebounce(globalFilter, 400, 3);
  
  const [filters, setFilters] = useState({
    bucket: 'all',
    categories: 'all',
    client: '',
  });
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: appConfig.table.pageSize,
  });

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
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
      search: debouncedGlobalFilter,
      filters,
    }],
    queryFn: () => api.getTranslations({
      page: pagination.pageIndex + 1, // API uses 1-based pagination
      pageSize: pagination.pageSize,
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
      search: debouncedGlobalFilter,
      filters: Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== 'all')
      ),
    }),
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
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.deleteTranslations(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      setRowSelection({});
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
    return category;
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

  const handleSaveTranslations = (translations: TranslationValue[]) => {
    if (selectedItem) {
      // Create a map of existing translations for comparison
      const existingTranslationsMap = selectedItem.translations.reduce((acc, t) => {
        acc[t.language] = t.value;
        return acc;
      }, {} as Record<string, string>);

      // Only update translations that have actually changed
      translations.forEach((translation) => {
        const existingValue = existingTranslationsMap[translation.language];
        if (existingValue !== translation.value) {
          updateLanguageMutation.mutate({
            id: selectedItem.id,
            language: translation.language,
            value: translation.value
          });
        }
      });
    }
    setEditDialogOpen(false);
    setSelectedItem(null);
  };

  const handleSaveNewItem = (item: AdminCreateRequest | NonAdminCreateRequest) => {
    console.log('handleSaveNewItem called with:', item);
    
    // For admin requests, send the data directly (backend expects different format)
    if ('translations' in item) {
      // Transform string category to object format
      const categoryObject = item.category ? {
        CONNECTOR: item.category === 'CONNECTOR',
        CENTRAL: item.category === 'CENTRAL', 
        FC: item.category === 'FC'
      } : undefined;

      // Admin request - send as-is but transform translations to remove 'auto' field
      const adminData = {
        text: item.text,
        translations: item.translations.map(t => ({
          language: t.language,
          value: t.value
        })),
        ...(item.message_field_name && { message_field_name: item.message_field_name }),
        ...(item.bucket && { bucket: item.bucket }),
        ...(categoryObject && { category: categoryObject }),
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          ID
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Text
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
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
          header: 'Client',
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
              >
                <Languages className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Language</TooltipContent>
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
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search text or translations... (use quotes for exact match)"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && selectedCount > 0 && (
            <>
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
            </>
          )}

          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>

          <Button size="sm" onClick={() => setAddNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      {/* Admin Filters */}
      {isAdmin && (
        <div className="flex flex-wrap gap-4 items-end">
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

          <div className="grid gap-2 min-w-[150px]">
            <Label htmlFor="categories-filter">Categories</Label>
            <Select
              value={filters.categories}
              onValueChange={(value) => setFilters(prev => ({ ...prev, categories: value }))}
            >
              <SelectTrigger id="categories-filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {appConfig.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ bucket: 'all', categories: 'all', client: '' })}
            disabled={filters.bucket === 'all' && filters.categories === 'all' && !filters.client}
          >
            Clear Filters
          </Button>
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
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card max-h-[600px] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading translations...</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
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
                    <ContextMenuItem onClick={() => handleAddLanguage(row.original)}>
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
