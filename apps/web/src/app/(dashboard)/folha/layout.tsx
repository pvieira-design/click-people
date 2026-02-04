import { auth } from "@click-people/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import prisma from "@click-people/db";

export default async function FolhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
