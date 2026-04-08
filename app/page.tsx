'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Users,
  TrendingUp,
  Receipt,
  RefreshCw,
  Send,
  Menu,
  X,
  ChevronDown,
  Shield,
  Globe,
  Zap,
  CheckCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  { icon: FileText, title: 'GST Tax Invoices', description: 'Create compliant NZ tax invoices with automatic GST calculation at 15%.' },
  { icon: Users, title: 'Client Management', description: 'Store client details, track invoice history, and manage relationships in one place.' },
  { icon: TrendingUp, title: 'Financial Dashboard', description: 'Real-time visibility into revenue, expenses, and outstanding payments.' },
  { icon: Receipt, title: 'Expense Tracking', description: 'Log expenses, snap receipts with OCR, and import bank statements.' },
  { icon: RefreshCw, title: 'Recurring Invoices', description: 'Set up automatic billing for retainer clients — weekly, monthly, or quarterly.' },
  { icon: Send, title: 'Email & PDF Delivery', description: 'Generate professional PDFs and email invoices directly to clients.' },
];

interface Step {
  number: number;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { number: 1, title: 'Sign Up', description: 'Create your free account in 30 seconds.' },
  { number: 2, title: 'Create Invoice', description: 'Add your client, line items, and hit send.' },
  { number: 3, title: 'Get Paid', description: 'Track payments and send reminders automatically.' },
];

interface TrustItem {
  icon: React.ElementType;
  label: string;
}

const TRUST_ITEMS: TrustItem[] = [
  { icon: Zap, label: 'Built on AWS' },
  { icon: CheckCircle, label: 'GST Compliant' },
  { icon: Shield, label: 'Bank-Grade Security' },
  { icon: Globe, label: 'Made in NZ 🇳🇿' },
];

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  { question: 'What is Ledgr?', answer: 'A modern business platform built for NZ freelancers and small businesses. Invoicing, expenses, payroll, client management, and financial reporting — all in one place.' },
  { question: 'Is Ledgr GST compliant?', answer: 'Yes. All invoices include GST at the standard NZ rate of 15%. Invoices follow the IRD requirements for valid tax invoices.' },
  { question: 'How does invoice numbering work?', answer: 'Invoices are automatically numbered using the format INV-YYMM-XXX (e.g., INV-2604-001), so you never have to worry about duplicates.' },
  { question: 'Can I track expenses too?', answer: 'Yes. Log expenses manually, snap receipts for automatic OCR extraction, or import bank statements via CSV.' },
  { question: 'Is my data secure?', answer: 'Absolutely. Ledgr runs on AWS with Cognito authentication, encrypted storage, and owner-scoped data isolation. Your data is never accessible to other users.' },
  { question: 'How do I get started?', answer: 'Sign up for a free account — it takes less than a minute. You can start creating invoices immediately.' },
];

const CONTACT_EMAIL = 'info@cloudpro-dgital.co.nz';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className={dark ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}>
      {/* ---- NAV ---- */}
      <nav
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          dark
            ? 'bg-gray-950/80 border-gray-800'
            : 'bg-white/80 border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/ledgr-logo.svg"
                alt="Ledgr logo"
                width={32}
                height={32}
              />
              <span className="text-lg font-bold tracking-tight">
                Ledgr
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className={`text-sm font-medium transition-colors ${dark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Features</a>
              <a href="#pricing" className={`text-sm font-medium transition-colors ${dark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Pricing</a>
              <a href="#contact" className={`text-sm font-medium transition-colors ${dark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Contact</a>
              <Link href="/auth/login" className={`text-sm font-medium transition-colors ${dark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Sign In</Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t ${dark ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
            <div className="px-4 py-4 space-y-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className={`block text-sm font-medium py-2 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Features</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className={`block text-sm font-medium py-2 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Pricing</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className={`block text-sm font-medium py-2 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Contact</a>
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className={`block text-sm font-medium py-2 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Sign In</Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* ---- HERO ---- */}
        <section className="relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600" />
          {/* Decorative circles */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Your business.
              <br />
              One platform.
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-primary-100 leading-relaxed">
              Invoicing, expenses, payroll, and more — all in one place. Built for New Zealand freelancers and small businesses.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="px-8 py-4 text-lg font-medium text-primary-700 bg-white hover:bg-gray-100 rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Start Free Trial
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-4 text-lg font-medium text-white border-2 border-white/40 hover:border-white/70 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            </div>

            <p className="mt-8 text-sm text-primary-200">
              Made in New Zealand 🇳🇿
            </p>
          </div>
        </section>

        {/* ---- FEATURES ---- */}
        <section id="features" className={`py-20 sm:py-24 ${dark ? 'bg-gray-950' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Everything you need to run your business
              </h2>
              <p className={`mt-4 text-lg ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                Powerful tools designed for NZ freelancers and small businesses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className={`p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${
                    dark
                      ? 'bg-gray-900 border-gray-800'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-primary-600/10 mb-4">
                    <feature.icon className="w-6 h-6 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className={`text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- HOW IT WORKS ---- */}
        <section className={`py-20 sm:py-24 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                How it works
              </h2>
              <p className={`mt-4 text-lg ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                Get up and running in minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
              {/* Connector line (desktop only) */}
              <div className={`hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 ${dark ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ left: '20%', right: '20%' }} />

              {STEPS.map((step) => (
                <div key={step.number} className="flex flex-col items-center text-center relative">
                  <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-secondary-600 text-white text-2xl font-bold mb-6 relative z-10">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- TRUST ---- */}
        <section className={`py-16 sm:py-20 ${dark ? 'bg-gray-950' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border ${
                    dark
                      ? 'bg-gray-900 border-gray-800'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <item.icon className="w-8 h-8 text-primary-500" />
                  <span className="text-sm font-medium text-center">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- PRICING ---- */}
        <section id="pricing" className={`py-20 sm:py-24 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Simple, transparent pricing
              </h2>
            </div>

            <div className={`max-w-lg mx-auto rounded-2xl shadow-lg p-8 sm:p-10 text-center border ${
              dark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}>
              <p className={`text-lg mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                We&apos;re currently in early access.
              </p>
              <p className={`text-sm mb-6 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                Contact us for pricing details and to discuss your needs.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary-500 hover:text-primary-400 font-medium text-sm underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                >
                  Get in Touch
                </a>
                <Link
                  href="/auth/signup"
                  className={`w-full sm:w-auto px-6 py-3 text-sm font-medium rounded-lg border transition-colors text-center ${
                    dark
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section id="faq" className={`py-20 sm:py-24 ${dark ? 'bg-gray-950' : 'bg-white'}`}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Frequently asked questions
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-xl border overflow-hidden ${
                    dark ? 'border-gray-800' : 'border-gray-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleFaq(index);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium transition-colors ${
                      dark
                        ? 'hover:bg-gray-900'
                        : 'hover:bg-gray-50'
                    }`}
                    aria-expanded={openFaq === index}
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 ml-4 transition-transform duration-200 ${
                        openFaq === index ? 'rotate-180' : ''
                      } ${dark ? 'text-gray-400' : 'text-gray-500'}`}
                    />
                  </button>
                  {/* Answer — visible by default in HTML for progressive enhancement / SSR */}
                  <div
                    className={`px-6 pb-4 text-sm leading-relaxed transition-all duration-200 ${
                      openFaq === index ? 'block' : 'hidden'
                    } ${dark ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {item.answer}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---- FOOTER ---- */}
      <footer
        id="contact"
        className={`border-t py-12 ${
          dark
            ? 'bg-gray-900 border-gray-800'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
              © 2026 Ledgr by CloudPro Digital. Made with ❤️ in New Zealand 🇳🇿
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <a href="#features" className={`transition-colors ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Features</a>
              <a href="#pricing" className={`transition-colors ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Pricing</a>
              <a href={`mailto:${CONTACT_EMAIL}`} className={`transition-colors ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Contact</a>
              <Link href="/auth/login" className={`transition-colors ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Sign In</Link>
              <Link href="/auth/signup" className={`transition-colors ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Sign Up</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
