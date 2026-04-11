import { createClient } from "@/utils/supabase/client";

/**
 * @deprecated Use createClient from '@/utils/supabase/client' directly for browser-side
 * or from '@/utils/supabase/server' for server-side.
 */
export const getSupabaseClient = () => {
  return createClient();
};
