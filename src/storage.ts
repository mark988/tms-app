import * as SecureStore from 'expo-secure-store';

/*
 * 存在手机上的两样东西：登录令牌、选的语言。
 * 都放在系统的安全存储里（iOS 的钥匙串、安卓的加密存储）；读写失败不影响使用，只是下次打开要重新登录 / 重新选语言。
 */

const KEY_TOKEN = 'tms.driver.token';
const KEY_LANG = 'tms.driver.lang';

async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    /* 存不了就算了 */
  }
}

export const loadToken = () => read(KEY_TOKEN);
export const saveToken = (token: string | null) => write(KEY_TOKEN, token);

export const loadLang = () => read(KEY_LANG);
export const saveLang = (lang: string) => write(KEY_LANG, lang);
