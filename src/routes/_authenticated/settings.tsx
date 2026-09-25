import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { profileQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ChronoMind" },
      { name: "description", content: "Manage your ChronoMind profile and password." },
      { property: "og:title", content: "Settings — ChronoMind" },
      { property: "og:description", content: "Your profile and account settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  async function saveProfile() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName.trim() || null });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function changePassword() {
    if (password.length < 6) {
      toast.error("Use at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    toast.success("Password updated");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <PageHeader title="Settings" subtitle="Your profile and account" />

      <section className="surface-card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Your name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your name"
          />
        </div>
        <Button onClick={saveProfile} disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save profile
        </Button>
      </section>

      <section className="surface-card mt-6 space-y-4 p-6">
        <h2 className="text-lg font-semibold">Password</h2>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button variant="secondary" onClick={changePassword} disabled={busy}>
          Update password
        </Button>
      </section>

      <section className="surface-card mt-6 space-y-4 p-6">
        <h2 className="text-lg font-semibold">Session</h2>
        <p className="text-sm text-muted-foreground">
          Your documents and memories are private to your account.
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}
