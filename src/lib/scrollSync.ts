export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export function getSyncedScrollTop(from: ScrollMetrics, to: ScrollMetrics) {
  const fromMax = from.scrollHeight - from.clientHeight;
  const toMax = to.scrollHeight - to.clientHeight;

  if (fromMax <= 0 || toMax <= 0) return 0;

  const progress = Math.min(1, Math.max(0, from.scrollTop / fromMax));
  return progress * toMax;
}
