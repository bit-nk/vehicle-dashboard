import { useCallback, useEffect, useState } from 'react'

const KEY = 'vinsight:unlocked'

function read() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

// Tracks which report VINs the (mock) user has "purchased" this session.
// sessionStorage keeps the unlock across route changes without a backend.
export function useUnlock(vin) {
  const [unlocked, setUnlocked] = useState(() => read().has(vin))

  useEffect(() => {
    setUnlocked(read().has(vin))
  }, [vin])

  const unlock = useCallback(() => {
    const set = read()
    set.add(vin)
    sessionStorage.setItem(KEY, JSON.stringify([...set]))
    setUnlocked(true)
  }, [vin])

  return [unlocked, unlock]
}
