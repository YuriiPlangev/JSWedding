/** Formats UA phone numbers; preserves trailing text (e.g. "Telegram", @username). */
export const formatPhonePretty = (phoneRaw: string): string => {
  const trimmed = phoneRaw.trim();
  if (!trimmed) return phoneRaw;

  const suffixMatch = trimmed.match(/\s+([A-Za-z@].*)$/);
  const suffix = suffixMatch ? suffixMatch[0] : '';
  const phonePart = suffix ? trimmed.slice(0, -suffix.length) : trimmed;

  const digits = phonePart.replace(/\D/g, '');
  if (!digits) return phoneRaw;

  let local = '';
  if (digits.startsWith('380') && digits.length >= 12) {
    local = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length >= 10) {
    local = digits.slice(1);
  } else if (digits.length === 9) {
    local = digits;
  } else {
    return phoneRaw;
  }

  if (local.length !== 9) return phoneRaw;

  return `+380 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}${suffix}`;
};
