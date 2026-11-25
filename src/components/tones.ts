import type { TaskStatus, WorkStatus } from '../api/types';
import type { Tone } from './ui';

/** 任务状态标签的颜色（标签上始终有文字，颜色只是帮着一眼区分） */
export const TASK_TONE: Record<TaskStatus, Tone> = {
  ASSIGNED: 'orange',
  ACCEPTED: 'blue',
  IN_TRANSIT: 'blue',
  SIGNED: 'green',
  EXCEPTION: 'red',
  CANCELLED: 'gray',
};

export const WORK_TONE: Record<WorkStatus, Tone> = {
  IDLE: 'green',
  DELIVERING: 'blue',
  PAUSED: 'orange',
  OFFLINE: 'gray',
};

/** 任务状态标签的颜色；后台以后新加了状态而 App 还不认识时用灰色。 */
export function taskTone(status: string): Tone {
  return (TASK_TONE as Record<string, Tone | undefined>)[status] ?? 'gray';
}
