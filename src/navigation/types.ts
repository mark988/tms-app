import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/*
 * 页面之间怎么跳。安卓和 iOS 用的是同一套导航。
 *
 * 没登录：登录 ⇄ 注册
 * 登录后：底部两个页签（任务、我的）→ 任务详情、修改密码
 */

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParams = {
  Main: undefined;
  TaskDetail: { id: number };
  ChangePassword: undefined;
};

export type TabParams = {
  Tasks: undefined;
  Profile: undefined;
};

export type LoginProps = NativeStackScreenProps<AuthStackParams, 'Login'>;
export type RegisterProps = NativeStackScreenProps<AuthStackParams, 'Register'>;
export type TaskDetailProps = NativeStackScreenProps<AppStackParams, 'TaskDetail'>;
export type ChangePasswordProps = NativeStackScreenProps<AppStackParams, 'ChangePassword'>;
