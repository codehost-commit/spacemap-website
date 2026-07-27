import { useEffect, useMemo, useRef, useState } from "react";
import { adminLog, type LogEntry } from "../admin/admin-log.js";

interface Props {
  bufferName: string;
  onCommand: (cmd: string) => void;
  autoFocus?: boolean;
  onFocus?: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-emerald-300",
  debug: "text-emerald-700",
  warn: "text-amber-400",
  error: "text-red-400",
  cmd: "text-cyan-300",
  out: "text-emerald-200",
  success: "text-emerald-400 font-semibold",
};

const CHANNEL_COLORS: Record<string, string> = {
  sys: "text-slate-400",
  sat: "text-emerald-500",
  fps: "text-cyan-400",
  layer: "text-teal-400",
  cam: "text-purple-400",
  ui: "text-fuchsia-400",
  net: "text-blue-400",
  diag: "text-amber-300",
  cmd: "text-cyan-300",
  in: "text-cyan-400",
  out: "text-emerald-300",
  clock: "text-yellow-300",
  heartbeat: "text-slate-500",
};

/**
 * A single terminal — a scrolling green-on-black log view with an input row.
 * Subscribes to a named admin-log buffer; every push re-renders. Command
 * history navigable with up/down; Ctrl-L clears; Ctrl-C aborts input.
 */
export function Terminal({ bufferName, onCommand, autoFocus, onFocus }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>(() => [...adminLog.read(bufferName)]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const followTail = useRef(true);

  useEffect(() => {
    adminLog.ensureBuffer(bufferName);
    setEntries([...adminLog.read(bufferName)]);
    const unsub = adminLog.subscribe(bufferName, (all) => {
      setEntries([...all]);
    });
    return unsub;
  }, [bufferName]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Auto-scroll to bottom unless the user has scrolled up.
  useEffect(() => {
    if (!scrollRef.current || !followTail.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    followTail.current = nearBottom;
  };

  const submit = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setHistory((h) => [cmd, ...h.filter((c) => c !== cmd)].slice(0, 100));
    setHistIdx(-1);
    setInput("");
    onCommand(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(history.length - 1, histIdx + 1);
      if (next >= 0 && history[next] !== undefined) {
        setHistIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      setInput("");
      setHistIdx(-1);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      adminLog.clear(bufferName);
    }
    e.stopPropagation();
  };

  // Memoise stable rendering so React doesn't re-diff 5000 entries every push.
  const rendered = useMemo(() => renderEntries(entries), [entries]);

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded border border-emerald-900/60 bg-black/95 font-mono text-[11px] leading-tight text-emerald-300"
      onClick={() => {
        inputRef.current?.focus();
        onFocus?.();
      }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-1"
      >
        {rendered}
      </div>
      <div className="flex items-center gap-1 border-t border-emerald-900/60 bg-black/95 px-2 py-1">
        <span className="text-emerald-500">spacemap:{bufferName} $</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent text-emerald-200 caret-emerald-300 outline-none"
        />
      </div>
    </div>
  );
}

function renderEntries(entries: LogEntry[]) {
  return entries.map((e) => (
    <div key={e.seq} className="whitespace-pre-wrap">
      <span className="text-emerald-700/80">{formatTs(e.ts)}</span>
      <span className={`ml-2 ${CHANNEL_COLORS[e.channel] ?? "text-slate-400"}`}>
        [{e.channel}]
      </span>
      <span className={`ml-2 ${SEVERITY_COLORS[e.severity] ?? "text-emerald-200"}`}>
        {e.text}
      </span>
    </div>
  ));
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const ss = d.getUTCSeconds().toString().padStart(2, "0");
  const ms = d.getUTCMilliseconds().toString().padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}
