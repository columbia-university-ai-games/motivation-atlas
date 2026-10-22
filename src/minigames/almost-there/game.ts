export const TASKS = 10;
export const TASK_MS = 6000;

export function completeTask(completed: number): number {
  return Math.min(TASKS, completed + 1);
}

export function milestone(completed: number): string {
  if (completed === TASKS) return "All packed!";
  if (completed >= 8) return "Almost there!";
  if (completed >= 5) return "Halfway there!";
  if (completed >= 2) return "A good start!";
  return "One parcel at a time.";
}
