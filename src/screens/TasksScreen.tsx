import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as driverApi from '../api/driver';
import type { Task } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { taskTone } from '../components/tones';
import { Button, Header, Pill } from '../components/ui';
import { REFRESH_INTERVAL_MS } from '../config';
import { codeText, useI18n } from '../i18n';
import type { AppStackParams } from '../navigation/types';
import { colors, font, radius, space } from '../theme';
import { errorText, isUnauthorized } from '../utils/errors';
import { formatMoney, formatShort } from '../utils/format';
import { useWork } from '../work/WorkContext';

type Tab = 'TODO' | 'DONE';

const PAGE_SIZE = 20;

/**
 * 我的配送任务：顶部是今天的几个数字，下面分「进行中」「已结束」两个页签。
 * 下拉可以刷新，滑到底自动加载下一页；页面在前台时每 30 秒自己刷新一次（只在还停在第一页时刷新列表，免得看到一半跳走）。
 */
export default function TasksScreen() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { summary, refreshSummary } = useWork();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const [tab, setTab] = useState<Tab>('TODO');
  const [items, setItems] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failure, setFailure] = useState('');
  // 每发一次"第一页"的请求加 1：换了页签之后，上一个页签晚到的结果不能再用
  const seqRef = useRef(0);
  const pageRef = useRef(1);
  const hasItemsRef = useRef(false);

  const loadFirst = useCallback(
    async (how: 'initial' | 'pull' | 'silent') => {
      const seq = ++seqRef.current;
      if (how === 'initial') {
        setLoading(true);
      } else if (how === 'pull') {
        setRefreshing(true);
      }
      try {
        const result = await driverApi.fetchTasks(tab, 1, PAGE_SIZE);
        if (seq !== seqRef.current) {
          return;
        }
        setItems(result.records);
        setTotal(result.total);
        pageRef.current = 1;
        hasItemsRef.current = result.records.length > 0;
        setFailure('');
      } catch (error) {
        // 自己定时刷新失败了不打扰人；登录失效的话请求层已经把人送回登录页
        if (seq === seqRef.current && how !== 'silent' && !isUnauthorized(error)) {
          setFailure(errorText(error, t));
        }
      } finally {
        if (seq === seqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [tab, t],
  );

  // 进入页面（包括从任务详情返回）、换页签时加载；之后每 30 秒刷新一次
  useFocusEffect(
    useCallback(() => {
      void loadFirst(hasItemsRef.current ? 'silent' : 'initial');
      void refreshSummary();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active' && pageRef.current === 1) {
          void loadFirst('silent');
        }
      }, REFRESH_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [loadFirst, refreshSummary]),
  );

  const switchTab = (next: Tab) => {
    if (next === tab) {
      return;
    }
    hasItemsRef.current = false;
    setItems([]);
    setTotal(0);
    setFailure('');
    setLoading(true);
    setTab(next);
  };

  const loadMore = async () => {
    if (loading || refreshing || loadingMore || items.length >= total) {
      return;
    }
    const seq = seqRef.current;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const result = await driverApi.fetchTasks(tab, next, PAGE_SIZE);
      if (seq !== seqRef.current) {
        return;
      }
      // 两次请求之间列表可能变了（有任务换了状态），同一个任务只留一份
      setItems((prev) => {
        const seen = new Set(prev.map((task) => task.id));
        return [...prev, ...result.records.filter((task) => !seen.has(task.id))];
      });
      setTotal(result.total);
      pageRef.current = next;
    } catch {
      /* 下一页没取到：再往下滑会重试 */
    } finally {
      setLoadingMore(false);
    }
  };

  const pull = () => {
    void loadFirst('pull');
    void refreshSummary();
  };

  const renderItem = ({ item }: { item: Task }) => {
    const meta = [t('tasks.packages', { n: item.packageCount })];
    if (item.expectedAt && (item.status === 'ASSIGNED' || item.status === 'ACCEPTED' || item.status === 'IN_TRANSIT')) {
      meta.push(t('tasks.expected', { time: formatShort(item.expectedAt) }));
    }
    return (
      <Pressable
        onPress={() => navigation.navigate('TaskDetail', { id: item.id })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.task, pressed && styles.pressed]}
      >
        <View style={styles.taskHead}>
          <Text style={styles.taskNo} numberOfLines={1}>{item.waybillNo}</Text>
          <Pill text={codeText(t, 'status', item.status)} tone={taskTone(item.status)} />
        </View>
        <Text style={styles.taskReceiver} numberOfLines={1}>
          {item.receiverName}　{item.receiverPhone}
        </Text>
        <Text style={styles.taskAddress} numberOfLines={2}>{item.receiverAddress}</Text>
        <View style={styles.taskFoot}>
          <Text style={styles.taskMeta} numberOfLines={1}>{meta.join(' · ')}</Text>
          {Number(item.codAmount) > 0 && (
            <Text style={styles.taskCod}>{t('tasks.cod', { amount: formatMoney(item.codAmount) })}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  const empty = loading ? (
    <ActivityIndicator style={styles.spinner} color={colors.blue} />
  ) : failure ? (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{failure}</Text>
      <Button title={t('common.retry')} kind="ghost" onPress={() => void loadFirst('initial')} style={styles.retry} />
    </View>
  ) : (
    <View style={styles.empty}>
      <Text style={styles.emptyGlyph}>📦</Text>
      <Text style={styles.emptyTitle}>{tab === 'TODO' ? t('tasks.empty.todo') : t('tasks.empty.done')}</Text>
      {tab === 'TODO' && <Text style={styles.emptyHint}>{t('tasks.empty.todoHint')}</Text>}
    </View>
  );

  // FlatList 的 ListFooterComponent 只收"一个元素或者 null"，所以这里不能标成 ReactNode
  let footer: ReactElement | null = null;
  if (loadingMore) {
    footer = <ActivityIndicator style={styles.footer} color={colors.blue} />;
  } else if (items.length > 0 && items.length >= total) {
    footer = <Text style={styles.footerText}>{t('tasks.noMore')}</Text>;
  }

  const numbers: { label: string; value: number | undefined }[] = [
    { label: t('tasks.summary.total'), value: summary?.total },
    { label: t('tasks.summary.toAccept'), value: summary?.toAccept },
    { label: t('tasks.summary.inTransit'), value: summary?.inTransit },
    { label: t('tasks.summary.signed'), value: summary?.signedToday },
  ];

  return (
    <View style={styles.root}>
      <Header title={t('tasks.title')} subtitle={t('tasks.greeting', { name: profile?.driverName ?? '' })}>
        <View style={styles.strip}>
          {numbers.map((item) => (
            <View key={item.label} style={styles.stripItem}>
              <Text style={styles.stripValue}>{item.value ?? '–'}</Text>
              <Text style={styles.stripLabel} numberOfLines={2}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Header>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(['TODO', 'DONE'] as Tab[]).map((key) => {
          const selected = key === tab;
          return (
            <Pressable
              key={key}
              onPress={() => switchTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                {key === 'TODO' ? t('tasks.tab.todo') : t('tasks.tab.done')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.blue} colors={[colors.blue]} />}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  strip: { flexDirection: 'row', gap: space(2), marginTop: space(4) },
  stripItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    paddingVertical: space(2),
    paddingHorizontal: space(1),
  },
  stripValue: { color: colors.white, fontSize: font.large - 2, fontWeight: '700' },
  stripLabel: { color: colors.onNavyMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },

  tabs: {
    flexDirection: 'row',
    gap: space(1.5),
    margin: space(4),
    marginBottom: 0,
    padding: space(1.5),
    borderRadius: radius.md,
    backgroundColor: '#e9eef5',
  },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  tabSelected: { backgroundColor: colors.white },
  tabText: { color: colors.ink2, fontSize: font.body },
  tabTextSelected: { color: colors.blue, fontWeight: '700' },

  list: { padding: space(4), paddingBottom: space(8), flexGrow: 1 },
  task: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(4),
    marginBottom: space(3),
  },
  pressed: { opacity: 0.75 },
  taskHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2) },
  taskNo: { flex: 1, color: colors.ink, fontSize: font.body - 1, fontWeight: '700' },
  taskReceiver: { color: colors.ink, fontSize: font.body + 1, marginTop: space(2.5) },
  taskAddress: { color: colors.ink2, fontSize: font.body - 1, lineHeight: 21, marginTop: space(1) },
  taskFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2), marginTop: space(2.5) },
  taskMeta: { flex: 1, color: colors.muted, fontSize: font.small + 1 },
  taskCod: { color: colors.orange, fontSize: font.small + 1, fontWeight: '700' },

  spinner: { marginTop: space(12) },
  empty: { alignItems: 'center', paddingTop: space(12), paddingHorizontal: space(6) },
  emptyGlyph: { fontSize: 34, marginBottom: space(2) },
  emptyTitle: { color: colors.ink2, fontSize: font.body, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  emptyHint: { color: colors.muted, fontSize: font.small + 1, textAlign: 'center', marginTop: space(1.5), lineHeight: 20 },
  retry: { marginTop: space(4), alignSelf: 'stretch' },
  footer: { marginVertical: space(4) },
  footerText: { color: colors.muted, fontSize: font.small, textAlign: 'center', marginVertical: space(3) },
});
