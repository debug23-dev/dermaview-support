import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MEDICAL_DISCLAIMER } from "@/lib/prediction/risk";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — DermaCare AI" },
      {
        name: "description",
        content: "Sign in to the DermaCare AI skin screening dashboard for clinics and doctors.",
      },
      { property: "og:title", content: "Sign in — DermaCare AI" },
      {
        property: "og:description",
        content: "Secure staff sign-in for the DermaCare AI skin screening support system.",
      },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(200),
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    await router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold">DermaCare AI</h1>
            <p className="text-sm text-muted-foreground">Skin screening & review support</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Staff sign in</CardTitle>
            <CardDescription>Use your clinic account to open the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  maxLength={200}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              No account yet?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Register a staff account
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
      </div>
    </div>
  );
}
