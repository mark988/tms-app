# tms-app

宝运物流管理平台 TMS V1.0 · 司机配送 App（「宝运配送」）。

- React Native + Expo + TypeScript。**一套代码，安卓和 iOS 都从这里打包发布**：仓库里只有 JS / TS 和配置，
  没有 `android/`、`ios/` 两个原生工程——它们由 Expo 按 `app.json` 生成（`npx expo prebuild` 或者 EAS 云端打包时自动生成）。
  页面、导航、接口、定位都只写了一份，没有按平台分开写的页面。
- 页面：登录、注册、我的配送任务（进行中 / 已结束）、任务详情（接单、开始配送、签收、上报异常）、我的（工作状态、位置共享、语言、修改密码）。
- 界面三种语言：မြန်မာ / English / 中文。
- 后台是 `tms-service`，只用它的 `/api/app/**` 这一组接口。

> **当前状态（请先看这一段）**
>
> - 2026-11-25：`npm install`、`npx expo install --fix`（结果是 "Dependencies are up to date"）、
>   `npx tsc --noEmit`（没有报错）、`npx expo-doctor`（18 项检查全部通过）都通过了。依赖是 **Expo SDK 54** 这一套。
> - **还没有在真机或模拟器上跑过**，安卓、iOS 都没有；也没有连着真实的后台操作过。
>   上面这些检查只说明工程配置和类型没有问题；定位、拨号、调起地图、键盘遮挡输入框这些和手机有关的东西必须在真机上验证。

## 第一次安装

需要 Node.js 20 及以上。

```bash
cd tms-app
npm install
npx expo install --fix      # 把依赖对齐到当前 Expo SDK 要求的版本（会改 package.json）
npx tsc --noEmit            # 类型检查
npx expo-doctor             # Expo 自带的工程体检
```

想换成最新的 Expo SDK：`npx expo install expo@latest`，再执行一次 `npx expo install --fix`。

## 配置后台地址

App 通过环境变量 `EXPO_PUBLIC_API_BASE_URL` 知道后台在哪（不带最后的斜杠、不带 `/api`）。

本机开发：把 `.env.example` 复制成 `.env` 再改。**改完要重新执行 `npx expo start`**（按 `r` 刷新不会重新读环境变量）。

| 在哪里跑 | 填什么 |
|---|---|
| iOS 模拟器 | `http://localhost:8090` |
| 安卓模拟器 | `http://10.0.2.2:8090`（`10.0.2.2` 是模拟器里访问这台电脑的固定地址） |
| 真机 | `http://电脑的局域网IP:8090`（手机和电脑连同一个 Wi-Fi） |

测试包、正式包的地址写在 `eas.json` 各个 profile 的 `env` 里（现在填的是示例地址，**打包前要改成真实的**）。

**正式环境必须是 HTTPS。** 安卓的正式包默认禁止明文 HTTP，iOS 有 ATS 限制。局域网联调要用 HTTP 时：

- 用 Expo Go 或者开发版（development build）跑，一般可以直接访问局域网的 HTTP 地址；
- 自己打出来的安卓包要访问 HTTP，需要装 `expo-build-properties` 并在 `app.json` 的插件里给安卓打开 `usesCleartextTraffic`
  （只在测试用的 profile 里开，正式包不要开）。

## 启动

先把 `tms-service` 启动起来，并在管理后台里准备好一个审核通过的司机账号（或者在 App 里注册后到后台审核）。

```bash
npx expo start
```

- **真机**：手机装 Expo Go，扫终端里的二维码。注意应用商店里的 Expo Go 只支持最新的一两个 SDK 版本；
  版本对不上时，要么把工程升到最新的 SDK，要么打一个开发版（见下面 EAS 的 `development` profile）。
- **安卓模拟器**：装好 Android Studio 并建一个模拟器，然后在终端里按 `a`（或 `npm run android`）。
- **iOS 模拟器**：只能在 Mac 上，装好 Xcode，然后在终端里按 `i`（或 `npm run ios`）。

## 目录结构

```
App.tsx                 入口：安全区 → 多语言 → 登录状态 → 导航
index.ts                把 App 注册成根组件（安卓、iOS 共用）
app.json                App 的名称、包名、权限说明等（原生工程按它生成）
eas.json                EAS 打包的三个 profile：development / preview / production
locales/                iOS 上按系统语言显示的 App 名称和定位权限说明（中 / 英 / 缅）
src
├── api                 接口：client.ts 统一请求和出错处理，driver.ts 全部接口，types.ts 数据的样子
├── auth                登录状态（令牌存在手机的安全存储里；后台返回 401 就回登录页）
├── work                登录之后一直保持的两件事：任务数字的定时刷新、位置上报
├── i18n                多语言：zh.ts（基准）/ en.ts / my.ts
├── navigation          页面怎么跳（没登录：登录、注册；登录后：底部两个页签 + 任务详情、修改密码）
├── screens             六个页面
├── components          共用的小组件（页头、卡片、按钮、输入框、状态标签、底部面板、语言切换）
├── utils               时间和金额的显示、把错误码变成提示
├── config.ts           后台地址、刷新和定位的间隔
├── storage.ts          存在手机上的东西：登录令牌、选的语言
└── theme.ts            颜色、圆角、间距
```

## 和后台的约定

- 接口都在 `/api/app` 下面，请求头带 `Authorization: Bearer <令牌>`；登录、注册、注册页的配送区域列表不用带。
- 后台只返回**代码**（任务状态、异常类型、轨迹动作），显示什么文字由 App 按语言决定；
  后台以后新加了代码而 App 还没有配文字时，原样显示代码。
- 出错时后台返回固定的错误码，App 按码显示当前语言的提示（`src/utils/errors.ts`），认不出的码才显示后台的中文提示。
  错误码的清单在 `tms-service/README.md` 第五节。几个要特别处理的：
  - HTTP 401：登录失效（账号被停用、密码被重置、令牌过期），清掉本地的登录状态回到登录页；
  - `40020`：任务状态已经变化（被改派、被取消，或者连点了两次），提示之后重新加载；
  - HTTP 404（任务接口）：任务已经不在这名司机名下，提示之后回到列表；
  - `40012` 审核未通过时 `data.reason` 是后台填的原因，`40014` 账号锁定时 `data.minutes` 是还要等几分钟。
- 接单、开始配送、签收、上报异常成功后，后台直接返回最新的任务详情，页面用它刷新。
- 修改密码成功后旧令牌全部失效，后台同时返回新的令牌，App 换上它，不用重新登录。
- 司机的令牌有效期是 30 天（后台可配）。

## 多语言

- 文字在 `src/i18n/zh.ts`（基准）、`en.ts`、`my.ts`，没有用第三方库。英文、缅文少一条或者多一条，`npx tsc --noEmit` 会报错。
- 第一次打开按手机的系统语言选（缅文 → 缅文，中文 → 中文，其他 → 英文）；司机在登录页或「我的」里选过之后就记住他选的。
- 只翻译界面上的固定文字。运单号、姓名、地址、备注，以及后台填的原因（审核未通过的原因、取消原因等）是数据，是什么就显示什么。
- 时间按手机的时区显示成 `年-月-日 时:分`；金额固定是千分位加两位小数（如 `1,234.50`），没有带币种符号。
- iOS 上系统弹出的"是否允许使用位置"里的说明文字、桌面上的 App 名称按系统语言显示（`locales/` 下的三个文件）；
  安卓上 App 名称只有一个（`app.json` 的 `name`）。
- **缅文译文没有经过母语者校对**，上线前请懂缅文的同事通读一遍（`src/i18n/my.ts` 和 `locales/my.json`）。

## 定位上报（V1.0 只做前台定位）

位置报给后台之后，调度人员在管理后台的「GPS 定位监控」和运单的「地图跟踪」里能看到。

**什么时候上报**：下面三样都满足时才取位置、上报——

1. 司机允许了 App "使用期间"获取位置；
2. 手上有已接单或配送中的任务；
3. App 打开在前台。

大约每 30 秒（或者移动了 30 米）取一次，攒着成批报给后台；报失败的留着下次再发，最多留 200 个点。

**这一版的限制，要让使用的人知道**：

- **App 切到后台或者手机锁屏之后不上报。** 司机把手机锁屏放兜里，这段时间后台看不到新的位置，
  管理后台上会显示成"最后定位时间"停在锁屏之前，超过 10 分钟标为"已过时"。
- 所以后台看到的是"最近一次上报的位置"，不是实时位置。
- 司机拒绝授权时，App 其余功能照常可用，只是后台看不到他的位置。
- 「我的 → 位置共享」里照实显示当前的状态（共享中 / 已暂停 / 未授权 / 未开启）。

**为什么没有做后台 / 锁屏定位**：它需要"始终允许"的位置权限、安卓的前台服务（通知栏常驻一条通知）、
iOS 的后台定位能力，Google Play 和 App Store 都要单独申报并说明用途，审核更严，耗电也明显增加，而且必须在真机上反复测试。
这是下一步要做的事，做的时候改 `src/work/WorkContext.tsx` 和 `app.json` 里 `expo-location` 插件的配置。

第一次接单成功后，App 会先用自己的话说明为什么要位置，再弹系统的询问框。

## 打包发布

两条路，任选一条。**不管哪条，下面这些都要你们自己准备**：

| 要准备的 | 说明 |
|---|---|
| 包名 | `app.json` 里的 `ios.bundleIdentifier` 和 `android.package` 现在是 `com.baoyun.tms.driver`，**发布前换成公司实际要用的**；上架之后不能再改 |
| App 图标、启动图 | 现在没有配，用的是 Expo 默认的图标。准备好图片后在 `app.json` 里配 `icon`、`android.adaptiveIcon` 和启动图 |
| 正式的后台地址 | HTTPS，填到 `eas.json` 的 `production.env` 里 |
| Apple Developer 账号 | 上架 App Store、用 TestFlight、给真机装 iOS 包都需要（付费账号） |
| Google Play 开发者账号 | 上架 Google Play 需要。只是把 APK 直接发给司机安装的话不需要 |
| 安卓签名证书（keystore） | 用 EAS 时可以让它代为生成和保管；自己本地打包要自己生成并**妥善备份**，丢了就不能再更新已经发布的 App |
| 隐私政策网址 | App 使用了位置信息，两个应用商店上架时都要填 |

### 路线一：EAS Build（Expo 的云端打包，推荐）

不需要在本机装 Android Studio / Xcode，iOS 包也可以在非 Mac 的电脑上打。需要注册一个 Expo 账号。

```bash
npm install -g eas-cli
eas login
eas build:configure                           # 第一次：把工程和 Expo 账号关联起来

eas build --profile preview --platform android      # 测试用的 APK，可以直接发给司机安装
eas build --profile production --platform android   # 上架 Google Play 用的 AAB
eas build --profile production --platform ios       # 上架 App Store / TestFlight 用的包

eas submit --platform android                 # 提交到 Google Play
eas submit --platform ios                     # 提交到 App Store Connect
```

`eas.json` 里的三个 profile：`development`（开发版，能连本机的开发服务）、`preview`（内部测试，安卓出 APK）、
`production`（上架，版本号自动加 1）。

### 路线二：本地打包

```bash
npx expo prebuild        # 按 app.json 生成 android/ 和 ios/ 两个原生工程
```

- **安卓**：用 Android Studio 打开 `android/`，配好签名后 Build → Generate Signed Bundle / APK；
  或者命令行 `cd android && ./gradlew assembleRelease`（出 APK）/ `bundleRelease`（出 AAB）。
- **iOS**（只能在 Mac 上）：`cd ios && pod install`，用 Xcode 打开 `ios/` 下的 `.xcworkspace`，
  选好开发者团队和证书，Product → Archive，再通过 Organizer 上传到 App Store Connect。

`android/`、`ios/` 是生成出来的，没有提交到仓库（见 `.gitignore`）。改了 `app.json` 或者加了带原生代码的依赖之后，
要重新执行 `npx expo prebuild`；不要直接手改这两个目录里的东西，下次生成会被覆盖。

## 这一版没有做的

- 后台 / 锁屏定位（见上面「定位上报」）。
- 签收拍照、电子签名。现在签收只填签收人和备注。
- 推送通知。有新任务时不会主动提醒，靠任务列表每 30 秒自动刷新一次（App 要开着）。
- App 里的地图。导航是交给手机上的地图 App 做的。
- 离线操作。没有网络时不能接单、签收，只是位置点会攒着等有网再发。
- 忘记密码。司机忘了密码要联系管理员在后台重置。
- 自动化测试。
