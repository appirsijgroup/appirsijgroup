'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in via localStorage as a quick check
    const userId = localStorage.getItem('loggedInUserId');
    if (userId) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <p>Redirecting...</p>
    </div>
  );
}
