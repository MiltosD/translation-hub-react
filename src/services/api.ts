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
  category?: {
    CONNECTOR?: boolean;
    CENTRAL?: boolean;
    FC?: boolean;
  };
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
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Translations CRUD
  async getTranslations(params?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, string>;
  }): Promise<{ data: Translation[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        queryParams.set(`filter_${key}`, value);
      });
    }

    const query = queryParams.toString();
    const response = await this.request<{ results?: Translation[]; data?: Translation[]; total?: number; count?: number }>(
      `${endpoints.translations}${query ? `?${query}` : ''}`
    );

    return {
      data: response.results || response.data || [],
      total: response.total || response.count || (response.results || response.data || []).length,
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
    await this.request<void>(`${endpoints.translations}/bulk-delete`, {
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
