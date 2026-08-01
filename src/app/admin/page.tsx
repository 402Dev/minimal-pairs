import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, verifyAdminSessionToken } from "@/lib/admin-auth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import AdminDashboard from "@/components/admin/AdminDashboard";

// Kept out of search engines and off any nav — this route is only ever
// reached by someone who already knows the URL.
export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Hidden developer/admin panel. Not linked from the public app anywhere.
 * Gated by a single shared password (see lib/admin-auth.ts) — enough for
 * a one-operator internal tool, not intended as a multi-user auth system.
 */
export default async function AdminPage() {
  if (!isAdminConfigured) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white px-6 text-center">
        <p className="text-sm text-neutral-500">
          Admin panel is not configured. Set <code className="text-neutral-800">ADMIN_PASSWORD</code> in
          your environment to enable it.
        </p>
      </main>
    );
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const authorized = verifyAdminSessionToken(session);

  if (!authorized) {
    return <AdminLoginForm />;
  }

  return <AdminDashboard />;
}
