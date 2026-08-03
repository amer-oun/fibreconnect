/**
 * Module augmentation: teaches TypeScript about the extra fields this project
 * puts on the NextAuth session and JWT. Without it, `session.user.role` would
 * not exist as far as the compiler is concerned.
 */

import type { Role } from "@/lib/constants";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /** Objet renvoye par `authorize()` dans lib/auth.ts. */
  interface User {
    id: string;
    email: string;
    role: Role;
    nom: string;
    prenom: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      nom: string;
      prenom: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    nom: string;
    prenom: string;
  }
}
