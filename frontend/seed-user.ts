import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "samiranbera2006@gmail.com";
  const passwordStr = "sbking420";
  const hashedPassword = await bcrypt.hash(passwordStr, 10);

  let family = await prisma.family.findFirst();
  if (!family) {
    family = await prisma.family.create({
      data: {
        name: "Default Family",
        inviteCode: "DEFAULT_INVITE",
      },
    });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
    },
    create: {
      email,
      password: hashedPassword,
      name: "Samiran Bera",
      role: "OWNER",
      familyId: family.id,
    },
  });

  console.log("User created or updated:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
