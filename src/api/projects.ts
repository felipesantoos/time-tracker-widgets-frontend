import { api } from './client';
import type { ApiResponse } from './client';

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export const projectsApi = {
  list: () => api.get<ApiResponse<Project[]>>('/projects'),
  create: (data: { name: string; color: string }) =>
    api.post<ApiResponse<Project>>('/projects', data),
  update: (id: string, data: { name?: string; color?: string }) =>
    api.put<ApiResponse<Project>>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

