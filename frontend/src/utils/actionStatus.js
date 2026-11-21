// Normalise thrown API errors into a shape the UI can show without silently
// swallowing important collaboration failures.
export function failure(err, fallback = 'Something went wrong. Please try again.') {
  return {
    ok: false,
    status: err?.status || 0,
    message: err?.message || fallback,
  }
}

export function success(data = {}) {
  return { ok: true, status: 200, ...data }
}

export function statusLabel(status) {
  const map = {
    400: 'Bad request',
    401: 'Please log in to continue.',
    403: 'You are not authorised to do that.',
    404: 'Not found.',
    409: 'Already in that state.',
    422: 'The request could not be completed.',
  }
  return map[status] || null
}
