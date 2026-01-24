import { auth } from "@click-people/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import prisma from "@click-people/db";

import Sidebar from "@/components/sidebar";
import { UserNav } from "@/components/user-nav";

export default async function DashboardLayout({
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

  // Busca o usuario completo do banco
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      status: true,
      isAdmin: true,
      name: true,
      email: true,
    },
  });

  // Verifica status do usuario
  if (!user || user.status !== "ACTIVE") {
    if (!user || user.status === "PENDING") {
      redirect("/pending");
    }
    if (user?.status === "REJECTED") {
      redirect("/rejected");
    }
    if (user?.status === "DISABLED") {
      redirect("/disabled");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden gradient-primary-subtle">
      <Sidebar isAdmin={user.isAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b glass-subtle px-6">
          <div />
          <UserNav
            name={user.name}
            email={user.email}
            isAdmin={user.isAdmin}
          />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
