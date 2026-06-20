# FitRivals Supabase setup

1. Run `fitrivals_auth.sql` once in the Supabase SQL Editor.
2. In Authentication → URL Configuration:
   - Set **Site URL** to `fitrivals://auth/callback` for the APK-only deployment.
   - Add `fitrivals://auth/callback` to **Redirect URLs**.
   - Remove localhost redirect entries once local web testing is no longer needed.
3. Enable the desired providers in Authentication → Providers:
   - Google
   - Apple
   - GitHub
4. Add each provider's client ID/secret in Supabase. The APK already opens OAuth in the secure system browser and returns through the FitRivals deep link.
5. Create the Aman and Rishit accounts through the normal Sign Up screen using usernames `aman` and `rishit`. Their Brotherhood pairing is automatic.

Email/password and OAuth use Supabase Auth. Username sign-in uses the small `resolve_fitrivals_login` database function; passwords never pass through that function.
