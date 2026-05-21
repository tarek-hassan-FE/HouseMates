import { getLocale, getTranslations } from "next-intl/server";
import { StatCard } from "@/components/system/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { centsToDisplay } from "@/lib/money";
import { formatDate, formatNumber } from "@/lib/format";
import type { SystemStats } from "@/lib/system/stats";

type SystemDashboardProps = {
  stats: SystemStats;
};

export async function SystemDashboard({ stats }: SystemDashboardProps) {
  const t = await getTranslations("system");
  const locale = await getLocale();
  const fmt = (n: number) => formatNumber(n, locale);

  const userHouseRate =
    stats.users.total > 0
      ? Math.round((stats.users.with_house / stats.users.total) * 100)
      : 0;

  const limits = stats.limits;

  return (
    <div className="space-y-10">
      {limits && (
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-on-surface">
              {t("sections.limits")}
            </h2>
            <p className="text-sm text-on-surface-variant">
              {t("sections.limitsHint")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t("stats.betaUsersCap")}
              value={`${fmt(limits.user_count)} / ${fmt(limits.max_users)}`}
              description={`${limits.users_used_pct}%`}
              icon="group"
            />
            <StatCard
              title={t("stats.betaHousesCap")}
              value={`${fmt(limits.house_count)} / ${fmt(limits.max_houses)}`}
              description={`${limits.houses_used_pct}%`}
              icon="apartment"
            />
            <StatCard
              title={
                limits.signup_open
                  ? t("stats.signupOpen")
                  : t("stats.signupClosed")
              }
              value={limits.signup_open ? "✓" : "—"}
              icon="person_add"
            />
            <StatCard
              title={
                limits.onboarding_open
                  ? t("stats.onboardingOpen")
                  : t("stats.onboardingClosed")
              }
              value={limits.onboarding_open ? "✓" : "—"}
              icon="add_home"
            />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-on-surface">
            {t("sections.users")}
          </h2>
          <p className="text-sm text-on-surface-variant">{t("sections.usersHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("stats.totalUsers")}
            value={fmt(stats.users.total)}
            icon="group"
          />
          <StatCard
            title={t("stats.inHouses")}
            value={fmt(stats.users.with_house)}
            description={t("stats.houseRate", { rate: userHouseRate })}
            icon="home"
          />
          <StatCard
            title={t("stats.signups7d")}
            value={fmt(stats.users.created_last_7d)}
            icon="person_add"
          />
          <StatCard
            title={t("stats.signups30d")}
            value={fmt(stats.users.created_last_30d)}
            icon="trending_up"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-on-surface">
            {t("sections.houses")}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("stats.totalHouses")}
            value={fmt(stats.houses.total)}
            icon="apartment"
          />
          <StatCard
            title={t("stats.newHouses7d")}
            value={fmt(stats.houses.created_last_7d)}
            icon="add_home"
          />
          <StatCard
            title={t("stats.newHouses30d")}
            value={fmt(stats.houses.created_last_30d)}
            icon="calendar_month"
          />
          <StatCard
            title={t("stats.avgMembers")}
            value={String(stats.houses.avg_members)}
            icon="groups"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-on-surface">
            {t("sections.usage")}
          </h2>
          <p className="text-sm text-on-surface-variant">{t("sections.usageHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title={t("stats.totalExpenses")}
            value={fmt(stats.expenses.total)}
            description={centsToDisplay(stats.expenses.total_amount_cents, {
              locale,
            })}
            icon="payments"
          />
          <StatCard
            title={t("stats.expenses7d")}
            value={fmt(stats.expenses.last_7d_count)}
            description={centsToDisplay(stats.expenses.last_7d_amount_cents, {
              locale,
            })}
            icon="receipt_long"
          />
          <StatCard
            title={t("stats.expenses30d")}
            value={fmt(stats.expenses.last_30d_count)}
            icon="shopping_cart"
          />
          <StatCard
            title={t("stats.ledgerVsShopping")}
            value={`${fmt(stats.expenses.ledger_count)} / ${fmt(stats.expenses.shopping_count)}`}
            description={t("stats.ledgerVsShoppingHint")}
            icon="compare_arrows"
          />
          <StatCard
            title={t("stats.chores")}
            value={fmt(stats.chores.total)}
            description={t("stats.choreCompletions", {
              approved: stats.chores.completions_approved,
              pending: stats.chores.completions_pending,
            })}
            icon="task_alt"
          />
          <StatCard
            title={t("stats.choreActivity7d")}
            value={fmt(stats.chores.completions_last_7d)}
            icon="check_circle"
          />
          <StatCard
            title={t("stats.unsettledDebts")}
            value={fmt(stats.debts.unsettled_count)}
            description={centsToDisplay(stats.debts.unsettled_amount_cents, {
              locale,
            })}
            icon="account_balance"
          />
          <StatCard
            title={t("stats.notifications")}
            value={fmt(stats.notifications.total)}
            description={t("stats.unreadNotifications", {
              count: stats.notifications.unread,
            })}
            icon="notifications"
          />
          <StatCard
            title={t("stats.rewards")}
            value={fmt(stats.rewards.redemptions_total)}
            description={t("stats.xpSpent", {
              xp: fmt(stats.rewards.xp_spent_total),
            })}
            icon="redeem"
          />
          <StatCard
            title={t("stats.shoppingItems")}
            value={fmt(stats.shopping.items_total)}
            icon="list_alt"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-on-surface">
            {t("sections.topHouses")}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {t("sections.topHousesHint")}
          </p>
        </div>
        <Card className="bg-surface-container-low">
          <CardHeader>
            <CardTitle>{t("topHouses.title")}</CardTitle>
            <CardDescription>{t("topHouses.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.top_houses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("topHouses.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/40 text-on-surface-variant">
                      <th className="pb-3 pr-4 font-medium">{t("topHouses.name")}</th>
                      <th className="pb-3 pr-4 font-medium">{t("topHouses.members")}</th>
                      <th className="pb-3 pr-4 font-medium">{t("topHouses.expenses")}</th>
                      <th className="pb-3 font-medium">{t("topHouses.created")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_houses.map((house) => (
                      <tr
                        key={house.id}
                        className="border-b border-outline-variant/20 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-on-surface">
                          {house.name}
                        </td>
                        <td className="py-3 pr-4">{fmt(house.member_count)}</td>
                        <td className="py-3 pr-4">{fmt(house.expense_count)}</td>
                        <td className="py-3 text-on-surface-variant">
                          {formatDate(house.created_at, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-on-surface-variant">
        {t("generatedAt", {
          time: formatDate(stats.generated_at, locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        })}
      </p>
    </div>
  );
}
