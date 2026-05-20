"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createHouseAction, joinHouseAction } from "@/app/[locale]/(onboarding)/actions";

export function OnboardingForm() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createHouseAction(formData);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.inviteCode) {
      setInviteCode(result.inviteCode);
    } else {
      router.refresh();
      router.push("/dashboard");
    }
  }

  async function handleJoin(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await joinHouseAction(formData);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();
    router.push("/dashboard");
  }

  if (inviteCode) {
    return (
      <Card className="glass-card shadow-card w-full max-w-lg border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl">
            {t("houseCreated")}
          </CardTitle>
          <CardDescription>{t("shareInvite")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="bg-secondary-container text-secondary rounded-xl px-6 py-4">
            <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-widest uppercase">
              {t("inviteCode")}
            </p>
            <p className="font-heading text-3xl font-bold tracking-widest">
              {inviteCode}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => navigator.clipboard.writeText(inviteCode)}
            >
              {tc("copyCode")}
            </Button>
            <Button
              type="button"
              className="btn-press w-full rounded-xl font-bold sm:w-auto"
              onClick={() => {
                router.refresh();
                router.push("/dashboard");
              }}
            >
              {t("goToDashboard")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-card w-full max-w-lg border-border/60">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">{t("welcome")}</CardTitle>
        <CardDescription>{t("createOrJoin")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2 rounded-xl bg-muted p-1">
            <TabsTrigger value="create" className="rounded-lg font-semibold">
              {t("createHouse")}
            </TabsTrigger>
            <TabsTrigger value="join" className="rounded-lg font-semibold">
              {t("joinWithCode")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await handleCreate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="houseName">{t("houseName")}</Label>
                <Input
                  id="houseName"
                  name="houseName"
                  placeholder={t("houseNamePlaceholder")}
                  required
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
                className="btn-press h-14 w-full rounded-xl text-base font-bold"
              >
                {loading ? t("creating") : t("createHouse")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="join">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await handleJoin(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="inviteCode">{t("inviteCode")}</Label>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  placeholder="ABCD1234"
                  required
                  className="h-14 rounded-xl uppercase tracking-widest"
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
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
                className="btn-press h-14 w-full rounded-xl text-base font-bold"
              >
                {loading ? t("joining") : t("joinHouse")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
