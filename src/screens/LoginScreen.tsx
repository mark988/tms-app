import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import LangSwitch from '../components/LangSwitch';
import { Button, Card, Field, Header, Note } from '../components/ui';
import { useI18n } from '../i18n';
import type { LoginProps } from '../navigation/types';
import { colors, font, space } from '../theme';
import { errorText } from '../utils/errors';

/**
 * 登录。可以用登录账号，也可以用手机号。
 * 账号在审核中、审核没通过、被停用、被锁定，后台各有固定的错误码，这里按码显示当前语言的提示。
 */
export default function LoginScreen({ navigation }: LoginProps) {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');

  const accountError = submitted && !account.trim() ? t('login.accountRequired') : undefined;
  const passwordError = submitted && !password ? t('login.passwordRequired') : undefined;

  const submit = async () => {
    setSubmitted(true);
    setFailure('');
    if (!account.trim() || !password) {
      return;
    }
    setLoading(true);
    try {
      // 登录成功后登录状态一变，导航会自动换到任务页面
      await signIn(account.trim(), password);
    } catch (error) {
      setFailure(errorText(error, t));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={t('login.title')} subtitle={t('login.subtitle')}>
        <View style={styles.lang}>
          <LangSwitch onDark />
        </View>
      </Header>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.tagline}>{t('app.tagline')}</Text>
        <Card>
          <Field
            label={t('login.account')}
            value={account}
            onChangeText={setAccount}
            error={accountError}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
          />
          <Field
            label={t('login.password')}
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
          {!!failure && (
            <Text style={styles.failure} accessibilityRole="alert">{failure}</Text>
          )}
          <Button title={t('login.submit')} onPress={() => void submit()} loading={loading} />
        </Card>
        <Note text={t('login.rule')} />
        <Pressable
          onPress={() => navigation.navigate('Register')}
          hitSlop={8}
          accessibilityRole="link"
          style={styles.link}
        >
          <Text style={styles.linkText}>{t('login.toRegister')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  lang: { marginTop: space(4) },
  body: { padding: space(4), paddingBottom: space(10) },
  tagline: { color: colors.muted, fontSize: font.small + 1, marginBottom: space(3) },
  failure: { color: colors.red, fontSize: font.body - 1, lineHeight: 21, marginBottom: space(3) },
  link: { alignItems: 'center', paddingVertical: space(3) },
  linkText: { color: colors.blue, fontSize: font.body, fontWeight: '600' },
});
