import { runWorkspaceContractTests } from './contract.js';
import { MemoryWorkspace } from './memory-workspace.js';

runWorkspaceContractTests('MemoryWorkspace', () => new MemoryWorkspace());
