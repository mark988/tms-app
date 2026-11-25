import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getLocales } from 'expo-localization';
import { loadLang, saveLang } from '../storage';
import en from './en';
import my from './my';
import zh from './zh';

/*
 * 界面多语言：中文、英文、缅文。
 *
 * 用法：
 *   const { t } = useI18n();
 *   t('login.submit')                      → 登录 / Log in / ဝင်ရန်
 *   t('tasks.greeting', { name: 'U Min' }) → 把文字里的 {name} 换掉
 *
 * 文字在 zh.ts / en.ts / my.ts，中文是基准。只翻译界面上的固定文字：
 * 运单号、姓名、地址、备注这些数据是什么就显示什么；后台返回的状态、异常类型是代码，按代码取这里的文字。
 *
 * 第一次打开按手机的系统语言选（缅文 → 缅文，中文 → 中文，其他 → 英文）；司机自己选过之后就记住他选的。
 */

export type Lang = 'zh' | 'en' | 'my';
export type MessageKey = keyof typeof zh;
export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: Params) => string;

/** 语言列表。名称用各自的文字写，谁都认得出自己的语言 */
export const LANGS: { value: Lang; label: string }[] = [
  { value: 'my', label: 'မြန်မာ' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
];

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { zh, en, my };

function isLang(value: unknown): value is Lang {
  return value === 'zh' || value === 'en' || value === 'my';
}

/** 按手机的系统语言猜一个。 */
function deviceLang(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    if (code === 'my') {
      return 'my';
    }
    if (code === 'zh') {
      return 'zh';
    }
  } catch {
    /* 取不到就用英文 */
  }
  return 'en';
}

function fill(text: string, params?: Params): string {
  if (!params) {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/**
 * 按代码取文字：如 status.IN_TRANSIT、exceptionType.DAMAGED、track.SIGNED。
 * 后台以后新加了代码而 App 还没有配文字时，原样显示代码，不至于空着。
 */
export function codeText(t: Translate, prefix: string, code: string): string {
  const key = `${prefix}.${code}`;
  return key in zh ? t(key as MessageKey) : code;
}

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
}

const I18nContext = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang);

  // 司机以前选过语言的话，用他选的
  useEffect(() => {
    let cancelled = false;
    void loadLang().then((saved) => {
      if (!cancelled && isLang(saved)) {
        setLangState(saved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    void saveLang(next);
  }, []);

  const value = useMemo<I18nState>(() => {
    const table = MESSAGES[lang];
    const t: Translate = (key, params) => fill(table[key] ?? zh[key] ?? key, params);
    return { lang, setLang, t };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n 必须在 I18nProvider 内使用');
  }
  return ctx;
}
