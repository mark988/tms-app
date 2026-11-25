import { ApiError, CODE_NOT_CONFIGURED } from '../api/client';
import type { MessageKey, Translate } from '../i18n';

/*
 * 把请求出的错变成当前语言的一句提示。
 *
 * 后台给司机 App 会遇到的每种错误都定了固定的错误码（tms-service 的 BizException，发布之后不会改），
 * 这里按码取文字；认不出的码才显示后台自己的提示（中文）。
 */

/** 任务状态已经变化：被改派、被取消，或者连点了两次。提示之后要刷新 */
export const CODE_TASK_CHANGED = 40020;

const CODE_KEYS: Record<number, MessageKey> = {
  40010: 'error.loginFailed',
  40011: 'error.pending',
  40012: 'error.rejected',
  40013: 'error.disabled',
  40014: 'error.locked',
  40015: 'error.usernameTaken',
  40016: 'error.phoneTaken',
  40017: 'error.oldPasswordWrong',
  40018: 'error.passwordInvalid',
  40020: 'error.taskChanged',
  40021: 'error.hasActiveTask',
  42900: 'error.tooMany',
};

function field(data: unknown, name: string): unknown {
  return data && typeof data === 'object' ? (data as Record<string, unknown>)[name] : undefined;
}

export function errorText(error: unknown, t: Translate): string {
  if (!(error instanceof ApiError)) {
    return t('error.unknown');
  }
  if (error.code === CODE_NOT_CONFIGURED) {
    return t('error.notConfigured');
  }
  if (error.status === 0) {
    return t('error.network');
  }
  if (error.code === 40012) {
    // 审核未通过：后台填的原因是数据，原样接在后面
    const reason = field(error.data, 'reason');
    return typeof reason === 'string' && reason ? t('error.rejectedWithReason', { reason }) : t('error.rejected');
  }
  if (error.code === 40014) {
    const minutes = field(error.data, 'minutes');
    return typeof minutes === 'number' && minutes > 0 ? t('error.lockedMinutes', { n: minutes }) : t('error.locked');
  }
  const key = CODE_KEYS[error.code];
  if (key) {
    return t(key);
  }
  if (error.status === 401) {
    return t('error.sessionExpired');
  }
  if (error.status >= 500) {
    return t('error.server');
  }
  return error.serverMessage || t('error.unknown');
}

/** 是不是"任务状态已经变化"。 */
export function isTaskChanged(error: unknown): boolean {
  return error instanceof ApiError && error.code === CODE_TASK_CHANGED;
}

/** 是不是"任务已经不归这名司机"（后台对任务接口返回 404）。 */
export function isTaskGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** 是不是登录失效（这时请求层已经把人送回登录页，界面不用再弹提示）。 */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
