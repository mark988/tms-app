# tms-app 项目记忆

宝运物流管理平台 TMS 的司机配送 App（「宝运配送」）。后台服务是 `../tms-service`，只用它的 `/api/app/**` 这一组接口。
这份文件记的是"东西在哪、怎么改、有哪些坑"；启动、配置后台地址、定位说明、打包发布的完整步骤在 `README.md`。

- Expo SDK 54（`expo ~54.0.0`、React Native 0.81.5、React 19.1）+ TypeScript
- React Navigation 7（native-stack + bottom-tabs）、expo-location（只做前台定位）、expo-secure-store、expo-localization
- **一套代码出安卓和 iOS**：仓库里没有 `android/`、`ios/`，由 `npx expo prebuild` 或 EAS 打包时按 `app.json` 生成。没有按平台分开写的页面
- 界面三种语言：缅文 / 英文 / 中文，没有用第三方多语言库
- 整个工程是 2026-11 这一轮从零写的

## 常用命令

```bash
npm install
npx expo install --fix     # 把依赖对齐到当前 Expo SDK 要求的版本
npx tsc --noEmit           # 类型检查，改完代码用它检查
npx expo-doctor            # Expo 的工程体检
npx expo start             # 再按 i（iOS 模拟器）或 a（安卓模拟器）
```

后台地址：把 `.env.example` 复制成 `.env`，改 `EXPO_PUBLIC_API_BASE_URL`（不带最后的斜杠、不带 `/api`）。
iOS 模拟器填 `http://localhost:8090`，安卓模拟器填 `http://10.0.2.2:8090`，真机填电脑的局域网 IP。**改完要重新执行 `npx expo start`。**

## 代码在哪

| 文件 | 内容 |
|---|---|
| `App.tsx`、`index.ts` | 入口：安全区 → 多语言 → 登录状态 → 导航 |
| `app.json` | App 名称、包名（`com.baoyun.tms.driver`）、expo-location 插件（后台定位关着）、`locales` |
| `eas.json` | EAS 打包的三个 profile：development / preview / production，各自的后台地址在 `env` 里 |
| `locales/{en,my,zh}.json` | iOS 上按系统语言显示的 App 名称和定位权限说明 |
| `src/config.ts` | 后台地址、请求超时（20 秒）、任务刷新间隔（30 秒）、定位间隔（30 秒） |
| `src/storage.ts` | 存在手机安全存储里的两样：登录令牌 `tms.driver.token`、语言 `tms.driver.lang` |
| `src/theme.ts` | 颜色、圆角、间距、字号 |
| `src/api/client.ts` | 请求的唯一入口 `api<T>()`、`ApiError`、`setAuthToken`、`setUnauthorizedHandler` |
| `src/api/driver.ts` | 全部接口，一个接口一个函数 |
| `src/api/types.ts` | 接口数据的类型，和后端 `app/dto/AppDtos.java` 一一对应 |
| `src/auth/AuthContext.tsx` | 登录状态：`loading` / `signedOut` / `signedIn` / `offline`；`signIn`、`signOut`、`replaceToken`、`refreshProfile` |
| `src/work/WorkContext.tsx` | 登录后一直保持的两件事：任务数字定时刷新、**位置上报** |
| `src/i18n/index.tsx`、`zh.ts`、`en.ts`、`my.ts` | 多语言：`useI18n()` 给 `t`、`lang`、`setLang`；`codeText(t, 前缀, 代码)` |
| `src/navigation/RootNavigator.tsx`、`types.ts` | 按登录状态切换两组页面；页面参数的类型 |
| `src/components/ui.tsx` | 共用小组件：`Header`、`Card`、`Button`、`Field`、`Pill`、`InfoRow`、`Note`、`Sheet`、`OptionRow` |
| `src/components/tones.ts`、`LangSwitch.tsx` | 状态标签的颜色；语言切换 |
| `src/utils/errors.ts` | 把错误变成当前语言的提示：`errorText`、`isUnauthorized`、`isTaskChanged`、`isTaskGone` |
| `src/utils/format.ts` | 时间、金额、重量的显示 |

## 页面 → 接口

| 页面（`src/screens/`） | 用到的接口（`src/api/driver.ts`） |
|---|---|
| `LoginScreen` | `login`（经 `AuthContext.signIn`） |
| `RegisterScreen` | `fetchAreas`、`register` |
| `TasksScreen` | `fetchTasks`（TODO / DONE 两个页签，分页）、`fetchSummary`（经 `WorkContext`） |
| `TaskDetailScreen` | `fetchTask`、`acceptTask`、`departTask`、`signTask`、`reportTaskException` |
| `ProfileScreen` | `fetchProfile`、`changeWorkStatus`、`logout` |
| `ChangePasswordScreen` | `changePassword`（成功后后端发新令牌，用 `replaceToken` 换上） |
| （不在页面里）`WorkContext` | `fetchSummary`、`reportLocation` |

导航：没登录是 `Login` ⇄ `Register`；登录后是底部两个页签 `Tasks`、`Profile`，加上 `TaskDetail`（参数 `id`）、`ChangePassword`。

## 写法上的坑

1. **文字条目名是带类型的**。`en.ts`、`my.ts` 用 `Record<keyof typeof zh, string>` 约束，比 `zh.ts` 少一条或多一条，`npx tsc --noEmit` 会报错。加文字时三个文件一起加。
2. **后端只返回代码，文字在 App 里**：状态 `status.*`、异常类型 `exceptionType.*`、轨迹动作 `track.*`、工作状态 `workStatus.*`，用 `codeText(t, 'status', code)` 取；App 不认识的代码原样显示。
3. **出错提示一律走 `errorText(error, t)`**，它按后端的错误码取文字。另外三种要单独处理：`isUnauthorized`（请求层已经把人送回登录页，不用再弹提示）、`isTaskChanged`（错误码 40020，提示后重新加载）、`isTaskGone`（任务接口返回 404，提示后回列表）。
4. **`process.env.EXPO_PUBLIC_API_BASE_URL` 必须原样写全**（`src/config.ts`），Expo 在打包时按这个写法整体替换，拆开写取不到值。
5. **登录成功后不要手动跳页面**：`AuthContext` 的状态一变，`RootNavigator` 自己换到任务页；退出登录、令牌失效同理。
6. **`FlatList` 的 `ListFooterComponent` / `ListEmptyComponent` 只收"一个元素或 null"**，变量不能标成 `ReactNode`，要标 `ReactElement | null`（`TasksScreen.tsx` 的 `footer`）。这是读类型定义得出的判断，改完之后才第一次做类型检查，没有见过它报错的样子。
7. **定位只做了前台**：允许了"使用期间"的位置权限、手上有已接单或配送中的任务、App 在前台，三样都满足才取位置。点攒成一批上报（每批 50 个，报不出去最多留 200 个）。要做后台 / 锁屏定位，改 `src/work/WorkContext.tsx` 和 `app.json` 里 expo-location 插件的配置，两个应用商店还要单独申报。
8. **安全区**：`Header` 自己让开顶部（刘海、状态栏）；底部由各页面自己加 `insets.bottom`（`TaskDetailScreen`、`ProfileScreen`、`Sheet`）。
9. **没有用图标字体**：底部页签的图标是文字符号（📦、👤）。
10. **`Platform.OS` 只用在两处**：`KeyboardAvoidingView` 的 `behavior`（iOS 用 `padding`），和调起地图的地址（iOS 用 Apple 地图，安卓用 `geo:`）。
11. **后端的时间带 6 位小数的秒**，`utils/format.ts` 的 `parse` 会先截成 3 位再解析；显示时间都走这个文件里的函数。
12. **正式包必须连 HTTPS**：安卓的正式包默认禁止明文 HTTP，iOS 有 ATS 限制。
13. 只翻译界面上的固定文字。运单号、姓名、地址、备注、后端填的原因是数据，原样显示。

## 后端改了什么，这里要跟着改

| 后端（`../tms-service/src/main/java/com/baoyun/tms/`） | 这里（`src/`） |
|---|---|
| 司机 App 接口的路径、字段（`app/controller/*`、`app/dto/AppDtos.java`） | `api/driver.ts`、`api/types.ts` |
| 运单状态、司机能做的流转（`waybill/entity/Waybill`、`waybill/mapper/WaybillMapper`、`app/service/DriverTaskService`） | `api/types.ts`（`TaskStatus`）、`components/tones.ts`、`i18n/{zh,en,my}.ts`（`status.*`）、`screens/TaskDetailScreen.tsx`（按状态显示哪些按钮）、`screens/TasksScreen.tsx` |
| 轨迹动作（`waybill/entity/WaybillTrack`） | `i18n/{zh,en,my}.ts`（`track.*`） |
| 异常类型（`AppDtos.ExceptionRequest` 的 `@Pattern`） | `api/types.ts`（`ExceptionType`、`EXCEPTION_TYPES`）、`i18n/{zh,en,my}.ts`（`exceptionType.*`） |
| 工作状态（`fleet/entity/Driver`、`AppDtos.WorkStatusRequest`） | `api/types.ts`（`WorkStatus`、`MANUAL_WORK_STATUSES`）、`components/tones.ts`、`i18n/{zh,en,my}.ts`（`workStatus.*`） |
| 错误码（`common/exception/BizException` 的 `CODE_` 常量） | `utils/errors.ts`（码 → 文字条目）、`i18n/{zh,en,my}.ts`（`error.*`） |
| 账号、密码、电话的规则（`AppDtos.RegisterRequest`、`system/service/PasswordPolicy`） | `screens/RegisterScreen.tsx`、`screens/ChangePasswordScreen.tsx` 开头的正则 |
| 定位上报的上限（一次最多 100 个点） | `work/WorkContext.tsx` 的 `BATCH_SIZE` |

管理后台（`../tms-dashboard`）不经过这个工程；状态、异常类型这些代码三端要一致。

## 当前状态（2026-11-25）

- 通过的检查：`npm install`、`npx expo install --fix`（"Dependencies are up to date"）、`npx tsc --noEmit`（没有报错）、`npx expo-doctor`（18 项全部通过）。环境 Node 22.16、npm 10.9。
- **还没有在模拟器或真机上跑过**，安卓、iOS 都没有；也没有连着真实的后端操作过。定位、拨号、调起地图、键盘遮挡输入框这些必须在真机上验证。
  后端同一天已经能启动（后台用户能登录），App 可以开始联调；`/api/app/**` 这一组接口还一个都没有被真正调用过。
- **待确认**：`package.json` 末尾有一行 `"packageManager": "yarn@1.22.22+…"`，不是写这份代码时加的。工程实际用 npm 安装（有 `package-lock.json`，没有 `yarn.lock`），这一行和实际用法对不上，留还是删要开发者定。
- 占位、发布前要换的：包名 `com.baoyun.tms.driver`、App 图标和启动图（现在是 Expo 默认的）、`eas.json` 里三个 profile 的后台地址。
- 缅文译文没有经过母语者校对（`src/i18n/my.ts`、`locales/my.json`）。
- 没做的：后台 / 锁屏定位、签收拍照和电子签名、推送通知、App 里的地图、离线操作、忘记密码、自动化测试。

## 变更记录

- 2026-11：初版。登录、注册、任务列表、任务详情（接单、开始配送、签收、上报异常）、我的（工作状态、位置共享、语言）、修改密码；前台定位上报；中英缅三种语言。
- 2026-11-25：`src/screens/TasksScreen.tsx` 的 `footer` 类型从 `ReactNode` 改成 `ReactElement | null`（见上面第 6 条）；`package.json` 的 `doctor`、`fix-versions` 两个脚本改成用 `npx`；`README.md` 的「当前状态」按实际检查结果更新。
