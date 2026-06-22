export interface MachineConfig {
  id: string;
  initial: string;
  states: Record<string, Record<string, unknown>>;
}
