import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    employeeId?: string;
    department?: string;
    avatar?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      employeeId?: string;
      department?: string;
      avatar?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    id: string;
    employeeId?: string;
    department?: string;
    avatar?: string;
  }
}
