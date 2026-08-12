export interface StudioChatMetadata {
  mode: 'explain';
  timestamp: number;
}

export function createChatMetadata(): StudioChatMetadata {
  return {
    mode: 'explain',
    timestamp: Date.now(),
  };
}
