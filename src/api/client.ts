import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config';

/*
 * 请求后台的唯一入口。
 *
 * 后台的约定：成功是 HTTP 200 + {"code":0,"message":"ok","data":…}；
 * 失败是 HTTP 4xx / 5xx + {"code":错误码,"message":"中文提示","data":null 或补充数据}。
 * 出错时这里统一抛出 ApiError，界面按错误码显示当前语言的提示（见 src/utils/errors.ts）。
 */

/** 不是后台返回的错误码，是 App 自己定的：还没有配置后台地址 */
export const CODE_NOT_CONFIGURED = -1;

export class ApiError extends Error {
  /** HTTP 状态码；连不上服务器、超时是 0 */
  readonly status: number;
  /** 后台的错误码；没有拿到是 0 */
  readonly code: number;
  /** 后台给的提示（中文）；认不出错误码时才显示它 */
  readonly serverMessage: string;
  /** 后台随错误一起给的补充数据（如审核未通过的原因） */
  readonly data: unknown;

  constructor(status: number, code: number, serverMessage: string, data?: unknown) {
    super(serverMessage || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
    this.data = data;
  }
}

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** 设置（或清掉）登录令牌，之后的请求都带上它。 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** 登录失效（后台返回 401）时要做的事：清掉本地的登录状态，回到登录页。 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** 不带登录令牌（登录、注册、注册页的配送区域）。默认带 */
  anonymous?: boolean;
}

interface Envelope {
  code?: number;
  message?: string;
  data?: unknown;
}

function queryString(query?: Record<string, string | number | undefined>): string {
  if (!query) {
    return '';
  }
  const parts: string[] = [];
  Object.keys(query).forEach((key) => {
    const value = query[key];
    if (value !== undefined && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * 请求 /api/app 下面的一个接口，返回 data。
 *
 * @param path 接口路径，/api/app 之后的部分，如 /tasks/summary
 */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, CODE_NOT_CONFIGURED, '');
  }
  const token = options.anonymous ? null : authToken;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 超时：到时间还没有回应就中断请求
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/app${path}${queryString(options.query)}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    // 连不上、超时、请求被中断，都按"网络问题"处理
    throw new ApiError(0, 0, '');
  } finally {
    clearTimeout(timer);
  }

  let envelope: Envelope | null = null;
  try {
    envelope = (await response.json()) as Envelope;
  } catch {
    envelope = null;
  }

  if (response.ok && envelope && envelope.code === 0) {
    return envelope.data as T;
  }

  if (response.status === 401 && token) {
    // 令牌失效：先清掉登录状态，再把错误抛给调用的地方
    unauthorizedHandler?.();
  }
  throw new ApiError(
    response.status,
    typeof envelope?.code === 'number' ? envelope.code : 0,
    typeof envelope?.message === 'string' ? envelope.message : '',
    envelope?.data,
  );
}
