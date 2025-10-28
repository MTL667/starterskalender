import { Role, IdentityProvider } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: Role;
    identityProvider?: IdentityProvider;
  }
  
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: Role;
      identityProvider?: IdentityProvider;
    };
  }
}

