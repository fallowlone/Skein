export function bdp(bandwidthMbps: number, rttMs: number): number {
  // bytes-in-flight = (bw * 1e6 bits/s) * (rtt / 1000 s) / 8 bits/byte
  return (bandwidthMbps * 1e6 * (rttMs / 1000)) / 8;
}

export function mathisThroughput(mssBytes: number, rttMs: number, loss: number): number {
  // Mathis: BW = MSS / RTT * C/sqrt(p) ; C ≈ 1.22 ; returns bytes/sec
  if (loss <= 0) return Number.POSITIVE_INFINITY;
  const rttSec = rttMs / 1000;
  return (mssBytes / rttSec) * (1.22 / Math.sqrt(loss));
}

export type LatencyHops = {
  dns: number;
  tcp: number;
  tls: number;
  ttfb: number;
  render: number;
};

export type LatencyResult = {
  total: number;
  lcpGood: boolean;
  lcpPoor: boolean;
};

export function latencyBudget(hops: LatencyHops): LatencyResult {
  const total = hops.dns + hops.tcp + hops.tls + hops.ttfb + hops.render;
  return { total, lcpGood: total <= 2500, lcpPoor: total > 4000 };
}
