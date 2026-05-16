export interface StageRef {
  order: number
  isTerminal: boolean
}

/**
 * Determines if a candidate can be moved from their current stage to the target.
 * Rules: forward-only (higher order) OR to any terminal stage (Rejected/Hired).
 * Cannot leave a terminal stage.
 */
export function canMoveToStage(
  currentStage: StageRef,
  targetStage: StageRef
): boolean {
  if (currentStage.isTerminal) return false
  if (targetStage.isTerminal) return true
  return targetStage.order > currentStage.order
}
