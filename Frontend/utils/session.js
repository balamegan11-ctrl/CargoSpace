const USER_STORAGE_KEY = 'cargospace_user'
const ADMIN_STORAGE_KEY = 'cargospace_admin'
const USER_UPDATED_EVENT = 'cargospace:user-updated'

function readStoredJson(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function readStoredUser() {
  return readStoredJson(USER_STORAGE_KEY)
}

export function readStoredAdmin() {
  return readStoredJson(ADMIN_STORAGE_KEY)
}

export function saveStoredUser(user) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event(USER_UPDATED_EVENT))
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_STORAGE_KEY)
  window.dispatchEvent(new Event(USER_UPDATED_EVENT))
}

export function saveStoredAdmin(admin) {
  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin))
}

export function clearStoredAdmin() {
  window.localStorage.removeItem(ADMIN_STORAGE_KEY)
}

export function subscribeToStoredUser(listener) {
  const handleStorage = (event) => {
    if (!event.key || event.key === USER_STORAGE_KEY) listener()
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(USER_UPDATED_EVENT, listener)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(USER_UPDATED_EVENT, listener)
  }
}
