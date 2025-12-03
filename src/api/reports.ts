import { api } from './client';
import type { ApiResponse } from './client';

export interface ReportSummary {
  period: {
    from: string;
    to: string;
  };
  totalSeconds: number;
  totalHours: number;
  byProject: Array<{
    project: {
      id: string;
      name: string;
      color: string;
    };
    totalSeconds: number;
    sessionCount: number;
  }>;
  sessionCount: number;
}

export interface PomodoroReport {
  period: {
    from: string;
    to: string;
  };
  total: number;
  byProject: Array<{
    project: {
      id: string;
      name: string;
      color: string;
    };
    count: number;
  }>;
}

export const reportsApi = {
  summary: (params?: { from?: string; to?: string; groupBy?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.groupBy) query.set('groupBy', params.groupBy);
    
    const queryString = query.toString();
    return api.get<ApiResponse<ReportSummary>>(
      `/reports/summary${queryString ? `?${queryString}` : ''}`
    );
  },
  pomodoro: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    
    const queryString = query.toString();
    return api.get<ApiResponse<PomodoroReport>>(
      `/reports/pomodoro${queryString ? `?${queryString}` : ''}`
    );
  },
};

