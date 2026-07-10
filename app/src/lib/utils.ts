import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrait un message lisible d'une erreur, qu'elle soit une Error native ou
 * un objet d'erreur Supabase/PostgREST (qui n'est pas `instanceof Error`).
 */
export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}
