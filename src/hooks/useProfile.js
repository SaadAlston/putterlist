import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export function useProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateDisplayName(name) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .update({ display_name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    setProfile(data)
    return data
  }

  return { profile, loading, updateDisplayName, reload: load }
}