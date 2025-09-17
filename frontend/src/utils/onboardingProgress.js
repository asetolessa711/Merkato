export function getOnboardingStep(pathname = '') {
  const total = 3;
  const p = String(pathname || '').toLowerCase();
  let step = 1;
  let label = 'Registration';
  if (p.includes('/vendor/onboarding')) { step = 3; label = 'Onboarding'; }
  else if (p.includes('/vendor/onboard')) { step = 2; label = 'Invite Verification'; }
  else if (p.includes('/vendor/register')) { step = 1; label = 'Registration'; }
  const percent = Math.round((step / total) * 100);
  return { step, total, percent, label };
}

export default getOnboardingStep;