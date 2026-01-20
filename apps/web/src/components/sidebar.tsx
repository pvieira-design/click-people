"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

interface SidebarProps {
  isAdmin?: boolean;
}

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

const requestNavItems = [
  {
    title: "Recesso/Ferias",
    href: "/solicitacoes/recesso",
    icon: CalendarDays,
  },
  {
    title: "Desligamento",
    href: "/solicitacoes/desligamento",
    icon: UserMinus,
  },
  {
    title: "Contratacao",
    href: "/solicitacoes/contratacao",
    icon: UserPlus,
  },
  {
    title: "Compra",
    href: "/solicitacoes/compra",
    icon: CreditCard,
  },
  {
    title: "Remuneracao",
    href: "/solicitacoes/remuneracao",
    icon: DollarSign,
  },
];

const payrollNavItems = [
  {
    title: "Folha",
    href: "/folha",
    icon: FileText,
  },
  {
    title: "Bonus",
    href: "/folha/bonus",
    icon: DollarSign,
  },
];

const adminNavItems = [
  {
    title: "Usuarios",
    href: "/admin/usuarios",
    icon: Users,
  },
  {
    title: "Prestadores",
    href: "/admin/prestadores",
    icon: Users,
  },
  {
    title: "Areas",
    href: "/admin/areas",
    icon: Home,
  },
  {
    title: "Cargos",
    href: "/admin/cargos",
    icon: ShieldCheck,
  },
  {
    title: "Configuracoes",
    href: "/admin/configuracoes",
    icon: Settings,
  },
];

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const NavLink = ({ href, icon: Icon, title }: { href: string; icon: any; title: string }) => {
    // Para /folha e /folha/bonus, só ativa se for exatamente igual
    // Para outras rotas, usa startsWith para subpáginas
    const isExactMatch = pathname === href;
    const isSubPage = pathname.startsWith(href + "/") && !href.endsWith("/bonus");
    const isActive = isExactMatch || (isSubPage && href !== "/folha");

    return (
      <Link
        href={href as any}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{title}</span>}
      </Link>
    );
  };

  const NavSection = ({ title, items }: { title: string; items: typeof mainNavItems }) => (
    <div className="space-y-1">
      {!collapsed && (
        <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
    </div>
  );

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              CP
            </div>
            <span className="font-semibold">Click People</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto", collapsed && "mx-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <NavSection title="Principal" items={mainNavItems} />
        <NavSection title="Solicitacoes" items={requestNavItems} />
        <NavSection title="Folha de Pagamento" items={payrollNavItems} />
        {isAdmin && <NavSection title="Administracao" items={adminNavItems} />}
      </div>

      <div className="border-t p-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-foreground",
            collapsed && "justify-center"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
