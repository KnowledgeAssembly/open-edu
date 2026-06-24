export type CliResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; code: number };

export function formatJsonResult(result: CliResult): string {
  return JSON.stringify(result, null, 2);
}
