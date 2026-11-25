import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { I18nProvider } from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';

/**
 * 宝运配送 · 司机 App。安卓和 iOS 共用这一套代码，没有按平台分开写的页面。
 *
 * 从外到里：安全区（刘海、底部横条）→ 多语言 → 登录状态 → 导航。
 * 页头是深蓝色的，所以状态栏的字用浅色。
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
