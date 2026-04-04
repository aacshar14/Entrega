import { createBrowserClient } from '@supabase/ssr'

let client: any = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  client = createBrowserClient(
    url!,
    key!
  )
  return client;
}
