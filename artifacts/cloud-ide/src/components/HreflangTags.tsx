import { useEffect } from "react";
import { LANGUAGES } from "@workspace/i18n";

interface HreflangTagsProps {
  path?: string;
}

function siteOrigin(): string {
  if (typeof window === "undefined") return "https://codecloud.dev";
  return window.location.origin;
}

export default function HreflangTags({ path = "/" }: HreflangTagsProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const origin = siteOrigin();
    document
      .querySelectorAll('link[rel="alternate"][data-i18n="hreflang"]')
      .forEach((el) => el.remove());

    for (const lang of LANGUAGES) {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", lang.code);
      link.setAttribute("href", `${origin}/${lang.code}${path === "/" ? "" : path}`);
      link.setAttribute("data-i18n", "hreflang");
      document.head.appendChild(link);
    }

    const xDefault = document.createElement("link");
    xDefault.setAttribute("rel", "alternate");
    xDefault.setAttribute("hreflang", "x-default");
    xDefault.setAttribute("href", `${origin}${path}`);
    xDefault.setAttribute("data-i18n", "hreflang");
    document.head.appendChild(xDefault);

    return () => {
      document
        .querySelectorAll('link[rel="alternate"][data-i18n="hreflang"]')
        .forEach((el) => el.remove());
    };
  }, [path]);

  return null;
}
