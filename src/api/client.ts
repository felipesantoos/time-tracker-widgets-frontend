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
    // Remover quebras de linha e detalhes complexos para exibição mais limpa
    const cleanMessage = errorMessage.replace(/\n/g, ' ').trim();
    throw new Error(cleanMessage);
  }

  // Se a resposta for 204 No Content, retornar null em vez de tentar fazer JSON
  if (response.status === 204) {
    return null as T;
  }

  // Verificar se há conteúdo antes de tentar fazer JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.warn('Resposta não é JSON:', contentType, endpoint);
    return null as T;
  }

  // Verificar se há conteúdo no body
  const text = await response.text();
  if (!text || text.trim() === '') {
    console.warn('Resposta vazia para:', endpoint);
    return null as T;
  }

  try {
    const parsed = JSON.parse(text) as T;
    console.log('Resposta parseada com sucesso para:', endpoint, parsed);
    return parsed;
  } catch (parseError) {
    console.error('Erro ao fazer parse JSON para:', endpoint, parseError, 'Texto:', text);
    return null as T;
  }
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
