import os from 'node:os';

export function getMaxWorkers(): number {
  const cores = os.availableParallelism();

  const decayCoefficient = 0.07;
  const decay = Math.exp(-cores * decayCoefficient);

  // Scale transitions from 1.0 (low cores) toward 0.5 (many cores)
  const scale = 0.5 + 0.5 * decay;

  // Adjust down slightly to leave headroom for main thread and I/O
  const adjusted = cores * scale - 1;

  return Math.max(1, Math.ceil(adjusted));
}
