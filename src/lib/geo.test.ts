import { expect, test } from 'vitest';
import { positionAlongPath } from './geo';

// An L-shaped route in Heraklion: east along a street, then north.
const path = [
  { lat: 35.33, lng: 25.13 },
  { lat: 35.33, lng: 25.14 },
  { lat: 35.34, lng: 25.14 },
];

test('stops sorted by position along the path come in the order the bus reaches them', () => {
  const stops = {
    northLeg: { lat: 35.336, lng: 25.1401 },
    start: { lat: 35.3301, lng: 25.1305 },
    corner: { lat: 35.33, lng: 25.14 },
    eastLeg: { lat: 35.3299, lng: 25.137 },
  };

  const order = Object.entries(stops)
    .sort(([, a], [, b]) => positionAlongPath(a, path) - positionAlongPath(b, path))
    .map(([name]) => name);

  expect(order).toEqual(['start', 'eastLeg', 'corner', 'northLeg']);
});

test('a stop past the end of the path is placed at the end', () => {
  expect(positionAlongPath({ lat: 35.35, lng: 25.14 }, path)).toBe(2);
});
