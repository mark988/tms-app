import { registerRootComponent } from 'expo';
import App from './App';

// 安卓、iOS 共用的入口：把 App 注册成根组件（Expo Go 和打出来的原生包都走这里）
registerRootComponent(App);
