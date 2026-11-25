import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as driverApi from '../api/driver';
import type { LocationPoint, TaskSummary } from '../api/types';
import { LOCATION_INTERVAL_MS, REFRESH_INTERVAL_MS } from '../config';

/*
 * 司机"正在干活"时要一直保持的两件事（只在登录之后挂载）：
 *
 * 1. 任务数字：待接单、配送中、今日已签收…… App 在前台时每 30 秒刷新一次，接单、签收之后马上刷新。
 *
 * 2. 位置上报（V1.0 只做前台定位）：
 *    司机允许 App "使用期间"获取位置、手上有已接单或配送中的任务、并且 App 打开在前台——三样都满足时才取位置，
 *    攒着一批一批报给后台；报失败的留着下次再发（最多留 200 个，再多就丢掉最早的）。
 *    App 切到后台或者手机锁屏之后不取、不报。后台 / 锁屏定位需要"始终允许"的权限、安卓的前台服务和
 *    两个应用商店的专门申报，这一版没有做。界面上的"位置共享"状态要照实反映这一点。
 */

/** unknown 还没问过；granted 允许了；denied 拒绝了 */
export type LocationPermission = 'unknown' | 'granted' | 'denied';

interface WorkState {
  /** 任务数字；还没取到时为 null */
  summary: TaskSummary | null;
  refreshSummary: () => Promise<void>;
  permission: LocationPermission;
  /** 拒绝之后系统还让不让再弹一次询问；不让的话只能去系统设置里开 */
  canAskAgain: boolean;
  /** 现在是不是真的在取位置、上报 */
  sharing: boolean;
  /** 最近一次成功报给后台的时间（ISO 格式）；还没有报过时为 null */
  lastSentAt: string | null;
  /** 向司机要位置权限（弹系统的询问框）。返回要到了没有 */
  requestPermission: () => Promise<boolean>;
}

const WorkContext = createContext<WorkState | null>(null);

/** 一次最多报多少个点（后台的上限是 100） */
const BATCH_SIZE = 50;
/** 报不出去时最多留多少个点 */
const MAX_QUEUE = 200;

const finite = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

function toPoint(location: Location.LocationObject): LocationPoint {
  const { latitude, longitude, accuracy, speed, heading } = location.coords;
  return {
    lat: latitude,
    lng: longitude,
    accuracy: finite(accuracy),
    speed: finite(speed),
    heading: finite(heading),
    recordedAt: new Date(location.timestamp || Date.now()).toISOString(),
  };
}

export function WorkProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [watching, setWatching] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const queueRef = useRef<LocationPoint[]>([]);
  const flushingRef = useRef(false);

  // ---------------------------------------------------------------- App 在前台还是后台

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  // ---------------------------------------------------------------- 任务数字

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await driverApi.fetchSummary());
    } catch {
      /* 取不到就保持原样；登录失效的话请求层会把人送回登录页 */
    }
  }, []);

  useEffect(() => {
    if (!appActive) {
      return undefined;
    }
    void refreshSummary();
    const timer = setInterval(() => void refreshSummary(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [appActive, refreshSummary]);

  // ---------------------------------------------------------------- 位置权限

  const applyPermission = useCallback((response: Location.LocationPermissionResponse) => {
    setCanAskAgain(response.canAskAgain);
    if (response.granted) {
      setPermission('granted');
    } else {
      // 还没问过和已经拒绝了，系统给的都是"没有允许"；能不能再问看 canAskAgain
      setPermission(response.status === Location.PermissionStatus.UNDETERMINED ? 'unknown' : 'denied');
    }
    return response.granted;
  }, []);

  // 回到前台时重新看一眼：司机可能刚去系统设置里改了权限
  useEffect(() => {
    if (!appActive) {
      return;
    }
    Location.getForegroundPermissionsAsync()
      .then(applyPermission)
      .catch(() => undefined);
  }, [appActive, applyPermission]);

  const requestPermission = useCallback(async () => {
    try {
      return applyPermission(await Location.requestForegroundPermissionsAsync());
    } catch {
      return false;
    }
  }, [applyPermission]);

  // ---------------------------------------------------------------- 取位置、上报

  /** 把攒着的点报给后台。报不出去的放回去，下次再发。 */
  const flush = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0) {
      return;
    }
    flushingRef.current = true;
    const batch = queueRef.current.splice(0, BATCH_SIZE);
    try {
      await driverApi.reportLocation(batch);
      setLastSentAt(new Date().toISOString());
    } catch {
      queueRef.current = [...batch, ...queueRef.current].slice(-MAX_QUEUE);
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const activeTasks = (summary?.accepted ?? 0) + (summary?.inTransit ?? 0);
  const shouldWatch = permission === 'granted' && appActive && activeTasks > 0;

  useEffect(() => {
    if (!shouldWatch) {
      return undefined;
    }
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      // 每隔一段时间、或者移动了一段距离取一次；精度用"均衡"，省电
      { accuracy: Location.Accuracy.Balanced, timeInterval: LOCATION_INTERVAL_MS, distanceInterval: 30 },
      (location) => {
        queueRef.current = [...queueRef.current, toPoint(location)].slice(-MAX_QUEUE);
        void flush();
      },
    )
      .then((created) => {
        if (cancelled) {
          created.remove();
        } else {
          subscription = created;
          setWatching(true);
        }
      })
      .catch(() => undefined);

    // 隔一会儿再试着发一次：上次没发出去的（网络不好）靠它补发
    const timer = setInterval(() => void flush(), LOCATION_INTERVAL_MS);
    return () => {
      cancelled = true;
      subscription?.remove();
      clearInterval(timer);
      setWatching(false);
      // 停下来之前把手上的发掉
      void flush();
    };
  }, [shouldWatch, flush]);

  const value = useMemo<WorkState>(
    () => ({
      summary,
      refreshSummary,
      permission,
      canAskAgain,
      sharing: shouldWatch && watching,
      lastSentAt,
      requestPermission,
    }),
    [summary, refreshSummary, permission, canAskAgain, shouldWatch, watching, lastSentAt, requestPermission],
  );
  return <WorkContext.Provider value={value}>{children}</WorkContext.Provider>;
}

export function useWork(): WorkState {
  const ctx = useContext(WorkContext);
  if (!ctx) {
    throw new Error('useWork 必须在 WorkProvider 内使用');
  }
  return ctx;
}
