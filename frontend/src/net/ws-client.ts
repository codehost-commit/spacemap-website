/**
 * Reserved for future server-push channels (conjunction alerts, catalog
 * refresh notifications, etc.). Live satellite positions are computed in the
 * browser via the propagator worker, so no live position WS is currently
 * connected.
 */
export function connectLiveFeed(_url: string): () => void {
  return () => {};
}
