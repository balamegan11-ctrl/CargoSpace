import { useEffect, useState } from 'react'
import { readStoredUser, subscribeToStoredUser } from '../utils/session'

export function useStoredUser() {
  const [user, setUser] = useState(readStoredUser)

  useEffect(() => subscribeToStoredUser(() => setUser(readStoredUser())), [])

  return user
}
