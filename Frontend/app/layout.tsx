'use client'
// import { type Metadata } from 'next'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from "next/link"
import './globals.css'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

function RedirectIfSignedIn() {
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    if (pathname !== "/dashboard" && pathname !== "/main") {
      router.replace('/dashboard')
    }
  }, [router, pathname])
  return null
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {/* Navbar */}
          <nav className="flex justify-between items-center px-6 py-4 h-20 bg-white shadow-sm">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-700">
                <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill="#2563eb"/>
                  <path d="M7 12l5 5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 12l5-5 5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Gmail Phishing Detector
              </Link>
              <div className="hidden md:flex gap-6 ml-10">
                <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">Home</Link>
                <Link href="#features" className="text-gray-700 hover:text-blue-600 font-medium">Features</Link>
                <Link href="#how" className="text-gray-700 hover:text-blue-600 font-medium">How It Works</Link>
                <Link href="#contact" className="text-gray-700 hover:text-blue-600 font-medium">Contact</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SignedOut>
                <SignInButton>
                  <button className="bg-blue-600 text-white rounded-full font-medium text-sm h-10 px-5 hover:bg-blue-700 transition">Sign In</button>
                </SignInButton>
                <SignUpButton>
                  <button className="bg-gray-100 text-blue-600 rounded-full font-medium text-sm h-10 px-5 border border-blue-600 hover:bg-blue-50 transition">Sign Up</button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <RedirectIfSignedIn />
                <UserButton />
              </SignedIn>
            </div>
          </nav>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}