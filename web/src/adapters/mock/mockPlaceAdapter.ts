import { readFileSync } from 'fs';
import path from 'path';
import type { Place } from '../../domain/types';
import type { PlaceAdapter } from '../interfaces';

function loadPlaces(): Place[] {
  const p = path.join(process.cwd(), 'mocks', 'places.json');
  const raw = JSON.parse(readFileSync(p, 'utf-8')) as { places: Place[] };
  return raw.places;
}

const PLACES = loadPlaces();

export class MockPlaceAdapter implements PlaceAdapter {
  async searchPlaces(q: string): Promise<Place[]> {
    const qq = q.toLowerCase();
    return PLACES.filter((p) => p.displayName.toLowerCase().includes(qq)).slice(0, 10);
  }
  async getPlaceById(id: string): Promise<Place | undefined> {
    return PLACES.find((p) => p.id === id);
  }
}

export function resolvePlaceSync(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

