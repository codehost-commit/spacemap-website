import { useEffect, useState } from 'react';
import { useStore } from '../state/store.js';
import { adminLog } from '../admin/admin-log.js';
import { runSelfDiagnose } from '../admin/diagnose.js';
import { getInstruments } from '../admin/registry.js';
import { Terminal } from './Terminal.js';
import { getContacts } from '../pages/ContactPage.js';

interface Tab {
  id: string;
  label: string;
  closable: boolean;
}

const HELP_TEXT = [
  'Available commands:',
  '  /help              this message',
  '  /selfdiagnose      run a 3-minute automated benchmark',
  '  /clear             clear this terminal (Ctrl-L)',
  "  /close             close this tab (main can't be closed)",
  '  /fps               dump the current FPS window',
  '  /stats             dump catalog + snapshot counters',
  '  /focus <norad>     select a satellite by NORAD id',
  '  /pause /resume     toggle simulation clock',
  '  /speed <n>         set time-warp multiplier',
  '  /snapshot          save the current view state to JSON',
  '  /contactread       read all contact form submissions',
];

export function AdminConsole() {
  const open = useStore((s) => s.adminOpen);
  const setOpen = useStore((s) => s.setAdminOpen);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'main', label: 'main', closable: false }]);
  const [activeId, setActiveId] = useState('main');

  // Deep-link diag tab back to main if diag is torn down externally.
  useEffect(() => {
    if (!tabs.find((t) => t.id === activeId)) setActiveId('main');
  }, [tabs, activeId]);

  const handleCommand = async (raw: string) => {
    const cmd = raw.trim();
    adminLog.push(activeId, { channel: 'in', severity: 'cmd', text: `$ ${cmd}` });
    const [head, ...rest] = cmd.split(/\s+/);
    switch (head) {
      case '/help': {
        for (const line of HELP_TEXT) {
          adminLog.push(activeId, { channel: 'out', severity: 'out', text: line });
        }
        break;
      }
      case '/clear': {
        adminLog.clear(activeId);
        break;
      }
      case '/close': {
        if (activeId === 'main') {
          adminLog.push(activeId, { channel: 'out', severity: 'warn', text: 'cannot close main' });
        } else {
          adminLog.remove(activeId);
          setTabs((t) => t.filter((x) => x.id !== activeId));
          setActiveId('main');
        }
        break;
      }
      case '/selfdiagnose': {
        // Open (or focus) a diag tab and kick off the run.
        if (!tabs.find((t) => t.id === 'diag')) {
          setTabs((t) => [...t, { id: 'diag', label: 'diagnose', closable: true }]);
        }
        setActiveId('diag');
        adminLog.push('diag', {
          channel: 'out',
          severity: 'info',
          text: 'starting self-diagnose (~3 min). Do not touch the app',
        });
        try {
          await runSelfDiagnose('diag');
        } catch (err) {
          adminLog.push('diag', {
            channel: 'diag',
            severity: 'error',
            text: `crashed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
        break;
      }
      case '/fps': {
        const p = performance as unknown as { memory?: { usedJSHeapSize: number } };
        const heap = p.memory ? Math.round(p.memory.usedJSHeapSize / 1024 / 1024) : null;
        adminLog.push(activeId, {
          channel: 'out',
          severity: 'out',
          text: `heap ${heap ?? '?'}MB • ${useStore.getState().catalogSize.toLocaleString()} cataloged`,
        });
        break;
      }
      case '/stats': {
        const s = useStore.getState();
        adminLog.push(activeId, {
          channel: 'out',
          severity: 'out',
          text: `catalog: ${s.catalogSize} • rendered: ${s.snapshot?.count ?? 0} • tick: ${s.snapshotTick} • mult: ${s.simMultiplier}× ${s.simPaused ? 'PAUSED' : ''}`,
        });
        break;
      }
      case '/focus': {
        const id = Number(rest[0]);
        if (!Number.isFinite(id)) {
          adminLog.push(activeId, {
            channel: 'out',
            severity: 'error',
            text: 'usage: /focus <norad>',
          });
          break;
        }
        useStore.getState().select(id);
        const w = window as unknown as { spacemapFocus?: (id: number) => void };
        w.spacemapFocus?.(id);
        adminLog.push(activeId, {
          channel: 'out',
          severity: 'success',
          text: `focused NORAD ${id}`,
        });
        break;
      }
      case '/pause': {
        const clock = getInstruments()?.clock;
        clock?.setPaused(true);
        adminLog.push(activeId, { channel: 'out', severity: 'success', text: 'paused' });
        break;
      }
      case '/resume': {
        const clock = getInstruments()?.clock;
        clock?.setPaused(false);
        adminLog.push(activeId, { channel: 'out', severity: 'success', text: 'resumed' });
        break;
      }
      case '/speed': {
        const n = Number(rest[0]);
        if (!Number.isFinite(n)) {
          adminLog.push(activeId, { channel: 'out', severity: 'error', text: 'usage: /speed <n>' });
          break;
        }
        getInstruments()?.clock.setMultiplier(n);
        adminLog.push(activeId, { channel: 'out', severity: 'success', text: `speed → ${n}×` });
        break;
      }
      case '/snapshot': {
        const s = useStore.getState();
        const state = {
          selectedNoradId: s.selectedNoradId,
          simTimeMs: s.simTimeMs,
          simMultiplier: s.simMultiplier,
          imageryId: s.imageryId,
          filter: [...s.filter],
          trailMode: s.trailMode,
          overlays: {
            heatmap: s.heatmapOn,
            terminator: s.terminatorOn,
            graticule: s.graticuleOn,
            countries: s.countriesOn,
            cities: s.citiesOn,
          },
          savedIds: [...s.savedIds],
          camera: (() => {
            const cam = getInstruments()?.viewer.camera;
            if (!cam) return null;
            return {
              position: [cam.position.x, cam.position.y, cam.position.z],
              direction: [cam.direction.x, cam.direction.y, cam.direction.z],
              up: [cam.up.x, cam.up.y, cam.up.z],
            };
          })(),
        };
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spacemap-snapshot-${Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        adminLog.push(activeId, { channel: 'out', severity: 'success', text: 'snapshot saved' });
        break;
      }
      case '/contactread': {
        const contacts = getContacts();
        if (contacts.length === 0) {
          adminLog.push(activeId, {
            channel: 'out',
            severity: 'warn',
            text: 'No contact submissions yet.',
          });
        } else {
          adminLog.push(activeId, {
            channel: 'out',
            severity: 'success',
            text: `Contact submissions: ${contacts.length} total`,
          });
          adminLog.push(activeId, { channel: 'out', severity: 'out', text: '---' });
          contacts.forEach((c, i) => {
            adminLog.push(activeId, {
              channel: 'out',
              severity: 'out',
              text: `#${i + 1} | ${c.timestamp}`,
            });
            adminLog.push(activeId, {
              channel: 'out',
              severity: 'out',
              text: `  Name:     ${c.name}`,
            });
            adminLog.push(activeId, {
              channel: 'out',
              severity: 'out',
              text: `  Email:    ${c.email}`,
            });
            adminLog.push(activeId, {
              channel: 'out',
              severity: 'out',
              text: `  Question: ${c.question}`,
            });
            adminLog.push(activeId, { channel: 'out', severity: 'out', text: '---' });
          });
        }
        break;
      }
      default: {
        adminLog.push(activeId, {
          channel: 'out',
          severity: 'error',
          text: `unknown command: ${head} - try /help`,
        });
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur">
      <header className="flex items-center justify-between border-b border-emerald-900/60 bg-black/80 px-4 py-2 font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">SPACEMAP</span>
          <span className="text-emerald-700">/</span>
          <span className="text-emerald-300">ADMIN CONSOLE</span>
          <span className="text-emerald-700">|</span>
          <span className="text-amber-400">Contact Us Received: ({getContacts().length})</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-500">
          <span className="hidden sm:inline">Ctrl-L clear · ↑↓ history · /help</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded border border-emerald-900 px-2 py-0.5 text-emerald-400 hover:border-emerald-500 hover:text-emerald-300"
          >
            close ×
          </button>
        </div>
      </header>

      <div className="flex items-end gap-1 border-b border-emerald-900/60 bg-black/80 px-2 font-mono text-[11px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`flex items-center gap-1 rounded-t border-t border-l border-r px-3 py-1 ${
              activeId === t.id
                ? 'border-emerald-500/70 bg-black text-emerald-300'
                : 'border-emerald-900/60 bg-black/60 text-emerald-600 hover:text-emerald-400'
            }`}
          >
            <span>{t.label}</span>
            {t.closable && (
              <span
                onClick={(ev) => {
                  ev.stopPropagation();
                  adminLog.remove(t.id);
                  setTabs((ts) => ts.filter((x) => x.id !== t.id));
                  if (activeId === t.id) setActiveId('main');
                }}
                className="ml-1 text-emerald-700 hover:text-red-400"
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden p-2">
        <Terminal bufferName={activeId} onCommand={handleCommand} autoFocus />
      </div>
    </div>
  );
}
