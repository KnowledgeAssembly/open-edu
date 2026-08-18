export function getAllowedGatewayOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.OPEN_EDU_GATEWAY_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured;
  return env.OPEN_EDU_LOCAL_AI === '1' ? ['*'] : [];
}
