import { detectLanguage as scriptDetect, LANG_BY_CODE } from "@workspace/i18n";

export interface DetectedLang {
  code: string;
  dir: "ltr" | "rtl";
  nativeName: string;
  confidence: number;
  source: "script" | "latin-hint" | "default";
}

export function detectUserLanguage(text: string): DetectedLang {
  const r = scriptDetect((text ?? "").trim());
  const lang = LANG_BY_CODE[r.code];
  return {
    code: r.code,
    dir: lang?.dir ?? "ltr",
    nativeName: lang?.nativeName ?? r.code,
    confidence: r.confidence,
    source: r.source,
  };
}

export function languageInstructionForPrompt(text: string): string {
  const detected = detectUserLanguage(text);
  if (detected.code === "en" || detected.confidence < 0.2) {
    return "Reply in the same language the user used. Default to English if unclear.";
  }
  return `Detected user language: ${detected.nativeName} (${detected.code}, ${detected.dir.toUpperCase()}, confidence ${detected.confidence.toFixed(2)}). Reply to the user in ${detected.nativeName}. Keep code identifiers, file paths, and shell commands in their original form.`;
}

// In-memory conversation language continuity: remembers the last confidently
// detected language per conversation so single-word follow-ups like "ok" don't
// regress to English.
const conversationLang = new Map<string, { code: string; nativeName: string; dir: "ltr" | "rtl" }>();

export function rememberConversationLanguage(conversationId: string | null | undefined, text: string): DetectedLang {
  const detected = detectUserLanguage(text);
  if (conversationId && detected.confidence >= 0.4) {
    conversationLang.set(conversationId, {
      code: detected.code,
      nativeName: detected.nativeName,
      dir: detected.dir,
    });
  }
  return detected;
}

export function languageInstructionForConversation(
  conversationId: string | null | undefined,
  text: string,
): string {
  const detected = rememberConversationLanguage(conversationId, text);
  const sticky = conversationId ? conversationLang.get(conversationId) : undefined;
  const effective = detected.confidence >= 0.4 ? detected : sticky
    ? { code: sticky.code, nativeName: sticky.nativeName, dir: sticky.dir, confidence: 1, source: "default" as const }
    : detected;
  if (effective.code === "en" || (!sticky && detected.confidence < 0.2)) {
    return "Reply in the same language the user used. Default to English if unclear.";
  }
  return `Detected user language: ${effective.nativeName} (${effective.code}, ${effective.dir.toUpperCase()}). Reply to the user in ${effective.nativeName}. Keep code identifiers, file paths, and shell commands in their original form.`;
}
