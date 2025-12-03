import { api } from './client';
import type { ApiResponse, PaginatedResponse } from './client';

export interface TimeSession {
  id: string;
  projectId: string | null;
  description?: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  mode: 'stopwatch' | 'timer' | 'pomodoro';
  project: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface CreateSessionData {
  projectId?: string | null;
  description?: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  mode: 'stopwatch' | 'timer' | 'pomodoro';
}

export interface ActiveSession {
  id: string;
  startTime: string;
  mode: 'stopwatch' | 'timer' | 'pomodoro';
  projectId: string | null;
  description?: string;
  targetSeconds: number | null;
  pomodoroPhase: 'work' | 'shortBreak' | 'longBreak' | null;
  pomodoroCycle: number;
  project: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface CreateActiveSessionData {
  startTime: string;
  mode: 'stopwatch' | 'timer' | 'pomodoro';
  projectId?: string | null;
  description?: string;
  targetSeconds?: number | null;
  pomodoroPhase?: 'work' | 'shortBreak' | 'longBreak' | null;
  pomodoroCycle?: number;
}

export const sessionsApi = {
  list: (params?: {
    projectId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return api.get<PaginatedResponse<TimeSession>>(
      `/sessions${queryString ? `?${queryString}` : ''}`
    );
  },
  create: (data: CreateSessionData) =>
    api.post<ApiResponse<TimeSession>>('/sessions', data),
  update: (id: string, data: { description?: string; projectId?: string | null; startTime?: string; endTime?: string }) =>
    api.patch<ApiResponse<TimeSession>>(`/sessions/${id}`, data),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  getActive: () => api.get<ApiResponse<ActiveSession>>('/sessions/active'),
  createActive: (data: CreateActiveSessionData) =>
    api.post<ApiResponse<ActiveSession>>('/sessions/active', data),
  finishActive: () =>
    api.delete<ApiResponse<TimeSession>>('/sessions/active'),
};

