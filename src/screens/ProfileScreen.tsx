import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as driverApi from '../api/driver';
import { MANUAL_WORK_STATUSES } from '../api/types';
import type { ManualWorkStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import LangSwitch from '../components/LangSwitch';
import { WORK_TONE } from '../components/tones';
import type { Tone } from '../components/ui';
import { Button, Card, Header, InfoRow, Pill } from '../components/ui';
import { codeText, useI18n } from '../i18n';
import type { MessageKey } from '../i18n';
import type { AppStackParams } from '../navigation/types';
import { colors, font, radius, space } from '../theme';
import { errorText, isUnauthorized } from '../utils/errors';
import { formatClock } from '../utils/format';
import { useWork } from '../work/WorkContext';

/**
 * 我的：司机信息、绑定的车辆、工作状态、位置共享、语言、修改密码、退出登录。
 *
 * 位置共享这一块照实显示现在的状态：
 *   共享中   有进行中的任务，正在取位置、上报
 *   已暂停   允许了，但现在没有进行中的任务（或者刚回到前台还没开始）
 *   未授权   司机拒绝了
 *   未开启   还没有问过
 */
export default function ProfileScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { profile, setProfile, refreshProfile, signOut } = useAuth();
  const { permission, canAskAgain, sharing, lastSentAt, requestPermission, refreshSummary } = useWork();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const [switching, setSwitching] = useState<ManualWorkStatus | null>(null);
  const [leaving, setLeaving] = useState(false);

  // 每次回到这个页面都重新取一次：工作状态、绑定的车辆可能被后台改了
  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      void refreshSummary();
    }, [refreshProfile, refreshSummary]),
  );

  if (!profile) {
    return null;
  }

  const changeWork = async (next: ManualWorkStatus) => {
    if (switching || next === profile.workStatus) {
      return;
    }
    setSwitching(next);
    try {
      setProfile(await driverApi.changeWorkStatus(next));
    } catch (error) {
      if (!isUnauthorized(error)) {
        Alert.alert('', errorText(error, t));
        // 多半是手上有任务（后台不让切）：把最新的状态取回来
        void refreshProfile();
      }
    } finally {
      setSwitching(null);
    }
  };

  const confirmLogout = () => {
    Alert.alert('', t('profile.logoutAsk'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: () => {
          setLeaving(true);
          void signOut();
        },
      },
    ]);
  };

  let locationKey: MessageKey = 'profile.location.off';
  let locationTone: Tone = 'gray';
  if (permission === 'denied') {
    locationKey = 'profile.location.denied';
    locationTone = 'orange';
  } else if (permission === 'granted') {
    locationKey = sharing ? 'profile.location.sharing' : 'profile.location.paused';
    locationTone = sharing ? 'green' : 'gray';
  }
  // 系统还让再问就直接问；不让了（司机选过"不再询问"）只能去系统设置里开
  const needSettings = permission === 'denied' && !canAskAgain;
  const delivering = profile.workStatus === 'DELIVERING';

  return (
    <View style={styles.root}>
      <Header title={profile.driverName} subtitle={`${t('profile.code')} ${profile.driverCode}`} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space(8) }]}>
        <Card>
          <InfoRow label={t('profile.username')} value={profile.username} />
          <InfoRow label={t('profile.phone')} value={profile.phone} />
          <InfoRow label={t('profile.branch')} value={profile.orgName || '—'} />
          <InfoRow label={t('profile.area')} value={profile.areaName || '—'} />
          <InfoRow
            label={t('profile.vehicle')}
            value={profile.plateNo ? [profile.plateNo, profile.vehicleType].filter(Boolean).join(' · ') : t('profile.noVehicle')}
          />
        </Card>

        <Card>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{t('profile.workStatus')}</Text>
            <Pill text={codeText(t, 'workStatus', profile.workStatus)} tone={WORK_TONE[profile.workStatus] ?? 'gray'} />
          </View>
          <View style={styles.segments} accessibilityRole="radiogroup">
            {MANUAL_WORK_STATUSES.map((status) => {
              const selected = profile.workStatus === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => void changeWork(status)}
                  disabled={delivering || switching !== null}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: delivering }}
                  style={[styles.segment, selected && styles.segmentSelected, delivering && styles.segmentOff]}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={2}>
                    {codeText(t, 'workStatus', status)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{t('profile.workStatusHint')}</Text>
        </Card>

        <Card>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{t('profile.location')}</Text>
            <Pill text={t(locationKey)} tone={locationTone} />
          </View>
          <Text style={styles.hint}>{t('profile.location.note')}</Text>
          {permission === 'denied' && <Text style={styles.hint}>{t('profile.location.deniedHint')}</Text>}
          {permission === 'granted' && !!lastSentAt && (
            <Text style={styles.hint}>{t('profile.location.lastSent', { time: formatClock(lastSentAt) })}</Text>
          )}
          {permission !== 'granted' && (
            <Button
              title={needSettings ? t('profile.location.openSettings') : t('profile.location.enable')}
              kind="ghost"
              onPress={() => (needSettings ? void Linking.openSettings() : void requestPermission())}
              style={styles.cardButton}
            />
          )}
        </Card>

        <Card>
          <Text style={[styles.cardTitle, styles.cardTitleAlone]}>{t('common.language')}</Text>
          <LangSwitch />
        </Card>

        <Button title={t('profile.changePassword')} kind="ghost" onPress={() => navigation.navigate('ChangePassword')} />
        <Button title={t('profile.logout')} kind="danger" onPress={confirmLogout} loading={leaving} style={styles.logout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(4) },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2), marginBottom: space(3) },
  cardTitle: { flex: 1, color: colors.ink, fontSize: font.body, fontWeight: '700' },
  cardTitleAlone: { flex: 0, marginBottom: space(3) },
  cardButton: { marginTop: space(3) },
  hint: { color: colors.muted, fontSize: font.small + 1, lineHeight: 20, marginTop: space(1) },
  segments: { flexDirection: 'row', gap: space(2), marginBottom: space(2) },
  segment: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: space(1.5),
    paddingVertical: space(2),
  },
  segmentSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  segmentOff: { opacity: 0.5 },
  segmentText: { color: colors.ink2, fontSize: font.small + 1, textAlign: 'center' },
  segmentTextSelected: { color: colors.blue, fontWeight: '700' },
  logout: { marginTop: space(3) },
});
