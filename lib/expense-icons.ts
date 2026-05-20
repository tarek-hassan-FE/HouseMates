export function expenseIconName(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("electric") || t.includes("utility")) return "electric_bolt";
  if (t.includes("grocery") || t.includes("food") || t.includes("whole foods"))
    return "shopping_cart";
  if (t.includes("clean")) return "cleaning_services";
  if (t.includes("rent") || t.includes("lease")) return "home";
  if (t.includes("internet") || t.includes("wifi")) return "wifi";
  return "receipt_long";
}
