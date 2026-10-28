import { Linking, Platform } from "react-native";

export function buildWaUrl(phone: string, text: string): string {
  // Strip non-digits, keep leading '+' expectation. wa.me expects country code without +.
  const digits = phone.replace(/[^\d]/g, "");
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${digits}?text=${encoded}`;
}

export async function openWhatsApp(phone: string, text: string) {
  const url = buildWaUrl(phone, text);
  if (Platform.OS === "web") {
    window.open(url, "_blank");
    return true;
  }
  const supported = await Linking.canOpenURL(url);
  if (!supported) return false;
  await Linking.openURL(url);
  return true;
}

export function fmtCurrency(n: number): string {
  return `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
}

export const WA_TEMPLATES = {
  quotation: (opts: { customerName: string; amount: number; title: string }) =>
    `Namaste ${opts.customerName},\n\nPlease find your quotation from Mauli Events for *${opts.title}*.\n\nTotal: ${fmtCurrency(opts.amount)}\n\nKindly share your confirmation. Any changes, please let us know.\n\n— Team Mauli Events`,
  invoice: (opts: { customerName: string; amount: number; invoiceId: string }) =>
    `Namaste ${opts.customerName},\n\nSharing invoice ${opts.invoiceId.slice(0, 8).toUpperCase()} from Mauli Events.\n\nAmount: ${fmtCurrency(opts.amount)}\n\nPlease let us know on confirmation of payment. Thank you!\n\n— Team Mauli Events`,
  reminder: (opts: { customerName: string; amount: number }) =>
    `Namaste ${opts.customerName},\n\nGentle reminder — a balance of ${fmtCurrency(opts.amount)} is pending from your recent event with Mauli Events.\n\nKindly process at your convenience. For any questions, please message us.\n\n— Team Mauli Events`,
  eventConfirmation: (opts: { customerName: string; eventType: string; date: string; venue?: string }) =>
    `Namaste ${opts.customerName},\n\nYour *${opts.eventType}* on ${opts.date}${opts.venue ? ` at ${opts.venue}` : ""} is *confirmed* with Mauli Events. We will reach out closer to the date with final arrangements.\n\n— Team Mauli Events`,
  rawMaterial: (opts: { customerName: string; eventType: string; list: string[] }) =>
    `Namaste ${opts.customerName},\n\nCatering raw-material list for your *${opts.eventType}*:\n${opts.list.map((l) => `• ${l}`).join("\n")}\n\nKindly confirm the quantities.\n\n— Team Mauli Events`,
};
