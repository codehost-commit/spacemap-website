/**
 * Admin console event bus. Every meaningful thing that happens in the engine
 * — snapshot arrivals, layer updates, FPS samples, camera moves, overlay
 * toggles, errors — is pushed here. The AdminConsole subscribes and renders
 * a scrolling terminal view.
 *
 * Multiple named "buffers" support the multi-terminal UX: the "main" buffer
 * holds live engine chatter, and `/selfdiagnose` spawns a `"diag"` buffer
 * that only sees diagnose output.
 */

export type LogSeverity = 'info' | 'debug' | 'warn' | 'error' | 'cmd' | 'out' | 'success';

export interface LogEntry {
  /** Millisecond timestamp. */
  ts: number;
  /** Monotonically increasing sequence — used as React key. */
  seq: number;
  /** Short tag: sys, sat, layer, fps, cam, ui, net, diag, cmd, in, out. */
  channel: string;
  severity: LogSeverity;
  text: string;
  /** Optional structured payload preserved for JSON export. */
  data?: Record<string, unknown>;
  /**
   * If set, the buffer will *replace* any existing entry with the same
   * progressId instead of appending. Used for updating progress bars in-place.
   */
  progressId?: string;
}

type Listener = (entries: LogEntry[]) => void;

const MAX_ENTRIES = 6000;

class AdminLog {
  private buffers = new Map<string, LogEntry[]>();
  private listeners = new Map<string, Set<Listener>>();
  private nextSeq = 1;

  /** All buffer names in creation order. */
  buffers_(): string[] {
    return [...this.buffers.keys()];
  }

  ensureBuffer(name: string): void {
    if (!this.buffers.has(name)) this.buffers.set(name, []);
  }

  push(bufferName: string, partial: Omit<LogEntry, 'ts' | 'seq'>): void {
    const entry: LogEntry = { ...partial, ts: Date.now(), seq: this.nextSeq++ };
    let buf = this.buffers.get(bufferName);
    if (!buf) {
      buf = [];
      this.buffers.set(bufferName, buf);
    }
    if (entry.progressId) {
      const idx = buf.findIndex((e) => e.progressId === entry.progressId);
      if (idx >= 0) {
        buf[idx] = entry;
      } else {
        buf.push(entry);
      }
    } else {
      buf.push(entry);
    }
    if (buf.length > MAX_ENTRIES) buf.splice(0, buf.length - MAX_ENTRIES);
    this.emit(bufferName, buf);
  }

  read(bufferName: string): LogEntry[] {
    return this.buffers.get(bufferName) ?? [];
  }

  clear(bufferName: string): void {
    this.buffers.set(bufferName, []);
    this.emit(bufferName, []);
  }

  remove(bufferName: string): void {
    if (bufferName === 'main') return; // main is permanent
    this.buffers.delete(bufferName);
    // Fire empty snapshot so subscribers can unmount.
    this.emit(bufferName, []);
    this.listeners.delete(bufferName);
  }

  subscribe(bufferName: string, fn: Listener): () => void {
    let set = this.listeners.get(bufferName);
    if (!set) {
      set = new Set();
      this.listeners.set(bufferName, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  private emit(name: string, entries: LogEntry[]): void {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(entries);
      } catch (err) {
        console.warn('[adminLog] listener threw', err);
      }
    }
  }
}

export const adminLog = new AdminLog();
adminLog.ensureBuffer('main');

/** Convenience: push to main. */
export function logMain(
  channel: string,
  severity: LogSeverity,
  text: string,
  data?: Record<string, unknown>,
): void {
  adminLog.push('main', { channel, severity, text, data });
}
