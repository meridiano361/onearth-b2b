type SecurityEvent =
  | 'login_failed'
  | 'login_success'
  | 'rate_limit_hit'
  | 'unauthorized_access'
  | 'invalid_input';

export function securityLog(
  event: SecurityEvent,
  details: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      level: 'SECURITY',
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })
  );
}
