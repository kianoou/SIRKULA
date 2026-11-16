/**
 * Normalisasi nomor WhatsApp Indonesia: 08xx, 8xx, 62xx, 0062xx -> 62xx.
 */
export function normalizeWhatsApp(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  return digits;
}

export function isValidWhatsApp(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return true;
  const normalized = normalizeWhatsApp(raw);
  return normalized.length >= 9 && normalized.length <= 15;
}

export function formatWhatsApp(raw) {
  const normalized = normalizeWhatsApp(raw);
  return normalized ? `+${normalized}` : '';
}

export function whatsAppLink(raw) {
  const normalized = normalizeWhatsApp(raw);
  return normalized ? `https://wa.me/${normalized}` : '';
}

export function withWhatsAppMessage(raw, message) {
  const link = whatsAppLink(raw);
  return link && message ? `${link}?text=${encodeURIComponent(message)}` : link;
}
