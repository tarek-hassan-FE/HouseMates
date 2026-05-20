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

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.refresh();
    router.push("/dashboard");
  }

  return (
    <main className="bg-background flex min-h-full flex-col items-center justify-center px-margin-mobile py-12">
      <Card className="glass-card shadow-card w-full max-w-md rounded-3xl border-outline-variant/30">
        <CardHeader className="text-center">
          <CardTitle className="text-headline-lg text-primary">
            {t("welcomeBack")}
          </CardTitle>
          <CardDescription className="text-body-md text-on-surface-variant">
            {t("signInDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
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
                autoComplete="current-password"
                required
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
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>
          <p className="text-muted-foreground mt-6 text-center text-sm">
            {t("noAccount")}{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              {t("createOne")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
