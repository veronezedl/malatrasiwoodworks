import * as React from "react";
import { Lock, Unlock, UserX } from "lucide-react";
import {
  inviteAdmin,
  listAdminUsers,
  revokeAdmin,
  setUserBan,
  type AdminUser,
} from "@/lib/api/adminUsers";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function AdminUsers() {
  useSeo("Usuários · Admin Malatrasi WoodWorks", "Gerencie quem tem acesso ao painel de administração.");
  const { showToast } = useToast();

  const [admins, setAdmins] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [banningId, setBanningId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setAdmins(await listAdminUsers());
    } catch (err) {
      showToast("Não foi possível carregar", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const result = await inviteAdmin(email);
      showToast(
        result.promoted ? "Acesso concedido" : "Convite enviado",
        result.promoted
          ? "Esse email já tinha conta — agora tem acesso ao admin."
          : result.notified
            ? "Enviamos um email para ele criar a senha."
            : "Conta criada, mas não foi possível enviar o email (verifique RESEND_API_KEY).",
      );
      setEmail("");
      load();
    } catch (err) {
      showToast("Não foi possível convidar", err instanceof Error ? err.message : undefined);
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(admin: AdminUser) {
    if (!window.confirm(`Remover o acesso ao admin de ${admin.email}?`)) return;
    setRevokingId(admin.id);
    try {
      await revokeAdmin(admin.id);
      showToast("Acesso removido");
      load();
    } catch (err) {
      showToast("Não foi possível remover o acesso", err instanceof Error ? err.message : undefined);
    } finally {
      setRevokingId(null);
    }
  }

  async function handleBanToggle(admin: AdminUser) {
    const action = admin.is_banned ? "desbloquear" : "bloquear";
    if (!window.confirm(`Quer ${action} completamente a conta de ${admin.email}?`)) return;
    setBanningId(admin.id);
    try {
      await setUserBan(admin.id, !admin.is_banned);
      showToast(admin.is_banned ? "Conta desbloqueada" : "Conta bloqueada");
      load();
    } catch (err) {
      showToast("Não foi possível atualizar", err instanceof Error ? err.message : undefined);
    } finally {
      setBanningId(null);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Usuários do admin</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Pessoas com acesso ao painel de administração. Se o email já tem uma
        conta (ex. é cliente), o acesso é concedido diretamente; se não,
        enviamos um convite para ele criar a senha.
      </p>

      <form
        onSubmit={handleInvite}
        className="mt-6 max-w-md rounded-brand border border-black/10 bg-white p-6"
      >
        <h2 className="font-heading text-sm font-semibold text-primary">
          Convidar novo usuário
        </h2>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: novo@malatrasiwoodworks.com.br"
            required
          />
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={inviting}>
          {inviting ? "Convidando..." : "Convidar"}
        </Button>
      </form>

      <h2 className="mt-8 font-heading text-lg font-bold text-primary">Com acesso atualmente</h2>

      {loading ? (
        <p className="mt-4 py-10 text-center text-text-muted">Carregando...</p>
      ) : admins.length === 0 ? (
        <p className="mt-4 py-10 text-center text-text-muted">Ainda não há usuários.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between gap-3 rounded-brand border border-black/10 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text">{admin.email}</p>
                  {admin.is_self && <Badge variant="primary">Você</Badge>}
                  {admin.is_banned && <Badge variant="accent">Bloqueado</Badge>}
                </div>
                <p className="text-xs text-text-muted">
                  Desde {dateTimeFmt.format(new Date(admin.created_at))}
                  {admin.last_sign_in_at
                    ? ` · Último acesso ${dateTimeFmt.format(new Date(admin.last_sign_in_at))}`
                    : " · Ainda não entrou"}
                </p>
              </div>
              {!admin.is_self && (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => handleBanToggle(admin)}
                    disabled={banningId === admin.id}
                    className="text-text-muted hover:text-accent disabled:opacity-50"
                    aria-label={admin.is_banned ? `Desbloquear ${admin.email}` : `Bloquear ${admin.email}`}
                    title={admin.is_banned ? "Desbloquear conta" : "Bloquear acesso completamente"}
                  >
                    {admin.is_banned ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                  </button>
                  <button
                    onClick={() => handleRevoke(admin)}
                    disabled={revokingId === admin.id}
                    className="text-text-muted hover:text-accent disabled:opacity-50"
                    aria-label={`Remover acesso de ${admin.email}`}
                    title="Remover papel de admin (continua podendo entrar como cliente)"
                  >
                    <UserX className="size-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
