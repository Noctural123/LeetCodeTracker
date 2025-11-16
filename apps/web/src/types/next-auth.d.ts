import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    handle?: string;
  }

  interface Session {
    user: {
      id: string;
      handle?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    handle?: string;
  }
}

