"use client";

import { Ban, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DisabledPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Ban className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl">Conta Desativada</CardTitle>
        <CardDescription>
          Sua conta foi desativada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Sua conta foi desativada e voce nao tem mais acesso ao sistema.
            Entre em contato com o administrador se acredita que isso e um erro.
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair da Conta
        </Button>
      </CardContent>
    </Card>
  );
}
