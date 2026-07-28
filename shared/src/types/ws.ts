import type { SatelliteState } from './satellite.js';

/** Server → client messages. */
export type ServerMessage =
  | { type: 'hello'; catalogSize: number; serverTimeMs: number }
  | {
      type: 'positions';
      /** Sample time for this batch. */
      timeMs: number;
      /** Packed states. May be a subset if client requested filter. */
      states: SatelliteState[];
    }
  | { type: 'error'; message: string };

/** Client → server messages. */
export type ClientMessage =
  { type: 'subscribe'; noradIds?: number[] } | { type: 'unsubscribe' } | { type: 'ping' };
