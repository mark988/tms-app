import { api } from './client';
import type {
  AreaOption,
  ExceptionType,
  LocationPoint,
  LoginResult,
  ManualWorkStatus,
  PageResult,
  Profile,
  Task,
  TaskDetail,
  TaskSummary,
  TokenResult,
} from './types';

/*
 * 司机 App 用到的全部接口（tms-service 的 /api/app/**）。
 * 接单、出发、签收、上报异常成功后，后台直接返回最新的任务详情，界面用它刷新，不用再查一次。
 */

// ------------------------------------------------------------------ 注册、登录（不需要登录）

/** 注册页上可选的配送区域。 */
export const fetchAreas = () => api<AreaOption[]>('/areas', { anonymous: true });

export interface RegisterBody {
  driverName: string;
  phone: string;
  username: string;
  password: string;
  areaId: number;
}

/** 提交注册申请。提交后是"待审核"，后台审核通过才能登录。 */
export const register = (body: RegisterBody) =>
  api<{ driverCode: string }>('/auth/register', { method: 'POST', body, anonymous: true });

/** 登录。account 可以是登录账号，也可以是手机号。 */
export const login = (account: string, password: string) =>
  api<LoginResult>('/auth/login', { method: 'POST', body: { account, password }, anonymous: true });

export const logout = () => api<null>('/auth/logout', { method: 'POST' });

// ------------------------------------------------------------------ 个人信息

export const fetchProfile = () => api<Profile>('/me');

/** 修改登录密码。成功后旧令牌失效，后台直接返回新的令牌。 */
export const changePassword = (oldPassword: string, newPassword: string) =>
  api<TokenResult>('/me/password', { method: 'PUT', body: { oldPassword, newPassword } });

/** 切换工作状态。手上有已接单、配送中的任务时后台会拒绝（错误码 40021）。 */
export const changeWorkStatus = (workStatus: ManualWorkStatus) =>
  api<Profile>('/me/work-status', { method: 'PUT', body: { workStatus } });

/** 上报定位，一次最多 100 个点。 */
export const reportLocation = (points: LocationPoint[]) =>
  api<null>('/location', { method: 'POST', body: { points } });

// ------------------------------------------------------------------ 配送任务

export const fetchSummary = () => api<TaskSummary>('/tasks/summary');

/** tab：TODO 还没完成的；DONE 已结束的（已签收、已取消）。 */
export const fetchTasks = (tab: 'TODO' | 'DONE', page: number, size: number) =>
  api<PageResult<Task>>('/tasks', { query: { tab, page, size } });

export const fetchTask = (id: number) => api<TaskDetail>(`/tasks/${id}`);

/** 接受任务：待接单 → 已接单。 */
export const acceptTask = (id: number) => api<TaskDetail>(`/tasks/${id}/accept`, { method: 'POST' });

/** 开始配送：已接单 → 配送中。 */
export const departTask = (id: number) => api<TaskDetail>(`/tasks/${id}/depart`, { method: 'POST' });

export interface SignBody {
  signerName: string;
  remark?: string;
  /** 签收时手机的位置；拿不到就不传 */
  lat?: number;
  lng?: number;
}

/** 签收：配送中 → 已签收。 */
export const signTask = (id: number, body: SignBody) =>
  api<TaskDetail>(`/tasks/${id}/sign`, { method: 'POST', body });

export interface ExceptionBody {
  exceptionType: ExceptionType;
  remark?: string;
  lat?: number;
  lng?: number;
}

/** 上报异常：已接单 / 配送中 → 异常，等后台处理。 */
export const reportTaskException = (id: number, body: ExceptionBody) =>
  api<TaskDetail>(`/tasks/${id}/exception`, { method: 'POST', body });
