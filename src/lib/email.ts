/** Kiểm tra cú pháp email (không xác minh hộp thư thực sự tồn tại). */
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 6 || email.length > 254 || /\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!/^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~.-]+$/.test(local)) return false;
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some(label => !label || label.length > 63 || !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label))) return false;
  const tld = labels[labels.length - 1];
  return tld.length >= 2 && /^[A-Za-z]{2,}$/.test(tld);
}
