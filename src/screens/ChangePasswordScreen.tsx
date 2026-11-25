import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import * as driverApi from '../api/driver';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Field, Header, Note } from '../components/ui';
import { useI18n } from '../i18n';
import type { ChangePasswordProps } from '../navigation/types';
import { colors, font, space } from '../theme';
import { errorText, isUnauthorized } from '../utils/errors';

/** 和后台一样的规则：至少 6 位、不含空格 */
const PASSWORD = /^\S{6,}$/;

/**
 * 修改登录密码。成功之后旧的登录令牌全部失效（其他手机上的登录会退出），
 * 后台同时发一个新的令牌给这台手机，所以这里不用重新登录。
 */
export default function ChangePasswordScreen({ navigation }: ChangePasswordProps) {
  const { t } = useI18n();
  const { replaceToken } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');

  let newError: string | undefined;
  if (!PASSWORD.test(newPassword)) {
    newError = t('password.invalid');
  } else if (newPassword === oldPassword) {
    newError = t('password.same');
  }
  const errors = {
    old: !oldPassword ? t('password.oldRequired') : undefined,
    next: newError,
    confirm: newPassword !== confirm ? t('password.mismatch') : undefined,
  };

  const submit = async () => {
    setSubmitted(true);
    setFailure('');
    if (errors.old || errors.next || errors.confirm) {
      return;
    }
    setLoading(true);
    try {
      const result = await driverApi.changePassword(oldPassword, newPassword);
      await replaceToken(result.token);
      Alert.alert('', t('password.changed'), [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
    } catch (error) {
      if (!isUnauthorized(error)) {
        setFailure(errorText(error, t));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={t('password.title')} onBack={() => navigation.goBack()} backLabel={t('common.back')} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card>
          <Field
            label={t('password.old')}
            value={oldPassword}
            onChangeText={setOldPassword}
            error={submitted ? errors.old : undefined}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
          />
          <Field
            label={t('password.new')}
            value={newPassword}
            onChangeText={setNewPassword}
            error={submitted ? errors.next : undefined}
            hint={t('password.hint')}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />
          <Field
            label={t('password.confirm')}
            value={confirm}
            onChangeText={setConfirm}
            error={submitted ? errors.confirm : undefined}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />
          {!!failure && (
            <Text style={styles.failure} accessibilityRole="alert">{failure}</Text>
          )}
          <Button title={t('password.submit')} kind="success" onPress={() => void submit()} loading={loading} />
        </Card>
        <Note text={t('password.tip')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(4), paddingBottom: space(10) },
  failure: { color: colors.red, fontSize: font.body - 1, lineHeight: 21, marginBottom: space(3) },
});
