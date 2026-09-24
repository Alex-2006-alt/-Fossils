// Development-only bootstrap. Never embed real credentials in client code or seeds.
import { prisma } from "./src/lib/db";
import bcrypt from "bcryptjs";
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  newToken,
} from "@famvault/runtime/security";
if (process.env.NODE_ENV === "production")
  throw new Error("Development seed is disabled in production");

async function main() {
  const email = emailSchema.parse(process.env.SEED_EMAIL);
  const password = passwordSchema.parse(process.env.SEED_PASSWORD);
  const name = nameSchema.parse(process.env.SEED_NAME);
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      name,
      password: hash,
      role: "OWNER",
      family: { create: { name: "Development family", inviteCode: newToken() } },
    },
  });
  await prisma.$disconnect();
}
main().catch(console.error);
