/**
 * true เมื่อ error มาจาก session/token หมดอายุ — ไม่ใช่ error อื่นๆ (server ล่ม, network ปัญหา ฯลฯ)
 * ครอบคลุม 2 เคส: getAccessTokenSilently() ของ Auth0 ขอ token ใหม่ไม่ได้เพราะ session หมดอายุแล้ว
 * (throw GenericError ที่มี .error เป็น login_required/consent_required/invalid_grant) และ backend
 * ปฏิเสธ token ด้วย 401 (access token หมดอายุ/ไม่ถูกต้อง) — ทั้งสองเคสต้องเด้งกลับหน้า login ให้ login ใหม่
 */
export const isSessionExpiredError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false
  const auth0ErrorCode = (err as { error?: string }).error
  if (auth0ErrorCode === 'login_required' || auth0ErrorCode === 'consent_required' || auth0ErrorCode === 'invalid_grant') {
    return true
  }
  return /-> 401\b/.test(err.message)
}
