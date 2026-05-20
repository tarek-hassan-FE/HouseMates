export function choreIconName(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("trash") || t.includes("garbage")) return "delete";
  if (t.includes("kitchen") || t.includes("dishes")) return "soup_kitchen";
  if (t.includes("plant") || t.includes("water")) return "water_drop";
  if (t.includes("vacuum") || t.includes("floor")) return "cleaning_services";
  if (t.includes("laundry")) return "local_laundry_service";
  return "task_alt";
}
