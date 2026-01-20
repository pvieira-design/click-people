import { auth } from "@click-people/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import prisma from "@click-people/db";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Se nao esta logado, redireciona para login
  if (!session?.user) {
    redirect("/login");
  }

  // Busca o status do usuario no banco
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });

  // Redireciona baseado no status
  if (!user || user.status === "PENDING") {
    redirect("/pending");
  }

  if (user.status === "REJECTED") {
    redirect("/rejected");
  }

  if (user.status === "DISABLED") {
    redirect("/disabled");
  }

  // Usuario ativo - redireciona para dashboard
  redirect("/dashboard");
}
