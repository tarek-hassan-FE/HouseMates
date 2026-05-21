import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/design/material-icon";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon: string;
  className?: string;
};

export function StatCard({
  title,
  value,
  description,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("bg-surface-container-low", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
        <div className="min-w-0">
          <CardTitle className="text-sm font-medium text-on-surface-variant">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="mt-1">{description}</CardDescription>
          ) : null}
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <MaterialIcon name={icon} size={22} />
        </span>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
