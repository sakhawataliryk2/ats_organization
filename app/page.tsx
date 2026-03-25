"use client"
import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Changed from next/router to next/navigation

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]); // Added router to the dependency array

  return null;
}