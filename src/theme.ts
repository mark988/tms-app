/*
 * 颜色、圆角、间距。和产品演示（根目录 index.html 里的司机 App）一致：深蓝的头部、浅灰的底、白色卡片。
 * 司机多在户外看手机，文字颜色都取得比较深，保证对比度。
 */

export const colors = {
  /** 头部、状态栏后面的深蓝 */
  navy: '#10243a',
  navySoft: '#1d4265',
  /** 主操作按钮 */
  blue: '#2463eb',
  blueSoft: '#edf3ff',
  green: '#12815b',
  greenSoft: '#e7f7ef',
  orange: '#ae6819',
  orangeSoft: '#fff2df',
  red: '#b3261e',
  redSoft: '#fdecea',
  gray: '#5b6b7d',
  graySoft: '#eef1f4',
  /** 页面底色 */
  bg: '#f4f6fa',
  card: '#ffffff',
  /** 正文 */
  ink: '#1b2b40',
  /** 次要文字 */
  ink2: '#4a5c70',
  /** 说明文字 */
  muted: '#5f7085',
  line: '#e4eaf1',
  /** 深蓝头部上的次要文字 */
  onNavyMuted: '#bdcad8',
  white: '#ffffff',
};

export const radius = { sm: 8, md: 12, lg: 16 };

/** 一格 4 像素 */
export const space = (n: number): number => n * 4;

export const font = {
  small: 12,
  body: 15,
  title: 17,
  large: 22,
};
