import { HOT_AT_MS, WARM_AT_MS } from './constants';

export type Stage = 'calm' | 'warm' | 'hot' | 'done';

export function stageFor(remainingMs: number): Stage {
  if (remainingMs <= 0) {
    return 'done';
  }
  if (remainingMs <= HOT_AT_MS) {
    return 'hot';
  }
  return remainingMs <= WARM_AT_MS ? 'warm' : 'calm';
}
