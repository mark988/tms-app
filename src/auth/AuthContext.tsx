import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, setAuthToken, setUnauthorizedHandler } from '../api/client';
import * as driverApi from '../api/driver';
import type { Profile } from '../api/types';
import { loadToken, saveToken } from '../storage';

/*
 * 登录状态。
 *
 * - 令牌存在手机的安全存储里，App 重新打开时不用再登录（后台给司机的令牌有效期是 30 天）。
 * - 后台任何时候返回 401（账号被停用、密码被重置、令牌过期），都清掉本地的登录状态回到登录页。
 * - 打开 App 时有令牌但连不上服务器：停在"连接不上"的页面让人重试，不把人踢回登录页。
 */

/** loading 正在恢复登录；signedOut 没登录；signedIn 已登录；offline 有令牌但连不上服务器 */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'offline';

interface AuthState {
  status: AuthStatus;
  /** 当前登录的司机；没登录时为 null */
  profile: Profile | null;
  /** 登录。失败时抛出 ApiError，由登录页显示提示 */
  signIn: (account: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** 重新取一次司机信息（工作状态、绑定的车辆会被后台改动） */
  refreshProfile: () => Promise<void>;
  /** 直接换成后台刚返回的司机信息（切换工作状态之后） */
  setProfile: (profile: Profile) => void;
  /** 换成新的令牌（修改密码之后后台会发新的） */
  replaceToken: (token: string) => Promise<void>;
  /** 连不上服务器之后再试一次 */
  retry: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [attempt, setAttempt] = useState(0);

  const clear = useCallback(() => {
    setAuthToken(null);
    void saveToken(null);
    setProfileState(null);
    setStatus('signedOut');
  }, []);

  // 后台返回 401 时请求层会调用它
  useEffect(() => {
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  // 打开 App（或者点了重试）：用存着的令牌恢复登录
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const token = await loadToken();
      if (cancelled) {
        return;
      }
      if (!token) {
        setStatus('signedOut');
        return;
      }
      setAuthToken(token);
      try {
        const current = await driverApi.fetchProfile();
        if (!cancelled) {
          setProfileState(current);
          setStatus('signedIn');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          // 令牌失效：请求层已经清掉了登录状态
          return;
        }
        setStatus('offline');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const signIn = useCallback(async (account: string, password: string) => {
    const result = await driverApi.login(account, password);
    setAuthToken(result.token);
    await saveToken(result.token);
    setProfileState(result.profile);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await driverApi.logout();
    } catch {
      /* 后台退出失败（比如没有网络）也要清掉本地的登录状态 */
    }
    clear();
  }, [clear]);

  const refreshProfile = useCallback(async () => {
    try {
      setProfileState(await driverApi.fetchProfile());
    } catch {
      /* 取不到就保持原样 */
    }
  }, []);

  const replaceToken = useCallback(async (token: string) => {
    setAuthToken(token);
    await saveToken(token);
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<AuthState>(
    () => ({ status, profile, signIn, signOut, refreshProfile, setProfile: setProfileState, replaceToken, retry }),
    [status, profile, signIn, signOut, refreshProfile, replaceToken, retry],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return ctx;
}
