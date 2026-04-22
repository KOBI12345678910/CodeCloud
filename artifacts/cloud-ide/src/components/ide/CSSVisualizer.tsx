import React, { useState } from "react";
import {
  LayoutGrid, AlignHorizontalJustifyCenter, X, Copy, Check,
  ChevronDown, ChevronRight, Plus, Trash2, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DisplayType = "grid" | "flex";

interface GridConfig {
  columns: string;
  rows: string;
  gap: string;
  alignItems: string;
  justifyItems: string;
  templateAreas: string;
}

interface FlexConfig {
  direction: string;
  wrap: string;
  justifyContent: string;
  alignItems: string;
  gap: string;
}

interface FlexChildConfig {
  id: string;
  order: number;
  flexGrow: number;
  flexShrink: number;
  flexBasis: string;
  alignSelf: string;
}

interface CSSVisualizerProps {
  onClose?: () => void;
}

export default function CSSVisualizer({ onClose }: CSSVisualizerProps): React.ReactElement {
  const [displayType, setDisplayType] = useState<DisplayType>("grid");
  const [copied, setCopied] = useState(false);
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    columns: "1fr 1fr 1fr", rows: "auto", gap: "8px",
    alignItems: "stretch", justifyItems: "stretch", templateAreas: "",
  });
  const [flexConfig, setFlexConfig] = useState<FlexConfig>({
    direction: "row", wrap: "nowrap", justifyContent: "flex-start",
    alignItems: "stretch", gap: "8px",
  });
  const [flexChildren, setFlexChildren] = useState<FlexChildConfig[]>([
    { id: "c1", order: 0, flexGrow: 0, flexShrink: 1, flexBasis: "auto", alignSelf: "auto" },
    { id: "c2", order: 0, flexGrow: 1, flexShrink: 1, flexBasis: "auto", alignSelf: "auto" },
    { id: "c3", order: 0, flexGrow: 0, flexShrink: 1, flexBasis: "auto", alignSelf: "auto" },
  ]);
  const [gridItems] = useState([1, 2, 3, 4, 5, 6]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["container", "children"]));

  const toggleSection = (s: string) => setExpandedSections(prev => {
    const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n;
  });

  const generateCSS = (): string => {
    if (displayType === "grid") {
      let css = `.container {\n  display: grid;\n  grid-template-columns: ${gridConfig.columns};\n`;
      if (gridConfig.rows !== "auto") css += `  grid-template-rows: ${gridConfig.rows};\n`;
      css += `  gap: ${gridConfig.gap};\n  align-items: ${gridConfig.alignItems};\n  justify-items: ${gridConfig.justifyItems};\n`;
      if (gridConfig.templateAreas) css += `  grid-template-areas: ${gridConfig.templateAreas};\n`;
      css += `}`;
      return css;
    } else {
      let css = `.container {\n  display: flex;\n  flex-direction: ${flexConfig.direction};\n  flex-wrap: ${flexConfig.wrap};\n  justify-content: ${flexConfig.justifyContent};\n  align-items: ${flexConfig.alignItems};\n  gap: ${flexConfig.gap};\n}\n`;
      flexChildren.forEach((child, i) => {
        const hasCustom = child.flexGrow !== 0 || child.flexShrink !== 1 || child.flexBasis !== "auto" || child.alignSelf !== "auto" || child.order !== 0;
        if (hasCustom) {
          css += `\n.child-${i + 1} {\n`;
          if (child.order !== 0) css += `  order: ${child.order};\n`;
          css += `  flex: ${child.flexGrow} ${child.flexShrink} ${child.flexBasis};\n`;
          if (child.alignSelf !== "auto") css += `  align-self: ${child.alignSelf};\n`;
          css += `}\n`;
        }
      });
      return css;
    }
  };

  const copyCSS = () => {
    navigator.clipboard.writeText(generateCSS());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SelectField = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-500">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="bg-[#1e1e1e] text-xs text-gray-300 rounded px-1 py-0.5 outline-none border border-[#444]">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const gridStyle: React.CSSProperties = displayType === "grid" ? {
    display: "grid",
    gridTemplateColumns: gridConfig.columns,
    gridTemplateRows: gridConfig.rows,
    gap: gridConfig.gap,
    alignItems: gridConfig.alignItems as any,
    justifyItems: gridConfig.justifyItems as any,
  } : {
    display: "flex",
    flexDirection: flexConfig.direction as any,
    flexWrap: flexConfig.wrap as any,
    justifyContent: flexConfig.justifyContent,
    alignItems: flexConfig.alignItems,
    gap: flexConfig.gap,
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <LayoutGrid size={14} className="text-purple-400" />
          <span className="text-xs font-medium">CSS Layout Visualizer</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyCSS} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">
            {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? "Copied!" : "Copy CSS"}
          </button>
          {onClose && <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300"><X size={12} /></button>}
        </div>
      </div>

      <div className="flex items-center border-b border-[#333]">
        {(["grid", "flex"] as DisplayType[]).map(t => (
          <button key={t} onClick={() => setDisplayType(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium ${displayType === t ? "bg-[#1e1e1e] text-gray-200 border-b border-primary" : "bg-[#252526] text-gray-500"}`}>
            {t === "grid" ? <LayoutGrid size={10} /> : <AlignHorizontalJustifyCenter size={10} />}
            {t === "grid" ? "CSS Grid" : "Flexbox"}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-52 border-r border-[#333] overflow-y-auto shrink-0">
          <div>
            <button onClick={() => toggleSection("container")} className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-gray-400 hover:bg-[#2a2d2e]">
              {expandedSections.has("container") ? <ChevronDown size={10} /> : <ChevronRight size={10} />} Container
            </button>
            {expandedSections.has("container") && (
              <div className="px-3 py-1 space-y-1.5">
                {displayType === "grid" ? (<>
                  <div>
                    <span className="text-[10px] text-gray-500">Columns</span>
                    <input value={gridConfig.columns} onChange={e => setGridConfig(p => ({ ...p, columns: e.target.value }))}
                      className="w-full bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono outline-none mt-0.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500">Rows</span>
                    <input value={gridConfig.rows} onChange={e => setGridConfig(p => ({ ...p, rows: e.target.value }))}
                      className="w-full bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono outline-none mt-0.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500">Gap</span>
                    <input value={gridConfig.gap} onChange={e => setGridConfig(p => ({ ...p, gap: e.target.value }))}
                      className="w-full bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono outline-none mt-0.5" />
                  </div>
                  <SelectField label="align-items" value={gridConfig.alignItems} options={["stretch", "start", "end", "center", "baseline"]} onChange={v => setGridConfig(p => ({ ...p, alignItems: v }))} />
                  <SelectField label="justify-items" value={gridConfig.justifyItems} options={["stretch", "start", "end", "center"]} onChange={v => setGridConfig(p => ({ ...p, justifyItems: v }))} />
                </>) : (<>
                  <SelectField label="direction" value={flexConfig.direction} options={["row", "row-reverse", "column", "column-reverse"]} onChange={v => setFlexConfig(p => ({ ...p, direction: v }))} />
                  <SelectField label="wrap" value={flexConfig.wrap} options={["nowrap", "wrap", "wrap-reverse"]} onChange={v => setFlexConfig(p => ({ ...p, wrap: v }))} />
                  <SelectField label="justify-content" value={flexConfig.justifyContent} options={["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"]} onChange={v => setFlexConfig(p => ({ ...p, justifyContent: v }))} />
                  <SelectField label="align-items" value={flexConfig.alignItems} options={["stretch", "flex-start", "flex-end", "center", "baseline"]} onChange={v => setFlexConfig(p => ({ ...p, alignItems: v }))} />
                  <div>
                    <span className="text-[10px] text-gray-500">Gap</span>
                    <input value={flexConfig.gap} onChange={e => setFlexConfig(p => ({ ...p, gap: e.target.value }))}
                      className="w-full bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono outline-none mt-0.5" />
                  </div>
                </>)}
              </div>
            )}
          </div>
          {displayType === "flex" && (
            <div>
              <button onClick={() => toggleSection("children")} className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-gray-400 hover:bg-[#2a2d2e]">
                {expandedSections.has("children") ? <ChevronDown size={10} /> : <ChevronRight size={10} />} Children ({flexChildren.length})
              </button>
              {expandedSections.has("children") && (
                <div className="px-3 py-1 space-y-2">
                  {flexChildren.map((child, i) => (
                    <div key={child.id} className="bg-[#2a2d2e] rounded p-1.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-400">Child {i + 1}</span>
                        <button onClick={() => setFlexChildren(p => p.filter(c => c.id !== child.id))} className="text-gray-600 hover:text-red-400"><Trash2 size={8} /></button>
                      </div>
                      <div className="flex items-center gap-1 text-[9px]">
                        <span className="text-gray-600 w-8">grow</span>
                        <input type="number" min={0} value={child.flexGrow} onChange={e => { const n = [...flexChildren]; n[i] = { ...n[i], flexGrow: +e.target.value }; setFlexChildren(n); }}
                          className="w-10 bg-[#1e1e1e] px-1 py-0.5 rounded text-center outline-none" />
                        <span className="text-gray-600 w-10">shrink</span>
                        <input type="number" min={0} value={child.flexShrink} onChange={e => { const n = [...flexChildren]; n[i] = { ...n[i], flexShrink: +e.target.value }; setFlexChildren(n); }}
                          className="w-10 bg-[#1e1e1e] px-1 py-0.5 rounded text-center outline-none" />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setFlexChildren(p => [...p, { id: `c${Date.now()}`, order: 0, flexGrow: 0, flexShrink: 1, flexBasis: "auto", alignSelf: "auto" }])}
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"><Plus size={10} /> Add Child</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-auto">
            <div className="border-2 border-dashed border-purple-500/30 rounded-lg p-3 min-h-[120px] relative" style={gridStyle}>
              {(displayType === "grid" ? gridItems : flexChildren).map((item, i) => {
                const childStyle: React.CSSProperties = displayType === "flex" ? {
                  flexGrow: flexChildren[i]?.flexGrow ?? 0,
                  flexShrink: flexChildren[i]?.flexShrink ?? 1,
                  flexBasis: flexChildren[i]?.flexBasis ?? "auto",
                  alignSelf: (flexChildren[i]?.alignSelf ?? "auto") as any,
                  order: flexChildren[i]?.order ?? 0,
                } : {};
                return (
                  <div key={typeof item === "number" ? item : (item as FlexChildConfig).id} style={childStyle}
                    className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-md p-3 flex items-center justify-center text-xs font-mono text-purple-300 min-h-[40px] min-w-[40px]">
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#333] bg-[#252526]">
            <pre className="px-3 py-2 text-[10px] font-mono text-gray-400 max-h-24 overflow-y-auto whitespace-pre">{generateCSS()}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
