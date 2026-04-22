import { LANG_BY_CODE, DEFAULT_LOCALE, isSupported } from "./registry/languages";

interface ScriptRange {
  code: string;
  ranges: [number, number][];
}

const SCRIPT_RANGES: ScriptRange[] = [
  { code: "ar", ranges: [[0x0600, 0x06ff], [0x0750, 0x077f], [0xfb50, 0xfdff], [0xfe70, 0xfeff]] },
  { code: "he", ranges: [[0x0590, 0x05ff], [0xfb1d, 0xfb4f]] },
  { code: "fa", ranges: [[0x0600, 0x06ff]] },
  { code: "zh-CN", ranges: [[0x4e00, 0x9fff], [0x3400, 0x4dbf]] },
  { code: "ja", ranges: [[0x3040, 0x309f], [0x30a0, 0x30ff]] },
  { code: "ko", ranges: [[0xac00, 0xd7af], [0x1100, 0x11ff], [0x3130, 0x318f]] },
  { code: "th", ranges: [[0x0e00, 0x0e7f]] },
  { code: "el", ranges: [[0x0370, 0x03ff], [0x1f00, 0x1fff]] },
  { code: "ru", ranges: [[0x0400, 0x04ff]] },
  { code: "hi", ranges: [[0x0900, 0x097f]] },
  { code: "bn", ranges: [[0x0980, 0x09ff]] },
  { code: "ta", ranges: [[0x0b80, 0x0bff]] },
  { code: "te", ranges: [[0x0c00, 0x0c7f]] },
  { code: "kn", ranges: [[0x0c80, 0x0cff]] },
  { code: "ml", ranges: [[0x0d00, 0x0d7f]] },
  { code: "gu", ranges: [[0x0a80, 0x0aff]] },
  { code: "pa", ranges: [[0x0a00, 0x0a7f]] },
  { code: "my", ranges: [[0x1000, 0x109f]] },
  { code: "km", ranges: [[0x1780, 0x17ff]] },
  { code: "lo", ranges: [[0x0e80, 0x0eff]] },
  { code: "ka", ranges: [[0x10a0, 0x10ff]] },
  { code: "hy", ranges: [[0x0530, 0x058f]] },
  { code: "am", ranges: [[0x1200, 0x137f]] },
];

const LATIN_HINTS: Record<string, RegExp[]> = {
  es: [/\b(el|la|los|las|que|de|para|con|por|este|esta)\b/i, /\b(hola|gracias|por favor)\b/i, /[ñáéíóúü]/i],
  pt: [/\b(o|a|os|as|que|para|com|por|não|você|obrigad[ao])\b/i, /[ãõçáéíóúâê]/i],
  fr: [/\b(le|la|les|de|des|que|pour|avec|bonjour|merci|c'est)\b/i, /[àâçéèêëîïôûüÿ]/i],
  de: [/\b(der|die|das|und|nicht|ist|für|mit|sind|bitte|danke|hallo)\b/i, /[äöüß]/i],
  it: [/\b(il|la|gli|le|di|che|per|con|sono|ciao|grazie)\b/i, /[àèéìòù]/i],
  nl: [/\b(de|het|een|en|niet|ik|hallo|dank)\b/i],
  pl: [/\b(jest|nie|tak|dziękuję|cześć|proszę)\b/i, /[ąćęłńóśźż]/i],
  tr: [/\b(bir|ve|ile|için|merhaba|teşekkür)\b/i, /[çğıöşü]/i],
  vi: [/[ăâđêôơư]/i, /\b(không|cảm ơn|xin chào)\b/i],
  id: [/\b(yang|tidak|untuk|terima kasih|halo)\b/i],
};

export interface DetectionResult {
  code: string;
  confidence: number;
  source: "script" | "latin-hint" | "default";
}

export function detectLanguage(text: string): DetectionResult {
  if (!text) return { code: DEFAULT_LOCALE, confidence: 0, source: "default" };

  const counts = new Map<string, number>();
  let total = 0;

  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp < 0x0080) continue;
    total++;
    for (const { code, ranges } of SCRIPT_RANGES) {
      for (const [lo, hi] of ranges) {
        if (cp >= lo && cp <= hi) {
          counts.set(code, (counts.get(code) ?? 0) + 1);
          break;
        }
      }
    }
  }

  if (total > 4) {
    let best: { code: string; n: number } | null = null;
    for (const [code, n] of counts) {
      if (!best || n > best.n) best = { code, n };
    }
    if (best && best.n / Math.max(total, 1) > 0.3) {
      return { code: best.code, confidence: Math.min(1, best.n / total), source: "script" };
    }
  }

  let bestHint: { code: string; score: number } | null = null;
  for (const [code, regexes] of Object.entries(LATIN_HINTS)) {
    let score = 0;
    for (const re of regexes) if (re.test(text)) score++;
    if (score > 0 && (!bestHint || score > bestHint.score)) bestHint = { code, score };
  }
  if (bestHint && bestHint.score >= 1) {
    return { code: bestHint.code, confidence: Math.min(1, bestHint.score / 3), source: "latin-hint" };
  }

  return { code: DEFAULT_LOCALE, confidence: 0, source: "default" };
}

export function detectAndResolve(text: string): string {
  const r = detectLanguage(text);
  return isSupported(r.code) && r.confidence > 0 ? r.code : DEFAULT_LOCALE;
}

export function languageName(code: string, displayLocale = "en"): string {
  try {
    const dn = new Intl.DisplayNames([displayLocale], { type: "language" });
    return dn.of(code) ?? LANG_BY_CODE[code]?.name ?? code;
  } catch {
    return LANG_BY_CODE[code]?.name ?? code;
  }
}
