import { useState } from "react";
import { X, Puzzle, Power, PowerOff, Settings, Search, Download, Trash2, ChevronDown, ChevronRight, Check } from "lucide-react";
import { type ExtensionManifest, type ExtensionSettingDef, SAMPLE_EXTENSIONS, extensionHost } from "@/lib/extension-api";

interface Props { onClose: () => void; }

export function ExtensionManager({ onClose }: Props) {
  const [tab, setTab] = useState<"installed" | "marketplace">("installed");
  const [installed, setInstalled] = useState<(ExtensionManifest & { active: boolean })[]>(
    SAMPLE_EXTENSIONS.slice(0, 3).map(e => ({ ...e, active: true }))
  );
  const [marketplace] = useState(SAMPLE_EXTENSIONS.slice(3));
  const [search, setSearch] = useState("");
  const [expandedSettings, setExpandedSettings] = useState<string | null>(null);
  const [settingsValues, setSettingsValues] = useState<Record<string, Record<string, any>>>({});

  const toggleExtension = (id: string) => {
    setInstalled(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const installExtension = (ext: ExtensionManifest) => {
    if (!installed.find(e => e.id === ext.id)) {
      setInstalled(prev => [...prev, { ...ext, active: true }]);
    }
  };

  const uninstallExtension = (id: string) => {
    setInstalled(prev => prev.filter(e => e.id !== id));
    extensionHost.unloadExtension(id);
  };

  const updateSetting = (extId: string, key: string, value: any) => {
    setSettingsValues(prev => ({ ...prev, [extId]: { ...(prev[extId] || {}), [key]: value } }));
  };

  const getSettingValue = (extId: string, setting: ExtensionSettingDef) => {
    return settingsValues[extId]?.[setting.key] ?? setting.default;
  };

  const filteredInstalled = installed.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()));
  const filteredMarketplace = marketplace.filter(e =>
    (!search || e.name.toLowerCase().includes(search.toLowerCase())) && !installed.find(i => i.id === e.id)
  );

  return (
    <div className="h-full flex flex-col bg-background" data-testid="extension-manager">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Puzzle className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Extensions</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="px-3 py-1.5 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-1 bg-muted/50 rounded px-2 py-1">
          <Search className="w-3 h-3 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-xs outline-none" placeholder="Search extensions..." />
        </div>
      </div>

      <div className="flex border-b border-border/30 shrink-0">
        <button onClick={() => setTab("installed")} className={`flex-1 px-3 py-1 text-[11px] border-b-2 ${tab === "installed" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          Installed ({installed.length})
        </button>
        <button onClick={() => setTab("marketplace")} className={`flex-1 px-3 py-1 text-[11px] border-b-2 ${tab === "marketplace" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          Marketplace
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {tab === "installed" && filteredInstalled.map(ext => (
          <div key={ext.id} className="bg-card/50 rounded-lg border border-border/30 overflow-hidden">
            <div className="flex items-center gap-2 p-2">
              <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                <Puzzle className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">{ext.name}</span>
                  <span className="text-[10px] text-muted-foreground">v{ext.version}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{ext.description}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {ext.settings && ext.settings.length > 0 && (
                  <button onClick={() => setExpandedSettings(expandedSettings === ext.id ? null : ext.id)} className="p-1 hover:bg-muted rounded" title="Settings">
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
                <button onClick={() => toggleExtension(ext.id)} className={`p-1 rounded ${ext.active ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-muted"}`} title={ext.active ? "Disable" : "Enable"}>
                  {ext.active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                </button>
                <button onClick={() => uninstallExtension(ext.id)} className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded" title="Uninstall">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {ext.contributes?.commands && (
              <div className="px-2 pb-1.5 flex flex-wrap gap-1">
                {ext.contributes.commands.map(cmd => (
                  <span key={cmd.id} className="text-[9px] px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground">{cmd.title}</span>
                ))}
              </div>
            )}

            <div className="px-2 pb-1.5 flex flex-wrap gap-1">
              {ext.activationEvents.map(ev => (
                <span key={ev} className="text-[9px] px-1 py-0.5 bg-primary/5 border border-primary/10 rounded text-primary/70">{ev}</span>
              ))}
            </div>

            {expandedSettings === ext.id && ext.settings && (
              <div className="border-t border-border/30 p-2 space-y-2 bg-muted/20">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Settings</div>
                {ext.settings.map(setting => (
                  <div key={setting.key} className="space-y-0.5">
                    <label className="text-[10px] font-medium">{setting.label}</label>
                    {setting.description && <div className="text-[9px] text-muted-foreground">{setting.description}</div>}
                    {setting.type === "boolean" && (
                      <button onClick={() => updateSetting(ext.id, setting.key, !getSettingValue(ext.id, setting))} className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border ${getSettingValue(ext.id, setting) ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"}`}>
                        {getSettingValue(ext.id, setting) ? <Check className="w-2.5 h-2.5" /> : null}
                        {getSettingValue(ext.id, setting) ? "Enabled" : "Disabled"}
                      </button>
                    )}
                    {setting.type === "number" && (
                      <input type="number" value={getSettingValue(ext.id, setting)} onChange={e => updateSetting(ext.id, setting.key, Number(e.target.value))} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-[10px]" />
                    )}
                    {setting.type === "string" && (
                      <input value={getSettingValue(ext.id, setting)} onChange={e => updateSetting(ext.id, setting.key, e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-[10px]" />
                    )}
                    {setting.type === "select" && (
                      <select value={getSettingValue(ext.id, setting)} onChange={e => updateSetting(ext.id, setting.key, e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-[10px]">
                        {setting.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {tab === "marketplace" && filteredMarketplace.map(ext => (
          <div key={ext.id} className="bg-card/50 rounded-lg border border-border/30 p-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-muted/50 rounded-md flex items-center justify-center shrink-0">
                <Puzzle className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">{ext.name}</span>
                  <span className="text-[10px] text-muted-foreground">v{ext.version}</span>
                  <span className="text-[10px] text-muted-foreground">by {ext.author}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{ext.description}</div>
              </div>
              <button onClick={() => installExtension(ext)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary text-primary-foreground rounded hover:bg-primary/90 shrink-0">
                <Download className="w-2.5 h-2.5" /> Install
              </button>
            </div>
            {ext.permissions && ext.permissions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ext.permissions.map(p => (
                  <span key={p} className="text-[9px] px-1 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded text-yellow-400">{p}</span>
                ))}
              </div>
            )}
          </div>
        ))}

        {tab === "installed" && filteredInstalled.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">No extensions installed</div>}
        {tab === "marketplace" && filteredMarketplace.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">No extensions available</div>}
      </div>

      <div className="px-3 py-1.5 border-t border-border/30 text-[10px] text-muted-foreground shrink-0">
        {installed.filter(e => e.active).length} active · {installed.length} installed
      </div>
    </div>
  );
}
