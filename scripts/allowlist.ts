/** Add (or remove) an email on the signup allowlist.
 *  Usage: npx tsx scripts/allowlist.ts add someone@example.com
 *         npx tsx scripts/allowlist.ts remove someone@example.com
 *  Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.
 *  (Phase 3 adds an in-app admin panel for this.) */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const [action, email] = process.argv.slice(2);
if (!['add', 'remove'].includes(action) || !email) {
  console.error('usage: tsx scripts/allowlist.ts <add|remove> <email>');
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const normalized = email.toLowerCase();
if (action === 'add') {
  const { error } = await admin.from('allowed_emails').upsert({ email: normalized });
  if (error) throw error;
  console.log(`✓ allowlisted ${normalized}`);
} else {
  const { error } = await admin.from('allowed_emails').delete().eq('email', normalized);
  if (error) throw error;
  console.log(`✓ removed ${normalized}`);
}
