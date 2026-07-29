declare module 'satellite.js/lib/propagation/sgp4init.js' {
  import type { SatRec } from 'satellite.js';

  interface Sgp4InitOptions {
    opsmode: 'a' | 'i';
    satn: string;
    epoch: number;
    xbstar: number;
    xecco: number;
    xargpo: number;
    xinclo: number;
    xmo: number;
    xno: number;
    xnodeo: number;
  }

  export default function sgp4init(satrec: SatRec, options: Sgp4InitOptions): void;
}
