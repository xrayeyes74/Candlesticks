import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Deletes the authenticated user's account entirely. Every table referencing
// auth.users (profiles, watchlist, predictions, prediction_evaluations, user_roles)
// was created with ON DELETE CASCADE, so removing the auth user removes all of
// their data in one atomic step — no manual per-table cleanup needed.
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
