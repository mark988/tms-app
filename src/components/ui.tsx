import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, space } from '../theme';

/*
 * 各个页面共用的小组件：深蓝的页头、白色卡片、按钮、输入框、状态标签、一行"名称 + 内容"、从下面升上来的面板。
 * 安卓和 iOS 用的是同一套，不分平台写。
 */

// ---------------------------------------------------------------- 页头

interface HeaderProps {
  title: string;
  subtitle?: string;
  /** 有的话左上角显示返回 */
  onBack?: () => void;
  backLabel?: string;
  /** 标题下面再放点别的（任务列表的几个数字） */
  children?: ReactNode;
}

/** 深蓝的页头。自己让开状态栏（刘海、挖孔），所以各个页面不用再处理顶部的安全区。 */
export function Header({ title, subtitle, onBack, backLabel, children }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space(3) }]}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" style={styles.headerBack}>
          <Text style={styles.headerBackText}>‹ {backLabel}</Text>
        </Pressable>
      )}
      <Text style={styles.headerTitle} accessibilityRole="header">{title}</Text>
      {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- 卡片

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------------------------------------------------------------- 按钮

interface ButtonProps {
  title: string;
  onPress: () => void;
  /** primary 蓝色主按钮；success 绿色（签收）；danger 红字；ghost 灰底的次要按钮 */
  kind?: 'primary' | 'success' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, kind = 'primary', loading = false, disabled = false, style }: ButtonProps) {
  const off = disabled || loading;
  const light = kind === 'ghost' || kind === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && styles.buttonPrimary,
        kind === 'success' && styles.buttonSuccess,
        kind === 'ghost' && styles.buttonGhost,
        kind === 'danger' && styles.buttonDanger,
        pressed && styles.pressed,
        off && styles.buttonOff,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={light ? colors.ink2 : colors.white} />
      ) : (
        <Text style={[styles.buttonText, kind === 'ghost' && styles.buttonTextGhost, kind === 'danger' && styles.buttonTextDanger]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------- 输入框

interface FieldProps extends TextInputProps {
  label: string;
  /** 输入框下面的一句说明 */
  hint?: string;
  /** 校验没过时的提示；有它就不显示 hint */
  error?: string;
}

export function Field({ label, hint, error, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        {...input}
        style={[styles.input, !!error && styles.inputError, style]}
      />
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
      {!error && !!hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------- 状态标签

export type Tone = 'blue' | 'green' | 'orange' | 'red' | 'gray';

const TONE: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: colors.blueSoft, fg: colors.blue },
  green: { bg: colors.greenSoft, fg: colors.green },
  orange: { bg: colors.orangeSoft, fg: colors.orange },
  red: { bg: colors.redSoft, fg: colors.red },
  gray: { bg: colors.graySoft, fg: colors.gray },
};

/** 小标签。颜色只是帮着一眼区分，意思由上面的文字说清楚。 */
export function Pill({ text, tone }: { text: string; tone: Tone }) {
  return (
    <View style={[styles.pill, { backgroundColor: TONE[tone].bg }]}>
      <Text style={[styles.pillText, { color: TONE[tone].fg }]}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- 一行"名称 + 内容"

export function InfoRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, strong && styles.infoValueStrong]} selectable>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- 提示条

/** 一段说明。warn 是需要留意的（黄底）。 */
export function Note({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warn' }) {
  return (
    <View style={[styles.note, tone === 'warn' ? styles.noteWarn : styles.noteInfo]}>
      <Text style={[styles.noteText, tone === 'warn' && styles.noteTextWarn]}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- 从下面升上来的面板

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}

/** 从屏幕下面升上来的面板：选配送区域、填签收人、上报异常都用它。内容多了可以滚动。 */
export function Sheet({ visible, title, onClose, closeLabel, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={closeLabel} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space(4) }]}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Text style={styles.sheetClose}>{closeLabel}</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space(2) }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------- 可以点选的一行（面板里的选项）

export function OptionRow({ title, subtitle, selected, onPress }: { title: string; subtitle?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{title}</Text>
        {!!subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      {selected && <Text style={styles.optionCheck}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: space(5),
    paddingBottom: space(4),
  },
  headerBack: { alignSelf: 'flex-start', marginBottom: space(2) },
  headerBackText: { color: colors.onNavyMuted, fontSize: font.body },
  headerTitle: { color: colors.white, fontSize: font.large, fontWeight: '700' },
  headerSubtitle: { color: colors.onNavyMuted, fontSize: font.small + 1, marginTop: space(1) },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(4),
    marginBottom: space(3),
  },

  button: {
    minHeight: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  buttonPrimary: { backgroundColor: colors.blue },
  buttonSuccess: { backgroundColor: colors.green },
  buttonGhost: { backgroundColor: colors.graySoft },
  buttonDanger: { backgroundColor: colors.redSoft },
  buttonOff: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: font.body + 1, fontWeight: '700', textAlign: 'center' },
  buttonTextGhost: { color: colors.ink2 },
  buttonTextDanger: { color: colors.red },
  pressed: { opacity: 0.75 },

  field: { marginBottom: space(4) },
  fieldLabel: { color: colors.ink2, fontSize: font.small + 1, marginBottom: space(1.5) },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
    fontSize: font.body + 1,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.red },
  fieldHint: { color: colors.muted, fontSize: font.small, marginTop: space(1), lineHeight: 18 },
  fieldError: { color: colors.red, fontSize: font.small, marginTop: space(1), lineHeight: 18 },

  pill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: space(2.5), paddingVertical: space(1) },
  pillText: { fontSize: font.small, fontWeight: '700' },

  infoRow: { flexDirection: 'row', paddingVertical: space(1.5) },
  infoLabel: { width: 108, color: colors.muted, fontSize: font.body - 1, lineHeight: 22 },
  infoValue: { flex: 1, color: colors.ink, fontSize: font.body, lineHeight: 22 },
  infoValueStrong: { fontWeight: '700' },

  note: { borderRadius: radius.sm, borderWidth: 1, padding: space(3), marginBottom: space(3) },
  noteInfo: { backgroundColor: colors.blueSoft, borderColor: '#cbdcff' },
  noteWarn: { backgroundColor: '#fff8e9', borderColor: '#f1dfb9' },
  noteText: { color: colors.ink2, fontSize: font.small + 1, lineHeight: 20 },
  noteTextWarn: { color: '#6f4d14' },

  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16, 36, 58, 0.5)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space(4),
    paddingTop: space(4),
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space(3) },
  sheetTitle: { flex: 1, color: colors.ink, fontSize: font.title, fontWeight: '700' },
  sheetClose: { color: colors.blue, fontSize: font.body, fontWeight: '600' },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
    marginBottom: space(2),
  },
  optionSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  optionTitle: { color: colors.ink, fontSize: font.body },
  optionTitleSelected: { color: colors.blue, fontWeight: '700' },
  optionSubtitle: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  optionCheck: { color: colors.blue, fontSize: font.title, fontWeight: '700', marginLeft: space(2) },
});
