import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { LayoutGrid, Search, Copy, Eye, Code2, Sparkles, Heart, Filter, CheckCircle2, Layers, Type, ToggleLeft, Table2, CreditCard, Navigation, AlertCircle, BarChart3, FormInput, ImageIcon, ListTree, Mail } from "lucide-react";

interface Component { id: string; name: string; description: string; category: string; icon: any; variants: number; props: number; accessibility: boolean; responsive: boolean; animated: boolean; popular: boolean; code: string; }

const COMPONENTS: Component[] = [
  { id: "c1", name: "Button", description: "Versatile button with multiple variants, sizes, loading states, and icon support", category: "actions", icon: ToggleLeft, variants: 8, props: 12, accessibility: true, responsive: true, animated: true, popular: true, code: '<Button variant="primary" size="md">Click me</Button>' },
  { id: "c2", name: "Card", description: "Flexible card container with header, body, footer sections and hover effects", category: "layout", icon: CreditCard, variants: 5, props: 8, accessibility: true, responsive: true, animated: true, popular: true, code: '<Card><CardHeader>Title</CardHeader><CardBody>Content</CardBody></Card>' },
  { id: "c3", name: "DataTable", description: "Advanced data table with sorting, filtering, pagination, and column resizing", category: "data", icon: Table2, variants: 3, props: 22, accessibility: true, responsive: true, animated: false, popular: true, code: '<DataTable columns={cols} data={rows} sortable paginated />' },
  { id: "c4", name: "Modal", description: "Accessible dialog with backdrop blur, animations, and nested scroll support", category: "overlay", icon: Layers, variants: 4, props: 10, accessibility: true, responsive: true, animated: true, popular: true, code: '<Modal open={isOpen} onClose={close}><ModalBody>...</ModalBody></Modal>' },
  { id: "c5", name: "Form", description: "Form with validation, field groups, inline errors, and submit handling", category: "forms", icon: FormInput, variants: 2, props: 15, accessibility: true, responsive: true, animated: false, popular: false, code: '<Form onSubmit={handle}><Field name="email" rules={required} /></Form>' },
  { id: "c6", name: "Navigation", description: "Responsive navbar with dropdown menus, mobile drawer, and active indicators", category: "navigation", icon: Navigation, variants: 6, props: 14, accessibility: true, responsive: true, animated: true, popular: false, code: '<Navbar items={menuItems} logo={<Logo />} />' },
  { id: "c7", name: "Alert", description: "Contextual feedback messages with dismiss, action buttons, and icons", category: "feedback", icon: AlertCircle, variants: 5, props: 7, accessibility: true, responsive: true, animated: true, popular: false, code: '<Alert type="warning" dismissible>Warning message</Alert>' },
  { id: "c8", name: "Chart", description: "Interactive charts powered by Recharts — line, bar, area, pie, radar", category: "data", icon: BarChart3, variants: 8, props: 18, accessibility: false, responsive: true, animated: true, popular: true, code: '<Chart type="line" data={data} xKey="date" yKey="value" />' },
  { id: "c9", name: "Avatar", description: "User avatar with fallback initials, status indicator, and group stacking", category: "display", icon: ImageIcon, variants: 4, props: 6, accessibility: true, responsive: false, animated: false, popular: false, code: '<Avatar src={url} fallback="JD" status="online" />' },
  { id: "c10", name: "Tree View", description: "Expandable tree structure with drag-and-drop, multi-select, and lazy loading", category: "data", icon: ListTree, variants: 3, props: 12, accessibility: true, responsive: false, animated: true, popular: false, code: '<TreeView data={nodes} onSelect={handleSelect} draggable />' },
  { id: "c11", name: "Toast", description: "Non-blocking notification system with stacking, actions, and auto-dismiss", category: "feedback", icon: Mail, variants: 5, props: 8, accessibility: true, responsive: true, animated: true, popular: true, code: 'toast.success("Changes saved!", { duration: 3000 })' },
  { id: "c12", name: "Typography", description: "Consistent text styles with heading levels, body, caption, and code variants", category: "display", icon: Type, variants: 10, props: 5, accessibility: true, responsive: true, animated: false, popular: false, code: '<Heading level={2}>Section Title</Heading>' },
];

const CATEGORIES = ["all", "actions", "layout", "data", "overlay", "forms", "navigation", "feedback", "display"];

export default function ComponentLibraryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = COMPONENTS.filter(c => {
    if (category !== "all" && c.category !== category) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <FeaturePageLayout title="Component Library" description="Pre-built, accessible UI components ready to drag into your project" icon={<LayoutGrid className="w-7 h-7 text-white" />} badge={`${COMPONENTS.length} Components`}>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-white">{COMPONENTS.length}</p><p className="text-xs text-gray-400">Components</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-purple-400">{COMPONENTS.reduce((a, c) => a + c.variants, 0)}</p><p className="text-xs text-gray-400">Total Variants</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-green-400">{COMPONENTS.filter(c => c.accessibility).length}</p><p className="text-xs text-gray-400">A11y Ready</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-blue-400">{COMPONENTS.filter(c => c.responsive).length}</p><p className="text-xs text-gray-400">Responsive</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search components..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm rounded-lg transition-all">
          <Sparkles className="w-4 h-4" /> AI Generate
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${category === c ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(comp => {
          const Icon = comp.icon;
          return (
            <div key={comp.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.07] transition-all group">
              <div className="h-32 bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center relative">
                <Icon className="w-12 h-12 text-blue-400/40" />
                {comp.popular && <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[10px] font-bold rounded-full"><Heart className="w-2.5 h-2.5" /> Popular</div>}
                <div className="absolute top-2 right-2 flex gap-1">
                  {comp.accessibility && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full">A11y</span>}
                  {comp.animated && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full">Animated</span>}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-white">{comp.name}</h3>
                  <span className="text-xs text-gray-500">{comp.variants} variants</span>
                </div>
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">{comp.description}</p>
                <div className="bg-black/30 rounded-lg p-2 mb-3 relative group/code">
                  <code className="text-[10px] text-green-400 font-mono">{comp.code}</code>
                  <button onClick={() => copyCode(comp.id, comp.code)} className="absolute top-1 right-1 p-1 bg-white/10 rounded opacity-0 group-hover/code:opacity-100 transition-opacity">
                    {copied === comp.id ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{comp.props} props</span>
                  <div className="flex gap-1">
                    <button className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-400 text-xs rounded-lg transition-colors flex items-center gap-1"><Eye className="w-3 h-3" /> Preview</button>
                    <button className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors flex items-center gap-1"><Code2 className="w-3 h-3" /> Use</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </FeaturePageLayout>
  );
}
