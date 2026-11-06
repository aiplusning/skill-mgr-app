export function ok<T>(data: T) {
  return { ok: true, data }
}

export function fail(code: string, message: string, status = 500) {
  return {
    ok: false,
    error: { code, message },
    status,
  }
}
