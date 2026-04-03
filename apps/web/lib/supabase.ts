import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // Only throw if NOT in build environment, but user wants explicit validation
        // During build-time static generation we might still hit this, so we'll throw a clear error
        throw new Error("Supabase environment variables (URL/AnonKey) are required for getSupabaseClient()");
    }

    if (!supabaseInstance) {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabaseInstance;
};

// Also keep a legacy 'supabase' proxy or getter if we don't want to break everything at once
// but the user wants to REPLACE all imports, so I'll just export the factory.
