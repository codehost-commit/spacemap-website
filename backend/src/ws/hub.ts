import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "@spacemap/shared";
import { config } from "../config.js";
import type { Propagator } from "../propagation/propagator.js";

interface Client {
  socket: WebSocket;
  /** If set, only these NORAD ids are streamed to this client. */
  filter: Set<number> | null;
}

export class WsHub {
  private wss: WebSocketServer;
  private clients = new Set<Client>();
  private timer: NodeJS.Timeout | null = null;

  constructor(server: Server, private readonly propagator: Propagator) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (socket) => this.onConnection(socket));
  }

  start(): void {
    this.timer = setInterval(() => this.tick(), config.broadcastIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.wss.close();
  }

  private onConnection(socket: WebSocket): void {
    const client: Client = { socket, filter: null };
    this.clients.add(client);
    this.send(socket, {
      type: "hello",
      catalogSize: this.propagator.size,
      serverTimeMs: Date.now(),
    });
    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        this.handleClientMessage(client, msg);
      } catch {
        this.send(socket, { type: "error", message: "invalid JSON" });
      }
    });
    socket.on("close", () => this.clients.delete(client));
    socket.on("error", () => this.clients.delete(client));
  }

  private handleClientMessage(client: Client, msg: ClientMessage): void {
    switch (msg.type) {
      case "subscribe":
        client.filter = msg.noradIds && msg.noradIds.length > 0 ? new Set(msg.noradIds) : null;
        break;
      case "unsubscribe":
        client.filter = new Set();
        break;
      case "ping":
        // no-op; the WS layer already handles pings, this is user-level keepalive.
        break;
    }
  }

  private tick(): void {
    if (this.clients.size === 0) return;
    const now = new Date();
    const timeMs = now.getTime();
    const states = this.propagator.propagateAll(now);
    for (const client of this.clients) {
      if (client.socket.readyState !== client.socket.OPEN) continue;
      const filter = client.filter;
      const payload: ServerMessage = filter
        ? { type: "positions", timeMs, states: states.filter((s) => filter.has(s.noradId)) }
        : { type: "positions", timeMs, states };
      this.send(client.socket, payload);
    }
  }

  private send(socket: WebSocket, msg: ServerMessage): void {
    try {
      socket.send(JSON.stringify(msg));
    } catch {
      /* dropped client; will be reaped on close */
    }
  }
}
