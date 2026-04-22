import { useState, useEffect } from "react";
import { Cookie, Settings, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const apiUrl = import.meta.env.VITE_API_URL || "";
const CONSENT_KEY = "codecloud_consent";

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [consents, setConsents] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      const dnt = navigator.doNotTrack === "1";
      if (dnt) {
        const autoConsent = { necessary: true, analytics: false, marketing: false };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(autoConsent));
        saveToServer(autoConsent);
      } else {
        setVisible(true);
      }
    }
  }, []);

  const saveToServer = async (state: ConsentState) => {
    try {
      await fetch(`${apiUrl}/api/consents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ consents: state }),
      });
    } catch {}
  };

  const handleAcceptAll = () => {
    const state = { necessary: true, analytics: true, marketing: true };
    setConsents(state);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    saveToServer(state);
    setVisible(false);
  };

  const handleRejectNonEssential = () => {
    const state = { necessary: true, analytics: false, marketing: false };
    setConsents(state);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    saveToServer(state);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consents));
    saveToServer(consents);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none" data-testid="cookie-consent">
      <div className="max-w-lg mx-auto bg-card border border-border rounded-xl shadow-2xl p-5 pointer-events-auto">
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Cookie Preferences</h3>
            <p className="text-xs text-muted-foreground mb-4">
              We use cookies to provide essential functionality, analyze usage, and improve your experience.
              You can customize your preferences below.
            </p>

            {expanded && (
              <div className="space-y-3 mb-4">
                <label className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div>
                    <span className="text-xs font-medium">Necessary</span>
                    <p className="text-[10px] text-muted-foreground">Required for the platform to function</p>
                  </div>
                  <input type="checkbox" checked={true} disabled className="rounded" />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-muted/30 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium">Analytics</span>
                    <p className="text-[10px] text-muted-foreground">Help us understand how you use the platform</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consents.analytics}
                    onChange={e => setConsents(prev => ({ ...prev, analytics: e.target.checked }))}
                    className="rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-muted/30 cursor-pointer">
                  <div>
                    <span className="text-xs font-medium">Marketing</span>
                    <p className="text-[10px] text-muted-foreground">Personalized content and promotions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consents.marketing}
                    onChange={e => setConsents(prev => ({ ...prev, marketing: e.target.checked }))}
                    className="rounded"
                  />
                </label>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {expanded ? (
                <Button size="sm" onClick={handleSavePreferences}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Save Preferences
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleAcceptAll}>Accept All</Button>
                  <Button size="sm" variant="outline" onClick={handleRejectNonEssential}>
                    Reject Non-Essential
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
                <Settings className="w-3.5 h-3.5 mr-1" /> {expanded ? "Hide" : "Customize"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
