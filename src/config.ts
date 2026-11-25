/*
 * App 的配置。只有一项：后台服务的地址。
 *
 * 地址来自环境变量 EXPO_PUBLIC_API_BASE_URL（本机开发放在 .env 里，测试包 / 正式包放在 eas.json 的 env 里）。
 * Expo 在打包时把 process.env.EXPO_PUBLIC_xxx 这种写法直接替换成它的值，所以下面必须原样写全，不能拆开写。
 */

// 只在这个文件里声明一下 process 的样子，不依赖项目里有没有装 Node 的类型
declare const process: { env: { EXPO_PUBLIC_API_BASE_URL?: string } };

/** 后台服务的地址，如 https://tms.example.com（不带最后的斜杠）。没有配置时是空字符串 */
export const API_BASE_URL: string = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

/** 请求多久没有回应算超时（毫秒）。司机常在信号不好的地方，放宽一些 */
export const REQUEST_TIMEOUT_MS = 20000;

/** 任务列表、任务数字多久自动刷新一次（毫秒），只在 App 在前台时刷新 */
export const REFRESH_INTERVAL_MS = 30000;

/** 有进行中的任务时，多久取一次位置并上报（毫秒） */
export const LOCATION_INTERVAL_MS = 30000;
