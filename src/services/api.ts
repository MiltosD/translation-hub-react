import { appConfig } from '@/config/app.config';
import type { Translation, ExportFormat } from '@/types/translation';

// Types for create translation requests
interface AdminCreateData {
  text: string;
  translations: Array<{
    language: string;
    value: string;
  }>;
  message_field_name?: string;
  bucket?: string;
  category?: string[];
}

interface NonAdminCreateData {
  text: string;
  client: string;
}

type CreateTranslationData = AdminCreateData | NonAdminCreateData;

export type { AdminCreateData, NonAdminCreateData, CreateTranslationData };

const { baseUrl, endpoints } = appConfig.api;

class ApiService {
  private token: string | undefined;

  setToken(token: string | undefined) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      
      // Format field-specific errors
      if (errorData && typeof errorData === 'object' && !errorData.message) {
        const formattedErrors: string[] = [];
        
        for (const [field, errors] of Object.entries(errorData)) {
          if (Array.isArray(errors)) {
            errors.forEach(err => {
              formattedErrors.push(`${field}\n${err}`);
            });
          } else if (typeof errors === 'string') {
            formattedErrors.push(`${field}\n${errors}`);
          }
        }
        
        if (formattedErrors.length > 0) {
          const error = new Error(formattedErrors.join('\n\n')) as Error & { details: unknown };
          error.details = errorData;
          throw error;
        }
      }
      
      // Fallback to regular error or stringify the whole response
      const errorMessage = errorData.message || 
        (typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : 'Request failed');
      const error = new Error(errorMessage) as Error & { details: unknown };
      error.details = errorData;
      throw error;
    }

    // Handle responses with no content (like DELETE)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return undefined as T;
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : undefined as T;
  }

  // Translations CRUD
  async getTranslations(params?: {
    search?: string;
    exactMatch?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, string | string[]>;
  }): Promise<{ data: Translation[]; total: number; next?: string | null; previous?: string | null }> {
    const queryParams = new URLSearchParams();
    if (params?.search) {
      const searchParam = params.exactMatch ? 'exact' : 'search';
      queryParams.set(searchParam, params.search);
    }
    if (params?.page) {
      queryParams.set('page', params.page.toString());
    }
    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // For array values, add multiple parameters with the same name
          value.forEach(v => queryParams.append(`filter_${key}`, v));
        } else {
          queryParams.set(`filter_${key}`, value);
        }
      });
    }

    const query = queryParams.toString();
    const response = await this.request<{ 
      results?: Translation[]; 
      data?: Translation[]; 
      total?: number; 
      count?: number;
      next?: string | null;
      previous?: string | null;
    }>(
      `${endpoints.translations}${query ? `?${query}` : ''}`
    );

    return {
      data: response.results || response.data || [],
      total: response.total || response.count || (response.results || response.data || []).length,
      next: response.next,
      previous: response.previous,
    };
  }

  // Fetch translations from a full URL (for next/previous pagination)
  async getTranslationsFromUrl(url: string): Promise<{ data: Translation[]; total: number; next?: string | null; previous?: string | null }> {
    // Extract just the path and query from the URL
    const urlObj = new URL(url);
    const endpoint = urlObj.pathname + urlObj.search;
    
    const response = await this.request<{ 
      results?: Translation[]; 
      data?: Translation[]; 
      total?: number; 
      count?: number;
      next?: string | null;
      previous?: string | null;
    }>(endpoint);

    return {
      data: response.results || response.data || [],
      total: response.total || response.count || (response.results || response.data || []).length,
      next: response.next,
      previous: response.previous,
    };
  }

  async createTranslation(data: CreateTranslationData): Promise<Translation> {
    console.log('API createTranslation called with:', data);
    return this.request<Translation>(`${endpoints.translations}/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTranslation(id: number, translation: Partial<Translation>): Promise<Translation> {
    return this.request<Translation>(`${endpoints.translations}/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(translation),
    });
  }

  async updateTranslationLanguage(id: number, language: string, value: string): Promise<Translation> {
    return this.request<Translation>(`${endpoints.translations}/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        translations: {
          [language]: value
        }
      }),
    });
  }
  async deleteTranslation(id: number): Promise<void> {
    await this.request<void>(`${endpoints.translations}/${id}/`, {
      method: 'DELETE',
    });
  }

  async deleteTranslations(ids: number[]): Promise<void> {
    await this.request<void>(`${endpoints.translations}/bulk-delete/`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // Import
  async importFile(file: File): Promise<{ success: boolean; imported: number; errors?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${baseUrl}${endpoints.import}`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Export
  async exportTranslations(ids: number[], format: ExportFormat): Promise<Blob> {
    const response = await fetch(`${baseUrl}${endpoints.export}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: JSON.stringify({ ids, format }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }
}

export const api = new ApiService();
