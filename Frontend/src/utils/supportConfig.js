function cleanEnv(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getSupportConfig() {
  const env = import.meta.env || {};
  const email = cleanEnv(env.VITE_SUPPORT_EMAIL);
  const phone = cleanEnv(env.VITE_SUPPORT_PHONE);
  const hours = cleanEnv(env.VITE_SUPPORT_HOURS);
  const companyLegalName = cleanEnv(env.VITE_COMPANY_LEGAL_NAME);
  const companyAddress = cleanEnv(env.VITE_COMPANY_ADDRESS);

  return {
    email,
    phone,
    hours,
    companyLegalName,
    companyAddress,
    hasAnyContact: Boolean(
      email || phone || hours || companyLegalName || companyAddress
    ),
  };
}
