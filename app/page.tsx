'use client';

import dynamic from 'next/dynamic';

const FinanzasApp = dynamic(() => import('./client-app'), {
  ssr: false,
});

export default function Page() {
  return <FinanzasApp />;
}