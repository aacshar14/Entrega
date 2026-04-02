import { redirect } from 'next/navigation';

export default function RootPage() {
  // Mock Auth state for pilot phase
  const isLoggedIn = false; // Set to true to test app flow
  const tenant = { ready: false }; 

  if (!isLoggedIn) {
    redirect('/landing');
  }

  if (!tenant.ready) {
    redirect('/onboarding');
  } else {
    redirect('/dashboard');
  }
}
