/**
 * API Client Configuration and Utilities
 * Provides a centralized way to make API calls to the FastAPI backend
 */

export const BASE_URL = 'http://localhost:8000'
export const WS_URL = 'ws://localhost:8000/ws'

/**
 * Error types for better error handling
 */
export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public originalError?: unknown,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Reusable fetch wrapper with base URL, JSON headers, and error handling
 * @param endpoint - API endpoint (relative to BASE_URL)
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise with parsed JSON response
 * @throws APIError with status-specific messages
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  }

  try {
    const response = await fetch(url, fetchOptions)

    // Handle HTTP error status codes
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`

      if (response.status === 400) {
        errorMessage = 'Validation error: Invalid request data'
      } else if (response.status === 404) {
        errorMessage = 'Resource not found'
      } else if (response.status === 422) {
        errorMessage = 'Validation error: Invalid data submitted'
      } else if (response.status === 500) {
        errorMessage = 'Service unavailable: Backend error'
      }

      // Try to extract error details from response body
      try {
        const errorData = await response.json()
        if (errorData.detail) {
          // Handle Pydantic validation errors (array of error objects)
          if (Array.isArray(errorData.detail)) {
            const messages = errorData.detail.map((err: any) => {
              if (typeof err === 'object' && err.msg) {
                return err.msg
              }
              return typeof err === 'string' ? err : JSON.stringify(err)
            })
            errorMessage = messages.join('; ')
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else if (typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail)
          }
        }
      } catch {
        // Response is not JSON, use default message
      }

      throw new APIError(response.status, errorMessage)
    }

    // Parse and return successful response
    const data: T = await response.json()
    return data
  } catch (error) {
    // Handle network errors
    if (error instanceof APIError) {
      throw error
    }

    if (error instanceof TypeError) {
      // Network error or fetch not supported
      throw new APIError(0, 'Network error: No connection to backend server')
    }

    throw new APIError(0, 'Unknown error occurred', error)
  }
}

/**
 * Type-safe GET request
 */
export function apiGet<T = any>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'GET' })
}

/**
 * Type-safe POST request
 */
export function apiPost<T = any>(endpoint: string, data?: any): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Type-safe PUT request
 */
export function apiPut<T = any>(endpoint: string, data?: any): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Type-safe DELETE request
 */
export function apiDelete<T = any>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'DELETE' })
}
