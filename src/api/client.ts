const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Tipos de resposta da API
export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Função para obter o token (da query string ou localStorage)
function getToken(): string | null {
  // Primeiro, tenta pegar da query string
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromQuery = urlParams.get('token');
  
  if (tokenFromQuery) {
    // Salva no localStorage para próximas requisições
    localStorage.setItem('auth_token', tokenFromQuery);
    return tokenFromQuery;
  }
  
  // Se não tiver na query, tenta do localStorage
  return localStorage.getItem('auth_token');
}

// Cliente HTTP básico
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  if (!token) {
    const error = new Error('Token de autenticação não encontrado. Adicione ?token=SEU_TOKEN na URL.');
    (error as any).status = 401;
    throw error;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token inválido
      localStorage.removeItem('auth_token');
      throw new Error('Token inválido ou expirado');
    }
    
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    const errorMessage = error.error || `Erro ${response.status}`;
    const errorDetails = error.details ? `\nDetalhes: ${JSON.stringify(error.details, null, 2)}` : '';
    throw new Error(errorMessage + errorDetails);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
