import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as driverApi from '../api/driver';
import type { AreaOption } from '../api/types';
import LangSwitch from '../components/LangSwitch';
import { Button, Card, Field, Header, Note, OptionRow, Sheet } from '../components/ui';
import { useI18n } from '../i18n';
import type { RegisterProps } from '../navigation/types';
import { colors, font, radius, space } from '../theme';
import { errorText } from '../utils/errors';

/** 和后台一样的规则：登录账号字母开头、3–32 位；密码至少 6 位、不含空格；电话 6–20 位数字 */
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{2,31}$/;
const PASSWORD = /^\S{6,}$/;
const validPhone = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length >= 6 && digits.length <= 20;
};

/**
 * 注册配送员账号。提交之后是"待审核"，管理员在后台审核通过才能登录。
 * 配送区域从后台取（只有启用的区域），司机归属负责这个区域的网点。
 */
export default function RegisterScreen({ navigation }: RegisterProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [area, setArea] = useState<AreaOption | null>(null);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [areasState, setAreasState] = useState<'loading' | 'ok' | 'failed'>('loading');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');

  const loadAreas = useCallback(() => {
    setAreasState('loading');
    driverApi
      .fetchAreas()
      .then((list) => {
        setAreas(list);
        setAreasState('ok');
      })
      .catch(() => setAreasState('failed'));
  }, []);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  // 提交过一次之后才显示各项的校验提示，免得一打开页面就是一片红
  const errors = {
    name: !name.trim() ? t('register.nameRequired') : undefined,
    phone: !validPhone(phone) ? t('register.phoneInvalid') : undefined,
    username: !USERNAME.test(username.trim()) ? t('register.usernameInvalid') : undefined,
    password: !PASSWORD.test(password) ? t('register.passwordInvalid') : undefined,
    password2: password !== password2 ? t('register.passwordMismatch') : undefined,
    area: !area ? t('register.areaRequired') : undefined,
  };
  const show = <K extends keyof typeof errors>(key: K) => (submitted ? errors[key] : undefined);

  const submit = async () => {
    setSubmitted(true);
    setFailure('');
    if (!area || Object.values(errors).some(Boolean)) {
      return;
    }
    setLoading(true);
    try {
      const result = await driverApi.register({
        driverName: name.trim(),
        phone: phone.trim(),
        username: username.trim(),
        password,
        areaId: area.id,
      });
      Alert.alert(t('register.doneTitle'), t('register.doneText', { code: result.driverCode }), [
        { text: t('common.ok'), onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      setFailure(errorText(error, t));
    } finally {
      setLoading(false);
    }
  };

  let areaText = t('register.areaPlaceholder');
  if (area) {
    areaText = `${area.areaName} · ${area.orgName}`;
  } else if (areasState === 'loading') {
    areaText = t('common.loading');
  } else if (areasState === 'failed') {
    areaText = t('register.areasFailed');
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title={t('register.title')}
        subtitle={t('register.subtitle')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      >
        <View style={styles.lang}>
          <LangSwitch onDark />
        </View>
      </Header>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label={t('register.name')} value={name} onChangeText={setName} error={show('name')} autoCapitalize="words" />
          <Field
            label={t('register.phone')}
            value={phone}
            onChangeText={setPhone}
            error={show('phone')}
            keyboardType="phone-pad"
            placeholder="09-xxxxxxxxx"
          />
          <Field
            label={t('register.username')}
            value={username}
            onChangeText={setUsername}
            error={show('username')}
            hint={t('register.usernameHint')}
            autoComplete="username-new"
          />
          <Field
            label={t('register.password')}
            value={password}
            onChangeText={setPassword}
            error={show('password')}
            hint={t('register.passwordHint')}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />
          <Field
            label={t('register.password2')}
            value={password2}
            onChangeText={setPassword2}
            error={show('password2')}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />

          <Text style={styles.label}>{t('register.area')}</Text>
          <Pressable
            onPress={() => (areasState === 'failed' ? loadAreas() : setPickerOpen(true))}
            disabled={areasState === 'loading'}
            accessibilityRole="button"
            accessibilityLabel={t('register.area')}
            style={[styles.select, !!show('area') && styles.selectError]}
          >
            <Text style={[styles.selectText, !area && styles.selectPlaceholder]} numberOfLines={2}>{areaText}</Text>
            <Text style={styles.selectCaret}>▾</Text>
          </Pressable>
          {!!show('area') && <Text style={styles.error}>{show('area')}</Text>}

          {!!failure && (
            <Text style={styles.failure} accessibilityRole="alert">{failure}</Text>
          )}
          <Button title={t('register.submit')} onPress={() => void submit()} loading={loading} style={styles.submit} />
        </Card>
        <Note text={t('login.rule')} />
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="link" style={styles.link}>
          <Text style={styles.linkText}>{t('register.toLogin')}</Text>
        </Pressable>
      </ScrollView>

      <Sheet
        visible={pickerOpen}
        title={t('register.area')}
        onClose={() => setPickerOpen(false)}
        closeLabel={t('common.close')}
      >
        {areas.length === 0 && <Note text={t('register.noAreas')} tone="warn" />}
        {areas.map((item) => (
          <OptionRow
            key={item.id}
            title={item.areaName}
            subtitle={item.orgName}
            selected={area?.id === item.id}
            onPress={() => {
              setArea(item);
              setPickerOpen(false);
            }}
          />
        ))}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  lang: { marginTop: space(4) },
  body: { padding: space(4), paddingBottom: space(10) },
  label: { color: colors.ink2, fontSize: font.small + 1, marginBottom: space(1.5) },
  select: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
  },
  selectError: { borderColor: colors.red },
  selectText: { flex: 1, color: colors.ink, fontSize: font.body + 1 },
  selectPlaceholder: { color: colors.muted },
  selectCaret: { color: colors.muted, fontSize: font.body, marginLeft: space(2) },
  error: { color: colors.red, fontSize: font.small, marginTop: space(1) },
  failure: { color: colors.red, fontSize: font.body - 1, lineHeight: 21, marginTop: space(4) },
  submit: { marginTop: space(4) },
  link: { alignItems: 'center', paddingVertical: space(3) },
  linkText: { color: colors.blue, fontSize: font.body, fontWeight: '600' },
});
