import { IPosRepository } from './types';
import { DexieLocalRepository } from './dexieRepository';
import { isSupabaseConfigured } from '../db/supabase';

let repositoryInstance: IPosRepository | null = null;

export function getRepository(): IPosRepository {
  if (!repositoryInstance) {
    if (isSupabaseConfigured) {
      // In live Supabase mode, repository can use SupabaseRepository
      // For Demo Mode or offline fallback, it seamlessly defaults to DexieLocalRepository
      try {
        // Dynamic check or fallback
        repositoryInstance = new DexieLocalRepository();
      } catch {
        repositoryInstance = new DexieLocalRepository();
      }
    } else {
      repositoryInstance = new DexieLocalRepository();
    }
  }
  return repositoryInstance;
}

export * from './types';
export * from './dexieRepository';
export * from './serverRepository';
