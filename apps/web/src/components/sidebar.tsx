"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  Network,
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
import { trpc } from "@/utils/trpc";

import Logo from "./logo";
import { Badge } from "./ui/badge";
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
    countKey: "recess" as const,
  },
  {
    title: "Desligamento",
    href: "/solicitacoes/desligamento",
    icon: UserMinus,
    countKey: "termination" as const,
  },
  {
    title: "Contratacao",
    href: "/solicitacoes/contratacao",
    icon: UserPlus,
    countKey: "hiring" as const,
  },
  {
    title: "Compra",
    href: "/solicitacoes/compra",
    icon: CreditCard,
    countKey: "purchase" as const,
  },
  {
    title: "Remuneracao",
    href: "/solicitacoes/remuneracao",
    icon: DollarSign,
    countKey: "remuneration" as const,
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
    title: "Organograma",
    href: "/admin/organograma",
    icon: Network,
  },
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
    title: "Senioridades",
    href: "/admin/niveis",
    icon: Layers,
  },
  {
    title: "Configuracoes",
    href: "/admin/configuracoes",
    icon: Settings,
  },
];

type PendingCounts = {
  recess: number;
  termination: number;
  hiring: number;
  purchase: number;
  remuneration: number;
  total: number;
};

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Buscar contagens de solicitacoes pendentes
  const pendingCountsQuery = useQuery(trpc.user.getPendingCounts.queryOptions());
  const pendingCounts = pendingCountsQuery.data as PendingCounts | undefined;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const NavLink = ({
    href,
    icon: Icon,
    title,
    badgeCount,
  }: {
    href: string;
    icon: any;
    title: string;
    badgeCount?: number;
  }) => {
    // Para /folha e /folha/bonus, só ativa se for exatamente igual
    // Para outras rotas, usa startsWith para subpáginas
    const isExactMatch = pathname === href;
    const isSubPage = pathname.startsWith(href + "/") && !href.endsWith("/bonus");
    const isActive = isExactMatch || (isSubPage && href !== "/folha");

    return (
      <Link
        href={href as any}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
          isActive
            ? "bg-primary text-white shadow-md"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{title}</span>
            {badgeCount !== undefined && badgeCount > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  "ml-auto h-5 min-w-5 justify-center px-1.5 text-xs font-medium",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                )}
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </Badge>
            )}
          </>
        )}
        {collapsed && badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-medium text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </Link>
    );
  };

  const NavSection = ({
    title,
    items,
    showBadges = false,
  }: {
    title: string;
    items: typeof mainNavItems | typeof requestNavItems;
    showBadges?: boolean;
  }) => (
    <div className="space-y-1">
      {!collapsed && (
        <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-primary/70">
          {title}
        </h3>
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const badgeCount =
            showBadges && "countKey" in item && pendingCounts
              ? pendingCounts[item.countKey as keyof PendingCounts]
              : undefined;
          return (
            <div key={item.href} className="relative">
              <NavLink
                href={item.href}
                icon={item.icon}
                title={item.title}
                badgeCount={typeof badgeCount === "number" ? badgeCount : undefined}
              />
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <aside
      className={cn(
        "flex flex-col border-r glass-strong text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center px-4 bg-primary">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <Logo size={20} className="text-white" />
            </div>
            <span className="font-semibold text-white">Click People</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Logo size={20} className="text-white" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto text-white hover:bg-white/20", collapsed && "mx-auto")}
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
        <NavSection title="Solicitacoes" items={requestNavItems} showBadges />
        {isAdmin && <NavSection title="Folha de Pagamento" items={payrollNavItems} />}
        {isAdmin && <NavSection title="Administracao" items={adminNavItems} />}
      </div>

      <div className="border-t border-primary/10 p-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10",
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
