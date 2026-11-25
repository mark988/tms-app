/*
 * 时间、金额的显示。不随语言变：时间按手机的时区显示成 年-月-日 时:分，金额是千分位加两位小数。
 */

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));

/**
 * 把后台返回的时间变成 Date。
 * 后台的时间带 6 位小数的秒（如 2026-11-24T08:40:00.123456+06:30），标准写法只有 3 位，先截掉多出来的再解析。
 */
function parse(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 2026-11-24 15:30；没有时间时显示 —。 */
export function formatDateTime(value?: string | null): string {
  const d = parse(value);
  if (!d) {
    return '—';
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 列表里用的短写法：今天的只显示 时:分，其他显示 月-日 时:分。 */
export function formatShort(value?: string | null): string {
  const d = parse(value);
  if (!d) {
    return '—';
  }
  const now = new Date();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay ? time : `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
}

/** 15:30:08（定位最近上报的时间）。 */
export function formatClock(value?: string | null): string {
  const d = parse(value);
  if (!d) {
    return '—';
  }
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 金额：1,234.50。 */
export function formatMoney(value?: number | string | null): string {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) {
    return '—';
  }
  const [whole, fraction] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}

/** 重量：去掉没用的 0，如 2.50 → 2.5。 */
export function formatWeight(value?: number | string | null): string {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) {
    return '—';
  }
  return `${parseFloat(n.toFixed(2))} kg`;
}
