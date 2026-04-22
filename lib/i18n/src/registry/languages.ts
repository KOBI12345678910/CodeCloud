export type Direction = "ltr" | "rtl";

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  dir: Direction;
  region?: string;
  hand?: boolean;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr", region: "US", hand: true },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr", region: "ES", hand: true },
  { code: "pt", name: "Portuguese", nativeName: "Português", dir: "ltr", region: "BR", hand: true },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr", region: "FR", hand: true },
  { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr", region: "DE", hand: true },
  { code: "it", name: "Italian", nativeName: "Italiano", dir: "ltr", region: "IT", hand: true },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", dir: "ltr", region: "NL", hand: true },
  { code: "pl", name: "Polish", nativeName: "Polski", dir: "ltr", region: "PL", hand: true },
  { code: "ru", name: "Russian", nativeName: "Русский", dir: "ltr", region: "RU", hand: true },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", dir: "ltr", region: "UA", hand: true },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", dir: "ltr", region: "TR", hand: true },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl", region: "SA", hand: true },
  { code: "fa", name: "Persian", nativeName: "فارسی", dir: "rtl", region: "IR", hand: true },
  { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl", region: "PK", hand: true },
  { code: "he", name: "Hebrew", nativeName: "עברית", dir: "rtl", region: "IL", hand: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr", region: "IN", hand: true },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", dir: "ltr", region: "CN", hand: true },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", dir: "ltr", region: "TW", hand: true },
  { code: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr", region: "JP", hand: true },
  { code: "ko", name: "Korean", nativeName: "한국어", dir: "ltr", region: "KR", hand: true },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", dir: "ltr", region: "ID" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", dir: "ltr", region: "MY" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", dir: "ltr", region: "VN" },
  { code: "th", name: "Thai", nativeName: "ไทย", dir: "ltr", region: "TH" },
  { code: "fil", name: "Filipino", nativeName: "Filipino", dir: "ltr", region: "PH" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", dir: "ltr", region: "BD" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", dir: "ltr", region: "IN" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", dir: "ltr", region: "IN" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", dir: "ltr", region: "IN" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", dir: "ltr", region: "IN" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", dir: "ltr", region: "IN" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", dir: "ltr", region: "IN" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", dir: "ltr", region: "IN" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", dir: "ltr", region: "NP" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල", dir: "ltr", region: "LK" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာ", dir: "ltr", region: "MM" },
  { code: "km", name: "Khmer", nativeName: "ខ្មែរ", dir: "ltr", region: "KH" },
  { code: "lo", name: "Lao", nativeName: "ລາວ", dir: "ltr", region: "LA" },
  { code: "mn", name: "Mongolian", nativeName: "Монгол", dir: "ltr", region: "MN" },
  { code: "ka", name: "Georgian", nativeName: "ქართული", dir: "ltr", region: "GE" },
  { code: "hy", name: "Armenian", nativeName: "Հայերեն", dir: "ltr", region: "AM" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan", dir: "ltr", region: "AZ" },
  { code: "kk", name: "Kazakh", nativeName: "Қазақша", dir: "ltr", region: "KZ" },
  { code: "ky", name: "Kyrgyz", nativeName: "Кыргызча", dir: "ltr", region: "KG" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbekcha", dir: "ltr", region: "UZ" },
  { code: "tg", name: "Tajik", nativeName: "Тоҷикӣ", dir: "ltr", region: "TJ" },
  { code: "tk", name: "Turkmen", nativeName: "Türkmen", dir: "ltr", region: "TM" },
  { code: "ps", name: "Pashto", nativeName: "پښتو", dir: "rtl", region: "AF" },
  { code: "ku", name: "Kurdish", nativeName: "Kurdî", dir: "ltr", region: "TR" },
  { code: "ckb", name: "Central Kurdish", nativeName: "کوردیی ناوەندی", dir: "rtl", region: "IQ" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي", dir: "rtl", region: "PK" },
  { code: "dv", name: "Dhivehi", nativeName: "ދިވެހި", dir: "rtl", region: "MV" },
  { code: "ug", name: "Uyghur", nativeName: "ئۇيغۇرچە", dir: "rtl", region: "CN" },
  { code: "yi", name: "Yiddish", nativeName: "ייִדיש", dir: "rtl" },
  { code: "ca", name: "Catalan", nativeName: "Català", dir: "ltr", region: "ES" },
  { code: "eu", name: "Basque", nativeName: "Euskara", dir: "ltr", region: "ES" },
  { code: "gl", name: "Galician", nativeName: "Galego", dir: "ltr", region: "ES" },
  { code: "ast", name: "Asturian", nativeName: "Asturianu", dir: "ltr", region: "ES" },
  { code: "oc", name: "Occitan", nativeName: "Occitan", dir: "ltr", region: "FR" },
  { code: "br", name: "Breton", nativeName: "Brezhoneg", dir: "ltr", region: "FR" },
  { code: "co", name: "Corsican", nativeName: "Corsu", dir: "ltr", region: "FR" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg", dir: "ltr", region: "GB" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge", dir: "ltr", region: "IE" },
  { code: "gd", name: "Scottish Gaelic", nativeName: "Gàidhlig", dir: "ltr", region: "GB" },
  { code: "gv", name: "Manx", nativeName: "Gaelg", dir: "ltr", region: "IM" },
  { code: "kw", name: "Cornish", nativeName: "Kernewek", dir: "ltr", region: "GB" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska", dir: "ltr", region: "IS" },
  { code: "fo", name: "Faroese", nativeName: "Føroyskt", dir: "ltr", region: "FO" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", dir: "ltr", region: "NO" },
  { code: "nb", name: "Norwegian Bokmål", nativeName: "Norsk Bokmål", dir: "ltr", region: "NO" },
  { code: "nn", name: "Norwegian Nynorsk", nativeName: "Nynorsk", dir: "ltr", region: "NO" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", dir: "ltr", region: "SE" },
  { code: "da", name: "Danish", nativeName: "Dansk", dir: "ltr", region: "DK" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", dir: "ltr", region: "FI" },
  { code: "et", name: "Estonian", nativeName: "Eesti", dir: "ltr", region: "EE" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu", dir: "ltr", region: "LV" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių", dir: "ltr", region: "LT" },
  { code: "be", name: "Belarusian", nativeName: "Беларуская", dir: "ltr", region: "BY" },
  { code: "bg", name: "Bulgarian", nativeName: "Български", dir: "ltr", region: "BG" },
  { code: "ro", name: "Romanian", nativeName: "Română", dir: "ltr", region: "RO" },
  { code: "mo", name: "Moldovan", nativeName: "Moldovenească", dir: "ltr", region: "MD" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", dir: "ltr", region: "HU" },
  { code: "cs", name: "Czech", nativeName: "Čeština", dir: "ltr", region: "CZ" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina", dir: "ltr", region: "SK" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina", dir: "ltr", region: "SI" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", dir: "ltr", region: "HR" },
  { code: "sr", name: "Serbian", nativeName: "Српски", dir: "ltr", region: "RS" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski", dir: "ltr", region: "BA" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски", dir: "ltr", region: "MK" },
  { code: "sq", name: "Albanian", nativeName: "Shqip", dir: "ltr", region: "AL" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", dir: "ltr", region: "GR" },
  { code: "mt", name: "Maltese", nativeName: "Malti", dir: "ltr", region: "MT" },
  { code: "lb", name: "Luxembourgish", nativeName: "Lëtzebuergesch", dir: "ltr", region: "LU" },
  { code: "rm", name: "Romansh", nativeName: "Rumantsch", dir: "ltr", region: "CH" },
  { code: "fy", name: "Frisian", nativeName: "Frysk", dir: "ltr", region: "NL" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans", dir: "ltr", region: "ZA" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", dir: "ltr", region: "KE" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", dir: "ltr", region: "ET" },
  { code: "ti", name: "Tigrinya", nativeName: "ትግርኛ", dir: "ltr", region: "ER" },
  { code: "om", name: "Oromo", nativeName: "Afaan Oromoo", dir: "ltr", region: "ET" },
  { code: "so", name: "Somali", nativeName: "Soomaali", dir: "ltr", region: "SO" },
  { code: "ha", name: "Hausa", nativeName: "Hausa", dir: "ltr", region: "NG" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá", dir: "ltr", region: "NG" },
  { code: "ig", name: "Igbo", nativeName: "Igbo", dir: "ltr", region: "NG" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu", dir: "ltr", region: "ZA" },
  { code: "xh", name: "Xhosa", nativeName: "isiXhosa", dir: "ltr", region: "ZA" },
  { code: "st", name: "Southern Sotho", nativeName: "Sesotho", dir: "ltr", region: "ZA" },
  { code: "tn", name: "Tswana", nativeName: "Setswana", dir: "ltr", region: "BW" },
  { code: "rw", name: "Kinyarwanda", nativeName: "Kinyarwanda", dir: "ltr", region: "RW" },
  { code: "ny", name: "Chichewa", nativeName: "Chichewa", dir: "ltr", region: "MW" },
  { code: "mg", name: "Malagasy", nativeName: "Malagasy", dir: "ltr", region: "MG" },
  { code: "sn", name: "Shona", nativeName: "ChiShona", dir: "ltr", region: "ZW" },
  { code: "lg", name: "Ganda", nativeName: "Luganda", dir: "ltr", region: "UG" },
  { code: "wo", name: "Wolof", nativeName: "Wolof", dir: "ltr", region: "SN" },
  { code: "ff", name: "Fulah", nativeName: "Fulfulde", dir: "ltr", region: "SN" },
  { code: "bm", name: "Bambara", nativeName: "Bamanankan", dir: "ltr", region: "ML" },
  { code: "ee", name: "Ewe", nativeName: "Eʋegbe", dir: "ltr", region: "GH" },
  { code: "ak", name: "Akan", nativeName: "Akan", dir: "ltr", region: "GH" },
  { code: "tw", name: "Twi", nativeName: "Twi", dir: "ltr", region: "GH" },
  { code: "qu", name: "Quechua", nativeName: "Runa Simi", dir: "ltr", region: "PE" },
  { code: "ay", name: "Aymara", nativeName: "Aymar aru", dir: "ltr", region: "BO" },
  { code: "gn", name: "Guarani", nativeName: "Avañeʼẽ", dir: "ltr", region: "PY" },
  { code: "ht", name: "Haitian Creole", nativeName: "Kreyòl Ayisyen", dir: "ltr", region: "HT" },
  { code: "haw", name: "Hawaiian", nativeName: "ʻŌlelo Hawaiʻi", dir: "ltr", region: "US" },
  { code: "mi", name: "Maori", nativeName: "Te Reo Māori", dir: "ltr", region: "NZ" },
  { code: "sm", name: "Samoan", nativeName: "Gagana Sāmoa", dir: "ltr", region: "WS" },
  { code: "to", name: "Tongan", nativeName: "Lea Faka-Tonga", dir: "ltr", region: "TO" },
  { code: "fj", name: "Fijian", nativeName: "Vosa Vakaviti", dir: "ltr", region: "FJ" },
  { code: "eo", name: "Esperanto", nativeName: "Esperanto", dir: "ltr" },
  { code: "ia", name: "Interlingua", nativeName: "Interlingua", dir: "ltr" },
  { code: "la", name: "Latin", nativeName: "Latina", dir: "ltr" },
  { code: "yue", name: "Cantonese", nativeName: "粵語", dir: "ltr", region: "HK" },
  { code: "wuu", name: "Wu Chinese", nativeName: "吳語", dir: "ltr", region: "CN" },
  { code: "lzh", name: "Classical Chinese", nativeName: "文言", dir: "ltr" },
];

export const LANG_BY_CODE: Record<string, Language> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
);

export const SUPPORTED_CODES: string[] = LANGUAGES.map((l) => l.code);
export const HAND_CODES: string[] = LANGUAGES.filter((l) => l.hand).map((l) => l.code);
export const RTL_CODES: string[] = LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.code);

export const DEFAULT_LOCALE = "en";
export const FALLBACK_LOCALE = "en";

export function isSupported(code: string): boolean {
  return code in LANG_BY_CODE;
}

export function getDir(code: string): Direction {
  return LANG_BY_CODE[code]?.dir ?? "ltr";
}

export function resolveLocale(candidates: (string | undefined | null)[]): string {
  for (const raw of candidates) {
    if (!raw) continue;
    const c = raw.trim();
    if (!c) continue;
    if (LANG_BY_CODE[c]) return c;
    const base = c.split("-")[0];
    if (LANG_BY_CODE[base]) return base;
    const lower = c.toLowerCase();
    const found = LANGUAGES.find((l) => l.code.toLowerCase() === lower);
    if (found) return found.code;
  }
  return DEFAULT_LOCALE;
}

export function parseAcceptLanguage(header: string | undefined | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? parseFloat(q.split("=")[1]) : 1;
      return { tag: tag.trim(), q: isNaN(quality) ? 1 : quality };
    })
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}
