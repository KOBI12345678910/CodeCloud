import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal as TerminalIcon, Plus, X, Search, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Terminal as XTermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";

interface TerminalTab {
  id: string;
  name: string;
  terminal: XTermTerminal | null;
  fitAddon: FitAddon | null;
  searchAddon: SearchAddon | null;
  history: string[];
  historyIndex: number;
  currentLine: string;
  cwd: string;
}

interface SocketIOHandle {
  connected: boolean;
  terminalConnected: boolean;
  createTerminal: (sessionId: string, shared?: boolean) => void;
  joinTerminal: (sessionId: string) => void;
  sendTerminalInput: (sessionId: string, data: string) => void;
  resizeTerminal: (sessionId: string, cols: number, rows: number) => void;
  leaveTerminal: (sessionId: string) => void;
  onTerminalOutput: (cb: (data: { sessionId: string; data: string }) => void) => () => void;
  onTerminalCreated: (cb: (data: { sessionId: string }) => void) => () => void;
  onTerminalScrollback: (cb: (data: { sessionId: string; lines: string[] }) => void) => () => void;
}

interface TerminalPanelProps {
  projectId: string;
  files?: Array<{ name: string }>;
  onRun?: () => void;
  onStop?: () => void;
  containerRunning?: boolean;
  runCommand?: string;
  socketIO?: SocketIOHandle;
}

const SHELL_COMMANDS: Record<string, (args: string[], tab: TerminalTab) => string[]> = {
  help: () => [
    "Available commands:",
    "  help          Show this help message",
    "  clear         Clear the terminal",
    "  echo <text>   Print text to terminal",
    "  ls            List files in current directory",
    "  pwd           Print working directory",
    "  cd <dir>      Change directory",
    "  cat <file>    Display file contents",
    "  mkdir <dir>   Create directory",
    "  touch <file>  Create empty file",
    "  date          Show current date/time",
    "  whoami        Show current user",
    "  env           Show environment variables",
    "  node -v       Show Node.js version",
    "  npm -v        Show npm version",
    "  history       Show command history",
    "",
  ],
  date: () => [new Date().toString(), ""],
  whoami: () => ["codecloud-user", ""],
  pwd: (_args, tab) => [tab.cwd, ""],
  "node": (args) => {
    if (args[0] === "-v" || args[0] === "--version") return ["v20.11.0", ""];
    return ["Usage: node [options] [script.js]", ""];
  },
  npm: (args) => {
    if (args[0] === "-v" || args[0] === "--version") return ["10.2.4", ""];
    if (args[0] === "start") return ["Starting development server...", "Server running on http://localhost:3000", ""];
    return ["Usage: npm <command>", ""];
  },
  env: () => [
    "NODE_ENV=development",
    "PORT=3000",
    "HOME=/home/codecloud-user",
    "SHELL=/bin/bash",
    "TERM=xterm-256color",
    "",
  ],
  echo: (args) => [args.join(" "), ""],
  mkdir: (args) => {
    if (!args.length) return ["mkdir: missing operand", ""];
    return [`Created directory: ${args[0]}`, ""];
  },
  touch: (args) => {
    if (!args.length) return ["touch: missing operand", ""];
    return [`Created file: ${args[0]}`, ""];
  },
};

let tabCounter = 0;

export default function TerminalPanel({
  projectId,
  files,
  onRun,
  onStop,
  containerRunning,
  runCommand,
  socketIO,
}: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevContainerRunning = useRef(containerRunning);
  const socketTerminalRefs = useRef<Map<string, string>>(new Map());
  const socketIORef = useRef(socketIO);
  socketIORef.current = socketIO;
  const useRemoteTerminal = !!socketIO?.terminalConnected;

  useEffect(() => {
    if (!socketIO?.terminalConnected) return;

    const unsubOutput = socketIO.onTerminalOutput((data) => {
      setTabs(prev => {
        const tab = prev.find(t => socketTerminalRefs.current.get(t.id) === data.sessionId);
        if (tab?.terminal) {
          tab.terminal.write(data.data);
        }
        return prev;
      });
    });

    const unsubScrollback = socketIO.onTerminalScrollback((data) => {
      setTabs(prev => {
        const tab = prev.find(t => socketTerminalRefs.current.get(t.id) === data.sessionId);
        if (tab?.terminal) {
          data.lines.forEach(line => tab.terminal!.write(line));
        }
        return prev;
      });
    });

    return () => {
      unsubOutput();
      unsubScrollback();
    };
  }, [socketIO?.terminalConnected]);

  const createTab = useCallback((name?: string) => {
    tabCounter++;
    const id = `term-${tabCounter}`;
    const tab: TerminalTab = {
      id,
      name: name || `bash ${tabCounter > 1 ? `(${tabCounter})` : ""}`.trim(),
      terminal: null,
      fitAddon: null,
      searchAddon: null,
      history: [],
      historyIndex: -1,
      currentLine: "",
      cwd: `/home/codecloud-user/projects/${projectId}`,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(id);

    if (socketIO?.terminalConnected) {
      const sessionId = `${projectId}::terminal::${id}`;
      socketTerminalRefs.current.set(id, sessionId);
      socketIO.createTerminal(sessionId, true);
    }

    return id;
  }, [projectId, socketIO]);

  useEffect(() => {
    if (tabs.length === 0) {
      createTab("bash");
    }
  }, []);

  useEffect(() => {
    if (!socketIO?.terminalConnected) return;
    socketTerminalRefs.current.forEach((sessionId) => {
      socketIO.joinTerminal(sessionId);
    });
    for (const tab of tabs) {
      if (!socketTerminalRefs.current.has(tab.id)) {
        const sessionId = `${projectId}::terminal::${tab.id}`;
        socketTerminalRefs.current.set(tab.id, sessionId);
        socketIO.createTerminal(sessionId, true);
      }
    }
  }, [socketIO?.terminalConnected, projectId, tabs]);

  useEffect(() => {
    if (prevContainerRunning.current === containerRunning) return;
    prevContainerRunning.current = containerRunning;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab?.terminal) return;
    const term = activeTab.terminal;

    if (containerRunning) {
      const cmd = runCommand || "node index.js";
      term.writeln("");
      term.writeln(`\x1b[1;33m$ ${cmd}\x1b[0m`);
      term.writeln("\x1b[32mStarting...\x1b[0m");
      setTimeout(() => {
        term.writeln("\x1b[32mServer running on port 3000\x1b[0m");
        term.writeln("");
        writePrompt(term, activeTab.cwd);
      }, 1500);
    } else {
      term.writeln("");
      term.writeln("\x1b[31mProcess stopped.\x1b[0m");
      term.writeln("");
      writePrompt(term, activeTab.cwd);
    }
  }, [containerRunning, tabs, activeTabId, runCommand]);

  const initTerminal = useCallback(
    (tabId: string, container: HTMLDivElement) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || tab.terminal) return;

      const term = new XTermTerminal({
        theme: {
          background: "#0d1117",
          foreground: "#c9d1d9",
          cursor: "#58a6ff",
          cursorAccent: "#0d1117",
          selectionBackground: "#264f78",
          selectionForeground: "#ffffff",
          black: "#484f58",
          red: "#ff7b72",
          green: "#3fb950",
          yellow: "#d29922",
          blue: "#58a6ff",
          magenta: "#bc8cff",
          cyan: "#39c5cf",
          white: "#b1bac4",
          brightBlack: "#6e7681",
          brightRed: "#ffa198",
          brightGreen: "#56d364",
          brightYellow: "#e3b341",
          brightBlue: "#79c0ff",
          brightMagenta: "#d2a8ff",
          brightCyan: "#56d4dd",
          brightWhite: "#f0f6fc",
        },
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: "bar",
        scrollback: 5000,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(searchAddon);

      term.open(container);

      try {
        fitAddon.fit();
        const remSid = socketTerminalRefs.current.get(tab.id);
        const sio = socketIORef.current;
        if (sio?.terminalConnected && remSid) {
          sio.resizeTerminal(remSid, term.cols, term.rows);
        }
      } catch (fitErr) {
        console.warn("Terminal fit failed:", fitErr);
      }

      term.writeln("\x1b[1;36mCodeCloud Terminal v1.0\x1b[0m");
      term.writeln("\x1b[90mType \x1b[33mhelp\x1b[90m for available commands\x1b[0m");
      term.writeln("");
      writePrompt(term, tab.cwd);

      let currentLine = "";
      let historyIndex = -1;
      const history: string[] = [];

      term.onKey(({ key, domEvent }) => {
        const sio = socketIORef.current;
        const remoteSessionId = socketTerminalRefs.current.get(tabId);
        if (sio?.terminalConnected && remoteSessionId) {
          sio.sendTerminalInput(remoteSessionId, key);
          return;
        }

        const ev = domEvent;
        const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

        if (ev.ctrlKey && ev.key === "c") {
          term.writeln("^C");
          currentLine = "";
          writePrompt(term, tab.cwd);
          return;
        }

        if (ev.ctrlKey && ev.key === "l") {
          term.clear();
          writePrompt(term, tab.cwd);
          currentLine = "";
          return;
        }

        if (ev.key === "Enter") {
          term.writeln("");
          const cmd = currentLine.trim();
          if (cmd) {
            history.unshift(cmd);
            if (history.length > 100) history.pop();
            tab.history = history;
            processCommand(term, cmd, tab, files);
          }
          currentLine = "";
          historyIndex = -1;
          writePrompt(term, tab.cwd);
          return;
        }

        if (ev.key === "Backspace") {
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write("\b \b");
          }
          return;
        }

        if (ev.key === "ArrowUp") {
          if (history.length > 0 && historyIndex < history.length - 1) {
            historyIndex++;
            clearLine(term, currentLine);
            currentLine = history[historyIndex];
            term.write(currentLine);
          }
          return;
        }

        if (ev.key === "ArrowDown") {
          if (historyIndex > 0) {
            historyIndex--;
            clearLine(term, currentLine);
            currentLine = history[historyIndex];
            term.write(currentLine);
          } else if (historyIndex === 0) {
            historyIndex = -1;
            clearLine(term, currentLine);
            currentLine = "";
          }
          return;
        }

        if (ev.key === "Tab") {
          ev.preventDefault();
          const parts = currentLine.split(" ");
          const partial = parts[parts.length - 1];
          if (partial && files) {
            const matches = files.filter((f) =>
              f.name.toLowerCase().startsWith(partial.toLowerCase())
            );
            if (matches.length === 1) {
              const completion = matches[0].name.slice(partial.length);
              currentLine += completion;
              term.write(completion);
            } else if (matches.length > 1) {
              term.writeln("");
              term.writeln(matches.map((m) => m.name).join("  "));
              writePrompt(term, tab.cwd);
              term.write(currentLine);
            }
          }
          return;
        }

        if (printable) {
          currentLine += key;
          term.write(key);
        }
      });

      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? { ...t, terminal: term, fitAddon, searchAddon, history, historyIndex }
            : t
        )
      );
    },
    [tabs, files]
  );

  const setContainerRef = useCallback(
    (tabId: string) => (el: HTMLDivElement | null) => {
      if (el) {
        const existing = containerRefs.current.get(tabId);
        if (existing !== el) {
          containerRefs.current.set(tabId, el);
          requestAnimationFrame(() => initTerminal(tabId, el));
        }
      }
    },
    [initTerminal]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab?.terminal) {
        tab.terminal.dispose();
      }
      const sessionId = socketTerminalRefs.current.get(tabId);
      if (sessionId && socketIO?.terminalConnected) {
        socketIO.leaveTerminal(sessionId);
      }
      socketTerminalRefs.current.delete(tabId);
      containerRefs.current.delete(tabId);
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId && next.length > 0) {
          setActiveTabId(next[next.length - 1].id);
        }
        if (next.length === 0) {
          setTimeout(() => createTab("bash"), 0);
        }
        return next;
      });
    },
    [tabs, activeTabId, createTab, socketIO]
  );

  const clearActiveTerminal = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab?.terminal) {
      tab.terminal.clear();
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab?.fitAddon) {
      try {
        tab.fitAddon.fit();
      } catch (err) {
        console.warn("Terminal fit on tab change failed:", err);
      }
    }
  }, [activeTabId, tabs]);

  useEffect(() => {
    const handleResize = () => {
      const tab = tabs.find((t) => t.id === activeTabId);
      if (tab?.fitAddon) {
        try {
          tab.fitAddon.fit();
        } catch (err) {
          console.warn("Terminal fit on resize failed:", err);
        }
      }
    };
    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(handleResize);
    const container = containerRefs.current.get(activeTabId);
    if (container) observer.observe(container);
    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [activeTabId, tabs]);

  const handleSearch = useCallback(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab?.searchAddon && searchQuery) {
      tab.searchAddon.findNext(searchQuery);
    }
  }, [tabs, activeTabId, searchQuery]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  return (
    <div className="h-full flex flex-col border-t border-border/30 bg-[#0d1117]" data-testid="terminal-panel">
      <div className="h-8 flex items-center justify-between px-1 border-b border-border/20 shrink-0 bg-[#161b22]">
        <div className="flex items-center gap-0 overflow-x-auto flex-1 scrollbar-none">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1.5 px-3 h-7 text-xs cursor-pointer border-r border-border/10 shrink-0 transition-colors ${
                activeTabId === tab.id
                  ? "bg-[#0d1117] text-[#c9d1d9]"
                  : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#0d1117]/50"
              }`}
              onClick={() => setActiveTabId(tab.id)}
              data-testid={`terminal-tab-${tab.id}`}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  className="ml-1 p-0.5 rounded hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  data-testid={`close-terminal-${tab.id}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-0.5 px-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/10"
            onClick={() => createTab()}
            title="New Terminal"
            data-testid="button-new-terminal"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/10"
            onClick={() => setShowSearch(!showSearch)}
            title="Search"
            data-testid="button-terminal-search"
          >
            <Search className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/10"
            onClick={clearActiveTerminal}
            title="Clear Terminal"
            data-testid="button-clear-terminal"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 bg-[#161b22]">
          <Search className="w-3 h-3 text-[#8b949e] shrink-0" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
              if (e.key === "Escape") setShowSearch(false);
            }}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#c9d1d9] outline-none focus:border-[#58a6ff]"
            placeholder="Search terminal..."
            data-testid="input-terminal-search"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[#8b949e] hover:text-[#c9d1d9]"
            onClick={() => setShowSearch(false)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${activeTabId === tab.id ? "block" : "hidden"}`}
          >
            <div
              ref={setContainerRef(tab.id)}
              className="h-full w-full p-1"
              data-testid={`terminal-container-${tab.id}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function writePrompt(term: XTermTerminal, cwd: string) {
  const shortCwd = cwd.replace(/^\/home\/codecloud-user/, "~");
  term.write(`\x1b[1;32mcodecloud\x1b[0m:\x1b[1;34m${shortCwd}\x1b[0m$ `);
}

function clearLine(term: XTermTerminal, currentLine: string) {
  for (let i = 0; i < currentLine.length; i++) {
    term.write("\b \b");
  }
}

function processCommand(
  term: XTermTerminal,
  cmdStr: string,
  tab: TerminalTab,
  files?: Array<{ name: string }>
) {
  const parts = cmdStr.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  if (cmd === "clear") {
    term.clear();
    return;
  }

  if (cmd === "ls") {
    if (files && files.length > 0) {
      const names = files.map((f) => `\x1b[36m${f.name}\x1b[0m`);
      const cols = Math.max(1, Math.floor(80 / 20));
      for (let i = 0; i < names.length; i += cols) {
        term.writeln(names.slice(i, i + cols).map((n) => n.padEnd(30)).join(""));
      }
    } else {
      term.writeln("\x1b[90m(empty directory)\x1b[0m");
    }
    return;
  }

  if (cmd === "cat") {
    if (!args[0]) {
      term.writeln("cat: missing file operand");
      return;
    }
    term.writeln(`\x1b[90m(file preview not available in terminal emulator)\x1b[0m`);
    return;
  }

  if (cmd === "cd") {
    if (!args[0] || args[0] === "~") {
      tab.cwd = "/home/codecloud-user";
    } else if (args[0] === "..") {
      const parts = tab.cwd.split("/");
      if (parts.length > 2) parts.pop();
      tab.cwd = parts.join("/") || "/";
    } else if (args[0].startsWith("/")) {
      tab.cwd = args[0];
    } else {
      tab.cwd = `${tab.cwd}/${args[0]}`.replace(/\/+/g, "/");
    }
    return;
  }

  if (cmd === "history") {
    tab.history.forEach((h, i) => {
      term.writeln(`  ${tab.history.length - i}  ${h}`);
    });
    return;
  }

  if (cmd === "exit") {
    term.writeln("Use the X button to close this terminal.");
    return;
  }

  const handler = SHELL_COMMANDS[cmd];
  if (handler) {
    const output = handler(args, tab);
    output.forEach((line) => term.writeln(line));
    return;
  }

  if (cmd === "git") {
    if (args[0] === "status") {
      term.writeln("On branch main");
      term.writeln("nothing to commit, working tree clean");
    } else if (args[0] === "log") {
      term.writeln("\x1b[33mcommit abc123\x1b[0m (HEAD -> main)");
      term.writeln("Author: CodeCloud User <user@codecloud.dev>");
      term.writeln(`Date:   ${new Date().toUTCString()}`);
      term.writeln("");
      term.writeln("    Initial commit");
    } else {
      term.writeln(`git: '${args[0] || ""}' requires additional arguments`);
    }
    return;
  }

  term.writeln(`\x1b[31mbash: ${cmd}: command not found\x1b[0m`);
}
