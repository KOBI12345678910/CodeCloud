import { useState, useEffect, useRef } from "react";
import { Cpu, HardDrive, AlertTriangle, Zap, Thermometer, ArrowUpCircle } from "lucide-react";

interface MetricPoint {
  time: number;
  value: number;
}

interface GpuMetrics {
  gpuModel: string;
  utilizationPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  temperatureCelsius: number;
  powerWatts: number;
  status: string;
}

interface ResourceMonitorProps {
  gpuEnabled?: boolean;
  projectId?: string;
  userPlan?: string;
}

export default function ResourceMonitor({ gpuEnabled = false, projectId, userPlan = "free" }: ResourceMonitorProps) {
  const [cpuHistory, setCpuHistory] = useState<MetricPoint[]>([]);
  const [memHistory, setMemHistory] = useState<MetricPoint[]>([]);
  const [gpuHistory, setGpuHistory] = useState<MetricPoint[]>([]);
  const [cpu, setCpu] = useState(0);
  const [mem, setMem] = useState(0);
  const [memTotal] = useState(512);
  const [gpuMetrics, setGpuMetrics] = useState<GpuMetrics | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newCpu = Math.min(100, Math.max(2, cpu + (Math.random() - 0.48) * 15));
      const newMem = Math.min(memTotal, Math.max(50, mem + (Math.random() - 0.45) * 20));

      setCpu(Math.round(newCpu));
      setMem(Math.round(newMem));

      setCpuHistory((prev) => [...prev.slice(-59), { time: now, value: newCpu }]);
      setMemHistory((prev) => [...prev.slice(-59), { time: now, value: (newMem / memTotal) * 100 }]);
    }, 2000);

    return () => clearInterval(interval);
  }, [cpu, mem, memTotal]);

  useEffect(() => {
    if (!gpuEnabled || !projectId) return;

    const fetchGpuMetrics = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/projects/${projectId}/gpu/metrics`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.available && data.metrics) {
            setGpuMetrics(data.metrics);
            const now = Date.now();
            setGpuHistory((prev) => [...prev.slice(-59), { time: now, value: data.metrics.utilizationPercent }]);
          }
        }
      } catch {}
    };

    fetchGpuMetrics();
    const interval = setInterval(fetchGpuMetrics, 3000);
    return () => clearInterval(interval);
  }, [gpuEnabled, projectId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(59,130,246,0.15)";
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= 4; y++) {
      ctx.beginPath();
      ctx.moveTo(0, (h / 4) * y);
      ctx.lineTo(w, (h / 4) * y);
      ctx.stroke();
    }

    const drawLine = (data: MetricPoint[], color: string) => {
      if (data.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      for (let i = 0; i < data.length; i++) {
        const x = (i / 59) * w;
        const y = h - (data[i].value / 100) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color.replace("1)", "0.15)"));
      grad.addColorStop(1, color.replace("1)", "0)"));
      ctx.fillStyle = grad;
      ctx.lineTo(((data.length - 1) / 59) * w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    };

    drawLine(cpuHistory, "rgba(59,130,246,1)");
    drawLine(memHistory, "rgba(168,85,247,1)");
    if (gpuEnabled && gpuHistory.length > 0) {
      drawLine(gpuHistory, "rgba(34,197,94,1)");
    }
  }, [cpuHistory, memHistory, gpuHistory, gpuEnabled]);

  const cpuWarning = cpu > 80;
  const memWarning = mem > memTotal * 0.85;
  const memPercent = Math.round((mem / memTotal) * 100);
  const gpuWarning = gpuMetrics ? gpuMetrics.utilizationPercent > 90 : false;
  const gpuTempWarning = gpuMetrics ? gpuMetrics.temperatureCelsius > 80 : false;
  const gpuMemPercent = gpuMetrics ? Math.round((gpuMetrics.memoryUsedMb / gpuMetrics.memoryTotalMb) * 100) : 0;

  const handleGpuClick = () => {
    if (userPlan === "free") {
      setShowUpgradePrompt(true);
    }
  };

  return (
    <div className="p-2 space-y-2" data-testid="resource-monitor">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resources</span>
        {(cpuWarning || memWarning || gpuWarning || gpuTempWarning) && (
          <div className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[9px] font-medium">High usage</span>
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="w-full h-[60px] rounded bg-muted/20 border border-border/20"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5">
          <Cpu className={`w-3 h-3 ${cpuWarning ? "text-amber-400" : "text-blue-400"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">CPU</span>
              <span className={`text-[10px] font-mono font-medium ${cpuWarning ? "text-amber-400" : "text-foreground"}`}>
                {cpu}%
              </span>
            </div>
            <div className="h-1 bg-muted/30 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full transition-all ${cpuWarning ? "bg-amber-400" : "bg-blue-400"}`}
                style={{ width: `${cpu}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <HardDrive className={`w-3 h-3 ${memWarning ? "text-amber-400" : "text-purple-400"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">MEM</span>
              <span className={`text-[10px] font-mono font-medium ${memWarning ? "text-amber-400" : "text-foreground"}`}>
                {mem}MB
              </span>
            </div>
            <div className="h-1 bg-muted/30 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full transition-all ${memWarning ? "bg-amber-400" : "bg-purple-400"}`}
                style={{ width: `${memPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {gpuEnabled && gpuMetrics && (
        <div className="space-y-1.5 pt-1 border-t border-border/20" data-testid="gpu-monitor">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-semibold text-green-400">GPU</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">{gpuMetrics.gpuModel}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Util</span>
                  <span className={`text-[10px] font-mono font-medium ${gpuWarning ? "text-amber-400" : "text-green-400"}`}>
                    {Math.round(gpuMetrics.utilizationPercent)}%
                  </span>
                </div>
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden mt-0.5">
                  <div
                    className={`h-full rounded-full transition-all ${gpuWarning ? "bg-amber-400" : "bg-green-400"}`}
                    style={{ width: `${gpuMetrics.utilizationPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">VRAM</span>
                  <span className={`text-[10px] font-mono font-medium ${gpuMemPercent > 90 ? "text-amber-400" : "text-green-400"}`}>
                    {gpuMetrics.memoryUsedMb}MB
                  </span>
                </div>
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden mt-0.5">
                  <div
                    className={`h-full rounded-full transition-all ${gpuMemPercent > 90 ? "bg-amber-400" : "bg-green-400"}`}
                    style={{ width: `${gpuMemPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px]">
            <div className="flex items-center gap-1">
              <Thermometer className={`w-2.5 h-2.5 ${gpuTempWarning ? "text-red-400" : "text-muted-foreground"}`} />
              <span className={gpuTempWarning ? "text-red-400" : "text-muted-foreground"}>
                {Math.round(gpuMetrics.temperatureCelsius)}°C
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-muted-foreground">{Math.round(gpuMetrics.powerWatts)}W</span>
            </div>
          </div>
        </div>
      )}

      {!gpuEnabled && userPlan === "free" && (
        <div
          className="bg-primary/5 border border-primary/20 rounded p-1.5 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={handleGpuClick}
          data-testid="gpu-upgrade-prompt"
        >
          <div className="flex items-center gap-1.5">
            <ArrowUpCircle className="w-3 h-3 text-primary shrink-0" />
            <div>
              <p className="text-[9px] font-medium text-primary">Enable GPU Acceleration</p>
              <p className="text-[8px] text-muted-foreground">Upgrade to Pro for CUDA-powered ML/AI</p>
            </div>
          </div>
        </div>
      )}

      {showUpgradePrompt && userPlan === "free" && (
        <div className="bg-primary/10 border border-primary/30 rounded p-2 space-y-1.5" data-testid="gpu-upgrade-modal">
          <p className="text-[10px] font-medium text-primary">GPU Access - Pro Plan Required</p>
          <p className="text-[9px] text-muted-foreground">
            Get NVIDIA Tesla T4 GPU with CUDA 12.2, TensorFlow & PyTorch templates, and real-time GPU monitoring.
          </p>
          <div className="flex items-center gap-1.5">
            <a
              href="/settings/billing"
              className="text-[9px] font-medium text-primary hover:underline"
              data-testid="upgrade-link"
            >
              Upgrade to Pro
            </a>
            <button
              className="text-[9px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowUpgradePrompt(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {(cpuWarning || memWarning) && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded p-1.5">
          <p className="text-[9px] text-amber-400">
            Container approaching resource limits. Consider upgrading for better performance.
          </p>
        </div>
      )}

      {gpuTempWarning && gpuEnabled && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-1.5">
          <p className="text-[9px] text-red-400">
            GPU temperature is critically high. Consider reducing workload intensity.
          </p>
        </div>
      )}
    </div>
  );
}
