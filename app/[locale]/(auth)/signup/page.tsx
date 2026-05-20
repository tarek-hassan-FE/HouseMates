"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/onboarding`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim() },
        emailRedirectTo: redirectTo,
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.refresh();
      router.push("/onboarding");
      return;
    }

    setLoading(false);
    setPendingEmail(email);
  }

  if (pendingEmail) {
    return (
      <main className="bg-background flex min-h-full flex-col items-center justify-center px-margin-mobile py-12">
        <Card className="glass-card shadow-card w-full max-w-md rounded-3xl border-outline-variant/30">
          <CardHeader className="text-center">
            <CardTitle className="text-headline-lg text-primary">
              {t("checkEmailTitle")}
            </CardTitle>
            <CardDescription
              className="text-body-md text-on-surface-variant"
              role="status"
              aria-live="polite"
            >
              {t("checkEmailDescription", { email: pendingEmail })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <Link
              href="/login"
              className="btn-press bg-primary text-primary-foreground inline-flex h-14 w-full items-center justify-center rounded-2xl text-base font-bold"
            >
              {t("backToSignIn")}
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="bg-background flex min-h-full flex-col items-center justify-center px-margin-mobile py-12">
      <Card className="glass-card shadow-card w-full max-w-md rounded-3xl border-outline-variant/30">
        <CardHeader className="text-center">
          <CardTitle className="text-headline-lg text-primary">
            {t("joinTitle")}
          </CardTitle>
          <CardDescription className="text-body-md text-on-surface-variant">
            {t("signUpDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-busy={loading}
          >
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                required
                minLength={2}
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-14 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-xl"
              />
            </div>
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="btn-press bg-primary h-14 w-full rounded-2xl text-base font-bold"
            >
              {loading ? t("creatingAccount") : t("createAccount")}
            </Button>
          </form>
          <p className="text-muted-foreground mt-6 text-center text-sm">
            {t("hasAccount")}{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
