import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

/**
 * Factory generique pour les tables "simples" (colonne `id`, `establishment_id`
 * avec valeur par defaut cote base). Couvre la plupart des ecrans de
 * parametrage (creneaux, salles, niveaux, classes, matieres, profs, etc.).
 */
export function createEntityResource<TableName extends keyof Database['public']['Tables']>(
  table: TableName,
) {
  type Row = Tables<TableName>
  type Insert = TablesInsert<TableName>
  type Update = TablesUpdate<TableName>

  // `table` est un parametre generique (pas un litteral), ce qui empeche le
  // client Supabase typed de resoudre correctement les surcharges de
  // from(...). On passe par `any` ici uniquement ; les fonctions exportees
  // restent typees via Row/Insert/Update.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const untypedSupabase = supabase as any
  const untypedFrom = () => untypedSupabase.from(table as string)

  async function list(establishmentId: string, orderColumn?: string): Promise<Row[]> {
    let query = untypedFrom().select('*').eq('establishment_id', establishmentId)
    if (orderColumn) query = query.order(orderColumn)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as unknown as Row[]
  }

  async function create(values: Insert): Promise<Row> {
    const { data, error } = await untypedFrom()
      .insert(values as never)
      .select()
      .single()
    if (error) throw error
    return data as unknown as Row
  }

  async function createMany(values: Insert[]): Promise<Row[]> {
    const { data, error } = await untypedFrom()
      .insert(values as never)
      .select()
    if (error) throw error
    return (data ?? []) as unknown as Row[]
  }

  async function update(id: string, values: Update): Promise<Row> {
    const { data, error } = await untypedFrom()
      .update(values as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as unknown as Row
  }

  async function remove(id: string): Promise<void> {
    const { error } = await untypedFrom().delete().eq('id', id)
    if (error) throw error
  }

  async function removeMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const { error } = await untypedFrom().delete().in('id', ids)
    if (error) throw error
  }

  function queryKey(establishmentId: string) {
    return [table, establishmentId] as const
  }

  function useList(establishmentId: string, orderColumn?: string) {
    return useQuery({
      queryKey: queryKey(establishmentId),
      queryFn: () => list(establishmentId, orderColumn),
    })
  }

  function useMutations(establishmentId: string) {
    const queryClient = useQueryClient()
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: queryKey(establishmentId) })
      // Le builder/dashboard/rapport/export lisent un contexte agrege
      // (voir features/validation/useScheduleContext.ts) qui a sa propre cle
      // de cache : on l'invalide aussi pour que ces vues refletent tout
      // changement fait depuis les ecrans de parametrage.
      queryClient.invalidateQueries({ queryKey: ['schedule-context', establishmentId] })
    }

    const createMutation = useMutation({ mutationFn: create, onSuccess: invalidate })
    const createManyMutation = useMutation({ mutationFn: createMany, onSuccess: invalidate })
    const updateMutation = useMutation({
      mutationFn: (params: { id: string; values: Update }) => update(params.id, params.values),
      onSuccess: invalidate,
    })
    const removeMutation = useMutation({ mutationFn: remove, onSuccess: invalidate })
    const removeManyMutation = useMutation({ mutationFn: removeMany, onSuccess: invalidate })

    return { createMutation, createManyMutation, updateMutation, removeMutation, removeManyMutation }
  }

  return { list, create, createMany, update, remove, removeMany, queryKey, useList, useMutations }
}
