/**
 * Tiny helper that yields the event loop, simulating a network round-trip
 * so the UI exercises real loading states even with mock data. Override
 * with `MOCK_LATENCY_MS=0` to skip during tests.
 */
const DEFAULT_MS = 120;

export function mockDelay<T>(value: T, ms = DEFAULT_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
