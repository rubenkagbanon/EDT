import * as React from 'react'

import { useScheduleContext } from '@/features/validation/useScheduleContext'
import { runAllRules } from '@/lib/constraints'

export function useViolations(establishmentId: string) {
  const { data: ctx, isLoading } = useScheduleContext(establishmentId)
  const violations = React.useMemo(() => (ctx ? runAllRules(ctx) : []), [ctx])
  return { violations, isLoading, ctx }
}

export function useValidationSummary(establishmentId: string) {
  const { violations, isLoading } = useViolations(establishmentId)
  const hardCount = violations.filter((v) => v.severity === 'hard').length
  const softCount = violations.filter((v) => v.severity === 'soft').length
  return { hardCount, softCount, isLoading }
}
