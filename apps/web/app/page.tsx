import { redirect } from 'next/navigation';

export default function RootPage() {
  // Mock Tenant Readiness for onboarding flow testing
  const tenant = { ready: false }; 

  if (!tenant.ready) {
    redirect('/onboarding');
  } else {
    redirect('/dashboard');
  }
}
