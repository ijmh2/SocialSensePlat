export function resolveAppMode(env = process.env) {
  const requestedMode = env.APP_MODE?.trim().toLowerCase();
  if (requestedMode === 'demo' || requestedMode === 'full') return requestedMode;

  const hasFullAppConfig = Boolean(
    env.SUPABASE_URL
    && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY)
    && env.STRIPE_SECRET_KEY
  );

  return hasFullAppConfig ? 'full' : 'demo';
}
