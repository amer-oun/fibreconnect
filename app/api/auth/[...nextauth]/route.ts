import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// NextAuth expose toutes ses routes (/api/auth/signin, /callback, /session...)
// derriere ce seul segment attrape-tout.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
