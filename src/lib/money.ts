const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Money is stored as integer paise.
export function formatPaise(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new Error("Invalid amount in paise");
  return rupees.format(paise / 100);
}
