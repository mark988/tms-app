import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LANGS, useI18n } from '../i18n';
import { colors, font, radius, space } from '../theme';

/**
 * 语言切换：မြန်မာ / English / 中文 三个并排的小按钮，点了整个 App 马上换，并记在手机上。
 * 登录页、注册页（放在深蓝的页头上，onDark）和「我的」页面共用。
 */
export default function LangSwitch({ onDark = false }: { onDark?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('common.language')}>
      {LANGS.map((item) => {
        const selected = item.value === lang;
        return (
          <Pressable
            key={item.value}
            onPress={() => setLang(item.value)}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.item,
              onDark ? styles.itemOnDark : styles.itemOnLight,
              selected && (onDark ? styles.selectedOnDark : styles.selectedOnLight),
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: onDark ? colors.onNavyMuted : colors.ink2 },
                selected && { color: onDark ? colors.navy : colors.white, fontWeight: '700' },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  item: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  itemOnDark: { borderColor: 'rgba(255, 255, 255, 0.28)' },
  itemOnLight: { borderColor: colors.line, backgroundColor: colors.white },
  selectedOnDark: { backgroundColor: colors.white, borderColor: colors.white },
  selectedOnLight: { backgroundColor: colors.blue, borderColor: colors.blue },
  text: { fontSize: font.small + 1 },
});
