import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui';
import { useI18n } from '../i18n';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TasksScreen from '../screens/TasksScreen';
import { colors, font, space } from '../theme';
import { WorkProvider } from '../work/WorkContext';
import type { AppStackParams, AuthStackParams, TabParams } from './types';

/*
 * 导航的入口。按登录状态决定显示哪一组页面：
 *   正在恢复登录      → 转圈
 *   有令牌但连不上    → "连接不上服务器"，可以重试或者退出登录
 *   没登录            → 登录、注册
 *   已登录            → 底部两个页签（任务、我的）+ 任务详情、修改密码
 *
 * 各个页面都用自己的深蓝页头（components/ui.tsx 的 Header），所以把导航自带的标题栏关掉；
 * 这样安卓和 iOS 上看到的是同一个样子。
 */

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const AppStack = createNativeStackNavigator<AppStackParams>();
const Tabs = createBottomTabNavigator<TabParams>();

/** 底部页签的图标：直接用文字符号，不依赖图标字体。 */
function TabGlyph({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={[styles.glyph, !focused && styles.glyphDim]}>{glyph}</Text>;
}

function MainTabs() {
  const { t } = useI18n();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: font.small },
      }}
    >
      <Tabs.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: t('tasks.tabLabel'),
          tabBarIcon: ({ focused }) => <TabGlyph glyph="📦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('profile.tabLabel'),
          tabBarIcon: ({ focused }) => <TabGlyph glyph="👤" focused={focused} />,
        }}
      />
    </Tabs.Navigator>
  );
}

/** 有登录令牌，但是连不上服务器。 */
function Offline() {
  const { t } = useI18n();
  const { retry, signOut } = useAuth();
  return (
    <View style={styles.center}>
      <Text style={styles.offlineTitle}>{t('offline.title')}</Text>
      <Text style={styles.offlineText}>{t('offline.text')}</Text>
      <Button title={t('common.retry')} onPress={retry} style={styles.offlineButton} />
      <Button title={t('profile.logout')} kind="ghost" onPress={() => void signOut()} style={styles.offlineButton} />
    </View>
  );
}

export default function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }
  if (status === 'offline') {
    return <Offline />;
  }

  return (
    <NavigationContainer>
      {status === 'signedIn' ? (
        // 任务数字、位置上报只在登录之后才有
        <WorkProvider>
          <AppStack.Navigator screenOptions={{ headerShown: false }}>
            <AppStack.Screen name="Main" component={MainTabs} />
            <AppStack.Screen name="TaskDetail" component={TaskDetailScreen} />
            <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          </AppStack.Navigator>
        </WorkProvider>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(8), backgroundColor: colors.bg },
  glyph: { fontSize: 20 },
  glyphDim: { opacity: 0.45 },
  offlineTitle: { color: colors.ink, fontSize: font.title, fontWeight: '700', textAlign: 'center' },
  offlineText: { color: colors.ink2, fontSize: font.body, textAlign: 'center', marginTop: space(2), marginBottom: space(4) },
  offlineButton: { alignSelf: 'stretch', marginTop: space(3) },
});
