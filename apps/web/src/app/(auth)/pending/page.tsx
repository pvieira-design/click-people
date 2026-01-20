"use client";

import { Clock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Aguardando Aprovacao</CardTitle>
        <CardDescription>
          Sua conta esta pendente de aprovacao
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {session?.user?.name ? (
              <>
                Ola, <span className="font-medium text-foreground">{session.user.name}</span>!
              </>
            ) : (
              "Ola!"
            )}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu cadastro foi recebido e esta sendo analisado pela equipe administrativa.
            Voce recebera uma notificacao assim que sua conta for aprovada.
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h3 className="font-medium text-sm mb-2">Proximos passos:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>1. Um administrador ira revisar seus dados</li>
            <li>2. Voce sera vinculado a uma ou mais areas</li>
            <li>3. Apos aprovacao, voce tera acesso ao sistema</li>
          </ul>
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
