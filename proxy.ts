import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { ROLE_ACCUEIL, type Role } from "@/lib/constants";

/**
 * Route protection at the edge of the app.
 *
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`; the behaviour is identical.
 *
 * This is a first filter only: it reads the role from the signed JWT without
 * touching the database. Pages and API routes check the role again server-side
 * (see lib/session.ts), because a proxy cannot verify ownership of a record.
 */

const ESPACES: ReadonlyArray<{ prefixe: string; role: Role }> = [
  { prefixe: "/client", role: "CLIENT" },
  { prefixe: "/technicien", role: "TECHNICIEN" },
  { prefixe: "/superviseur", role: "SUPERVISEUR" },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const espace = ESPACES.find(
    (e) => pathname === e.prefixe || pathname.startsWith(`${e.prefixe}/`),
  );
  if (!espace) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Pas connecte : vers /login, en memorisant la page demandee.
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Connecte mais dans l'espace d'un autre role : retour chez soi.
  if (token.role !== espace.role) {
    const destination = ROLE_ACCUEIL[token.role] ?? "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/client/:path*", "/technicien/:path*", "/superviseur/:path*"],
};
