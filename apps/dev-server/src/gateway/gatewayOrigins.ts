export function getAllowedGatewayOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.OPEN_EDU_GATEWAY_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured;
  // On Vercel the deployment is public and needs permissive CORS by default.
  // Locally, OPEN_EDU_LOCAL_AI=1 explicitly opens the gateway to browser requests.
  // Without either, restrict to same-origin.
  return (env.VERCEL || env.OPEN_EDU_LOCAL_AI === '1') ? ['*'] : [];
}
