import type { DefaultSession } from "next-auth";
import type { Role } from "./index";
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      familyId: string;
      familyName: string;
    };
  }
}
