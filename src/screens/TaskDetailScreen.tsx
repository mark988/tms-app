import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as driverApi from '../api/driver';
import { EXCEPTION_TYPES } from '../api/types';
import type { ExceptionType, Task, TaskDetail } from '../api/types';
import { taskTone } from '../components/tones';
import { Button, Card, Field, Header, InfoRow, Note, OptionRow, Pill, Sheet } from '../components/ui';
import { codeText, useI18n } from '../i18n';
import type { TaskDetailProps } from '../navigation/types';
import { colors, font, space } from '../theme';
import { errorText, isTaskChanged, isTaskGone, isUnauthorized } from '../utils/errors';
import { formatDateTime, formatMoney, formatWeight } from '../utils/format';
import { useWork } from '../work/WorkContext';

/** 手机最近一次知道的位置（马上返回，不等定位）；没有权限、拿不到都返回空。 */
async function lastPosition(granted: boolean): Promise<{ lat?: number; lng?: number }> {
  if (!granted) {
    return {};
  }
  try {
    const position = await Location.getLastKnownPositionAsync();
    return position ? { lat: position.coords.latitude, lng: position.coords.longitude } : {};
  } catch {
    return {};
  }
}

/**
 * 任务详情：收件信息、代收货款、配送进度，以及这个状态下能做的操作。
 *
 *   待接单 → 接受任务 → 已接单 → 开始配送 → 配送中 → 签收 → 已签收
 *   已接单、配送中时可以上报异常（之后等后台处理）
 *
 * 每个操作成功后，后台直接返回最新的任务，页面用它刷新。
 * 任务被改派、被取消了（或者连点了两次），后台会拒绝并告诉 App"状态已变化"，这里提示之后重新加载。
 */
export default function TaskDetailScreen({ navigation, route }: TaskDetailProps) {
  const { id } = route.params;
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { permission, requestPermission, refreshSummary } = useWork();
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [acting, setActing] = useState(false);
  // 签收
  const [signOpen, setSignOpen] = useState(false);
  const [signer, setSigner] = useState('');
  const [signRemark, setSignRemark] = useState('');
  const [signTried, setSignTried] = useState(false);
  // 上报异常
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionType, setExceptionType] = useState<ExceptionType | null>(null);
  const [exceptionRemark, setExceptionRemark] = useState('');
  const [exceptionTried, setExceptionTried] = useState(false);

  /** 任务已经不归这名司机：提示一下，回到列表。 */
  const leaveBecauseGone = useCallback(() => {
    Alert.alert('', t('error.taskGone'), [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
  }, [navigation, t]);

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        setDetail(await driverApi.fetchTask(id));
        setFailure('');
      } catch (error) {
        if (isTaskGone(error)) {
          leaveBecauseGone();
        } else if (!silent && !isUnauthorized(error)) {
          setFailure(errorText(error, t));
        }
      } finally {
        setLoading(false);
      }
    },
    [id, leaveBecauseGone, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  /**
   * 执行一个操作。成功：用返回的任务刷新页面，并刷新任务数字。
   * 失败：状态已变化就提示后重新加载；任务没了就回列表；其余的弹出原因。
   */
  const run = async (action: () => Promise<TaskDetail>, okText: string): Promise<boolean> => {
    setActing(true);
    try {
      setDetail(await action());
      void refreshSummary();
      Alert.alert('', okText);
      return true;
    } catch (error) {
      if (isTaskGone(error)) {
        leaveBecauseGone();
      } else if (!isUnauthorized(error)) {
        Alert.alert('', errorText(error, t));
        if (isTaskChanged(error)) {
          void load(true);
          void refreshSummary();
        }
      }
      return false;
    } finally {
      setActing(false);
    }
  };

  const accept = async () => {
    const ok = await run(() => driverApi.acceptTask(id), t('detail.acceptOk'));
    // 第一次接单时问一下位置权限：先说明用途，再弹系统的询问框。拒绝了也不影响配送
    if (ok && permission === 'unknown') {
      Alert.alert(t('profile.location'), t('detail.locationAsk'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.ok'), onPress: () => void requestPermission() },
      ]);
    }
  };

  const depart = () => void run(() => driverApi.departTask(id), t('detail.departOk'));

  const openSign = (task: Task) => {
    setSigner(task.receiverName);
    setSignRemark('');
    setSignTried(false);
    setSignOpen(true);
  };

  const submitSign = async () => {
    setSignTried(true);
    if (!signer.trim()) {
      return;
    }
    const position = await lastPosition(permission === 'granted');
    const ok = await run(
      () => driverApi.signTask(id, { signerName: signer.trim(), remark: signRemark.trim() || undefined, ...position }),
      t('detail.signOk'),
    );
    if (ok) {
      setSignOpen(false);
    }
  };

  const openException = () => {
    setExceptionType(null);
    setExceptionRemark('');
    setExceptionTried(false);
    setExceptionOpen(true);
  };

  const submitException = async () => {
    setExceptionTried(true);
    if (!exceptionType) {
      return;
    }
    const position = await lastPosition(permission === 'granted');
    const ok = await run(
      () =>
        driverApi.reportTaskException(id, {
          exceptionType,
          remark: exceptionRemark.trim() || undefined,
          ...position,
        }),
      t('detail.exceptionOk'),
    );
    if (ok) {
      setExceptionOpen(false);
    }
  };

  const call = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => Alert.alert('', t('detail.cannotCall')));
  };

  /** 交给手机上的地图 App：有坐标用坐标，没有就用地址。 */
  const navigateTo = (task: Task) => {
    const destination =
      task.receiverLat !== null && task.receiverLng !== null
        ? `${task.receiverLat},${task.receiverLng}`
        : task.receiverAddress;
    const encoded = encodeURIComponent(destination);
    const primary =
      Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${encoded}` : `geo:0,0?q=${encoded}`;
    const fallback = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    Linking.openURL(primary)
      .catch(() => Linking.openURL(fallback))
      .catch(() => Alert.alert('', t('detail.cannotNavigate')));
  };

  const task = detail?.task ?? null;
  const cod = task ? Number(task.codAmount) : 0;

  let actions: ReactNode = null;
  if (task?.status === 'ASSIGNED') {
    actions = <Button title={t('detail.accept')} onPress={() => void accept()} loading={acting} />;
  } else if (task?.status === 'ACCEPTED') {
    actions = (
      <>
        <Button title={t('detail.depart')} onPress={depart} loading={acting} />
        <Button title={t('detail.reportException')} kind="danger" onPress={openException} disabled={acting} style={styles.second} />
      </>
    );
  } else if (task?.status === 'IN_TRANSIT') {
    actions = (
      <>
        <Button title={t('detail.sign')} kind="success" onPress={() => openSign(task)} disabled={acting} />
        <Button title={t('detail.reportException')} kind="danger" onPress={openException} disabled={acting} style={styles.second} />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <Header
        title={t('detail.title')}
        subtitle={task?.waybillNo}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      {loading && !task && <ActivityIndicator style={styles.spinner} color={colors.blue} />}
      {!loading && !task && !!failure && (
        <View style={styles.failure}>
          <Text style={styles.failureText}>{failure}</Text>
          <Button title={t('common.retry')} kind="ghost" onPress={() => void load(false)} style={styles.second} />
        </View>
      )}

      {task && (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space(6) }]}>
          <Card>
            <View style={styles.head}>
              <Text style={styles.no} selectable>{task.waybillNo}</Text>
              <Pill text={codeText(t, 'status', task.status)} tone={taskTone(task.status)} />
            </View>
            <InfoRow label={t('detail.receiver')} value={task.receiverName} strong />
            <InfoRow label={t('detail.phone')} value={task.receiverPhone} />
            <InfoRow label={t('detail.address')} value={task.receiverAddress} />
            {!!task.areaName && <InfoRow label={t('detail.area')} value={task.areaName} />}
            <View style={styles.quick}>
              <Button title={t('detail.call')} kind="ghost" onPress={() => call(task.receiverPhone)} style={styles.quickButton} />
              <Button title={t('detail.navigate')} kind="ghost" onPress={() => navigateTo(task)} style={styles.quickButton} />
            </View>
          </Card>

          {cod > 0 && (
            <Card style={styles.cod}>
              <Text style={styles.codLabel}>{t('detail.cod')}</Text>
              <Text style={styles.codValue}>{formatMoney(cod)}</Text>
              <Text style={styles.codHint}>{t('detail.codHint')}</Text>
            </Card>
          )}

          {task.status === 'EXCEPTION' && (
            <>
              <Note text={t('detail.exceptionNote')} tone="warn" />
              <Card>
                <InfoRow
                  label={t('detail.exceptionType')}
                  value={task.exceptionType ? codeText(t, 'exceptionType', task.exceptionType) : '—'}
                  strong
                />
                {!!task.exceptionRemark && <InfoRow label={t('detail.exceptionRemark')} value={task.exceptionRemark} />}
              </Card>
            </>
          )}
          {task.status === 'CANCELLED' && <Note text={t('detail.cancelledNote')} tone="warn" />}
          {task.status === 'SIGNED' && (
            <>
              <Note text={t('detail.signedNote')} />
              <Card>
                <InfoRow label={t('detail.signer')} value={task.signerName || '—'} strong />
                {!!task.signRemark && <InfoRow label={t('detail.signRemark')} value={task.signRemark} />}
              </Card>
            </>
          )}

          <Card>
            <InfoRow label={t('detail.packages')} value={String(task.packageCount)} />
            {task.weightKg !== null && <InfoRow label={t('detail.weight')} value={formatWeight(task.weightKg)} />}
            {!!task.goodsDesc && <InfoRow label={t('detail.goods')} value={task.goodsDesc} />}
            <InfoRow label={t('detail.expected')} value={formatDateTime(task.expectedAt)} />
            {!!task.senderName && <InfoRow label={t('detail.sender')} value={`${task.senderName} ${task.senderPhone}`.trim()} />}
            {!!task.senderAddress && <InfoRow label={t('detail.senderAddress')} value={task.senderAddress} />}
            {!!task.remark && <InfoRow label={t('detail.remark')} value={task.remark} />}
          </Card>

          {actions && <View style={styles.actions}>{actions}</View>}

          <Card>
            <Text style={styles.sectionTitle}>{t('detail.timeline')}</Text>
            {(detail?.tracks ?? []).map((track, index, all) => {
              // 上报异常的那一步，后面接上异常类型；content 是数据（司机姓名、签收人、原因），原样显示
              const extra = [track.refCode ? codeText(t, 'exceptionType', track.refCode) : '', track.content]
                .filter(Boolean)
                .join(' · ');
              return (
                <View key={`${track.createdAt}-${index}`} style={styles.event}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, index === all.length - 1 && styles.dotCurrent]} />
                    {index < all.length - 1 && <View style={styles.line} />}
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{codeText(t, 'track', track.action)}</Text>
                    {!!extra && <Text style={styles.eventExtra}>{extra}</Text>}
                    <Text style={styles.eventTime}>{formatDateTime(track.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </ScrollView>
      )}

      <Sheet visible={signOpen} title={t('sign.title')} onClose={() => setSignOpen(false)} closeLabel={t('common.close')}>
        {cod > 0 && <Note text={t('sign.codConfirm', { amount: formatMoney(cod) })} tone="warn" />}
        <Field
          label={t('sign.signer')}
          value={signer}
          onChangeText={setSigner}
          hint={t('sign.signerHint')}
          error={signTried && !signer.trim() ? t('sign.signerRequired') : undefined}
          autoCapitalize="words"
          maxLength={100}
        />
        <Field
          label={`${t('sign.remark')}（${t('common.optional')}）`}
          value={signRemark}
          onChangeText={setSignRemark}
          maxLength={300}
          multiline
        />
        <Button title={t('sign.submit')} kind="success" onPress={() => void submitSign()} loading={acting} />
      </Sheet>

      <Sheet
        visible={exceptionOpen}
        title={t('exception.title')}
        onClose={() => setExceptionOpen(false)}
        closeLabel={t('common.close')}
      >
        <Note text={t('exception.warn')} tone="warn" />
        <Text style={styles.sheetLabel}>{t('exception.type')}</Text>
        {EXCEPTION_TYPES.map((type) => (
          <OptionRow
            key={type}
            title={codeText(t, 'exceptionType', type)}
            selected={exceptionType === type}
            onPress={() => setExceptionType(type)}
          />
        ))}
        {exceptionTried && !exceptionType && <Text style={styles.sheetError}>{t('exception.typeRequired')}</Text>}
        <View style={styles.sheetGap} />
        <Field
          label={`${t('exception.remark')}（${t('common.optional')}）`}
          value={exceptionRemark}
          onChangeText={setExceptionRemark}
          maxLength={300}
          multiline
        />
        <Button title={t('exception.submit')} onPress={() => void submitException()} loading={acting} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  spinner: { marginTop: space(12) },
  failure: { padding: space(6), paddingTop: space(12) },
  failureText: { color: colors.ink2, fontSize: font.body, textAlign: 'center', lineHeight: 22 },
  body: { padding: space(4) },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2), marginBottom: space(2) },
  no: { flex: 1, color: colors.ink, fontSize: font.body, fontWeight: '700' },
  quick: { flexDirection: 'row', gap: space(3), marginTop: space(3) },
  quickButton: { flex: 1 },

  cod: { borderColor: '#f1dfb9', backgroundColor: '#fff8e9' },
  codLabel: { color: '#6f4d14', fontSize: font.small + 1 },
  codValue: { color: '#6f4d14', fontSize: 28, fontWeight: '700', marginVertical: 2 },
  codHint: { color: '#6f4d14', fontSize: font.small + 1 },

  actions: { marginBottom: space(3) },
  second: { marginTop: space(3) },

  sectionTitle: { color: colors.ink, fontSize: font.body, fontWeight: '700', marginBottom: space(3) },
  event: { flexDirection: 'row' },
  rail: { width: 22, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#b8c6d8', marginTop: 5 },
  dotCurrent: { backgroundColor: colors.blue },
  line: { flex: 1, width: 2, backgroundColor: '#d8e3f0', marginTop: 2 },
  eventBody: { flex: 1, paddingBottom: space(4) },
  eventTitle: { color: colors.ink, fontSize: font.body - 1, fontWeight: '700', lineHeight: 20 },
  eventExtra: { color: colors.ink2, fontSize: font.small + 1, lineHeight: 19, marginTop: 2 },
  eventTime: { color: colors.muted, fontSize: font.small, marginTop: 2 },

  sheetLabel: { color: colors.ink2, fontSize: font.small + 1, marginBottom: space(2) },
  sheetError: { color: colors.red, fontSize: font.small, marginBottom: space(2) },
  sheetGap: { height: space(2) },
});
