/**
 * API TYPE DEFINITIONS
 * All API request/response and HTTP related types
 */

// Generic API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// HTTP request types
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number>;
  timeout?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Server action response types
export interface ServerActionResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
  redirect?: string;
}

// Action result type for server actions
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface ActionResponse<T = any> {
  success: boolean;
  message: string;
  data?: T; // Support for data payload (e.g., { id: string })
  errors?: {
    [K in keyof T]?: string[];
  };
  inputs?: T;
}
