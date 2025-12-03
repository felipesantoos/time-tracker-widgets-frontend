import { api } from './client';
import type { ApiResponse } from './client';

export interface PomodoroSettings {
  id: string;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreak: boolean;
  userId: string;
}

export const settingsApi = {
  getPomodoro: () => api.get<ApiResponse<PomodoroSettings>>('/settings/pomodoro'),
  updatePomodoro: (data: {
    workMinutes?: number;
    shortBreakMinutes?: number;
    longBreakMinutes?: number;
    longBreakInterval?: number;
    autoStartBreak?: boolean;
  }) => api.put<ApiResponse<PomodoroSettings>>('/settings/pomodoro', data),
};

