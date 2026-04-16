'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'info@cloudpro-dgital.co.nz';

export default function PrivacyPage() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const h2 = `text-xl font-semibold mt-10 mb-4 ${dark ? 'text-white' : 'text-gray-900'}`;
  const h3 = `text-lg font-medium mt-6 mb-2 ${dark ? 'text-gray-200' : 'text-gray-800'}`;
  const p = `text-sm leading-relaxed mb-4 ${dark ? 'text-gray-400' : 'text-gray-600'}`;
  const li = `text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`;
  const ul = 'list-disc pl-6 space-y-1 mb-4';

  return (
    <div className={dark ? 'bg-gray-950 text-white min-h-screen' : 'bg-white text-gray-900 min-h-screen'}>
      {/* Nav */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b ${dark ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl tracking-tight" style={{ fontFamily: "'Lobster', cursive" }}>
              <span className={dark ? 'text-purple-400' : 'text-indigo-500'}>My</span>
              <span className={dark ? 'text-white' : 'text-gray-900'}>Biz</span>
            </span>
          </Link>
          <Link href="/" className={`text-sm flex items-center gap-1 ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
          Privacy Policy
        </h1>
        <p className={`text-sm mb-8 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          Last updated: 8 April 2026
        </p>

        <p className={p}>
          MyBiz is operated by CloudPro Digital Limited, a New Zealand company. We are committed to protecting your
          personal information in accordance with the New Zealand Privacy Act 2020 and the thirteen Information Privacy
          Principles (IPPs). This policy explains what information we collect, why we collect it, how we use and protect
          it, and your rights.
        </p>

        <h2 className={h2}>1. Who we are</h2>
        <p className={p}>
          MyBiz is a cloud-based business platform for invoicing, expense tracking, and financial management. Our
          services are provided by CloudPro Digital Limited. For privacy enquiries, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-500 underline underline-offset-2">{CONTACT_EMAIL}</a>.
        </p>

        <h2 className={h2}>2. Information we collect</h2>
        <p className={p}>We collect personal information only when it is necessary for the services we provide (IPP 1). This includes:</p>
        <h3 className={h3}>Account information</h3>
        <ul className={ul}>
          <li className={li}>Name, email address, and password (for authentication)</li>
          <li className={li}>Business name, address, phone number, GST number, and bank account details</li>
        </ul>
        <h3 className={h3}>Financial data</h3>
        <ul className={ul}>
          <li className={li}>Invoice details (client names, amounts, dates, line items)</li>
          <li className={li}>Expense records (amounts, categories, receipt images)</li>
          <li className={li}>Bank statement data (when you import CSV files)</li>
        </ul>
        <h3 className={h3}>Payment information</h3>
        <ul className={ul}>
          <li className={li}>Subscription plan and billing interval</li>
          <li className={li}>Stripe customer ID and subscription ID (we never store credit card numbers — our payment provider handles all payment card data)</li>
        </ul>
        <h3 className={h3}>Technical data</h3>
        <ul className={ul}>
          <li className={li}>Browser type, device information, and IP address (collected automatically for security and service improvement)</li>
        </ul>

        <h2 className={h2}>3. How we collect information</h2>
        <p className={p}>
          We collect information directly from you when you create an account, set up your company profile, create
          invoices, log expenses, or contact us (IPP 2). We will always tell you when we are collecting personal
          information and why. We do not collect information from third parties without your knowledge.
        </p>

        <h2 className={h2}>4. Purpose of collection</h2>
        <p className={p}>We collect and use your personal information for the following purposes (IPP 3):</p>
        <ul className={ul}>
          <li className={li}>Providing and operating the MyBiz platform</li>
          <li className={li}>Generating invoices, tracking expenses, and producing financial reports</li>
          <li className={li}>Processing receipt images using optical character recognition (OCR)</li>
          <li className={li}>Sending invoice emails on your behalf</li>
          <li className={li}>Managing your subscription and processing payments via our payment provider</li>
          <li className={li}>Communicating with you about your account, service updates, or support requests</li>
          <li className={li}>Complying with legal obligations (e.g., IRD record-keeping requirements)</li>
        </ul>
        <p className={p}>We will not use your personal information for any purpose other than those stated above without your consent.</p>

        <h2 className={h2}>5. Storage and security</h2>
        <p className={p}>
          We take reasonable steps to protect your personal information from loss, unauthorised access, modification,
          or disclosure (IPP 5). Our security measures include:
        </p>
        <ul className={ul}>
          <li className={li}>Strong authentication with enforced password policies</li>
          <li className={li}>All data encrypted in transit and at rest</li>
          <li className={li}>Data isolation — your data is only accessible to your account, never visible to other users</li>
          <li className={li}>File storage scoped to your account</li>
          <li className={li}>No credit card data stored — all payment processing handled by our payment provider (PCI DSS compliant)</li>
          <li className={li}>Regular security reviews and updates</li>
        </ul>

        <h2 className={h2}>6. Where your data is stored</h2>
        <p className={p}>
          Your data is stored on secure cloud infrastructure hosted in the Asia Pacific (Sydney) region.
          Payment data is processed by our payment provider in accordance with PCI DSS standards.
          Both our infrastructure and payment providers maintain appropriate safeguards for cross-border
          data transfers as required by IPP 12 of the Privacy Act 2020.
        </p>

        <h2 className={h2}>7. Sharing and disclosure</h2>
        <p className={p}>We do not sell, rent, or trade your personal information (IPP 11). We share data only with:</p>
        <ul className={ul}>
          <li className={li}>Our cloud infrastructure provider — for data storage, authentication, and processing</li>
          <li className={li}>Our payment provider — for subscription and payment processing</li>
          <li className={li}>Your clients — when you send invoices via email or share a client portal link (at your direction)</li>
        </ul>
        <p className={p}>
          We may disclose information if required by law, court order, or to comply with a request from the
          New Zealand Privacy Commissioner.
        </p>

        <h2 className={h2}>8. Your rights</h2>
        <p className={p}>Under the Privacy Act 2020, you have the right to:</p>
        <ul className={ul}>
          <li className={li}>Access the personal information we hold about you (IPP 6)</li>
          <li className={li}>Request correction of any inaccurate information (IPP 7)</li>
          <li className={li}>Know how your information is being used</li>
          <li className={li}>Request deletion of your account and associated data</li>
          <li className={li}>Complain to the Office of the Privacy Commissioner if you believe your privacy has been breached</li>
        </ul>
        <p className={p}>
          To exercise any of these rights, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-500 underline underline-offset-2">{CONTACT_EMAIL}</a>.
          We will respond within 20 working days as required by the Privacy Act.
        </p>

        <h2 className={h2}>9. Data retention</h2>
        <p className={p}>
          We retain your data for as long as your account is active. Financial records (invoices, expenses) are retained
          for a minimum of 7 years to comply with IRD record-keeping requirements under the Tax Administration Act 1994.
          If you delete your account, we will remove your personal information within 30 days, except where retention is
          required by law.
        </p>

        <h2 className={h2}>10. Privacy breaches</h2>
        <p className={p}>
          In the event of a privacy breach that poses a risk of serious harm, we will notify the Office of the Privacy
          Commissioner and affected individuals as soon as practicable, as required by Part 6 of the Privacy Act 2020.
        </p>

        <h2 className={h2}>11. Cookies and analytics</h2>
        <p className={p}>
          MyBiz uses essential cookies for authentication and session management. We do not use third-party tracking
          cookies or advertising cookies. We may use anonymised, aggregated analytics to improve our service.
        </p>

        <h2 className={h2}>12. Children</h2>
        <p className={p}>
          MyBiz is a business tool and is not intended for use by individuals under 16 years of age. We do not
          knowingly collect personal information from children.
        </p>

        <h2 className={h2}>13. Changes to this policy</h2>
        <p className={p}>
          We may update this privacy policy from time to time. Material changes will be communicated via email or an
          in-app notification. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision.
        </p>

        <h2 className={h2}>14. Contact us</h2>
        <p className={p}>
          If you have questions about this privacy policy or how we handle your personal information, contact us at:
        </p>
        <div className={`p-4 rounded-lg mb-8 ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>CloudPro Digital Limited</p>
          <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-500 underline underline-offset-2">{CONTACT_EMAIL}</a>
          </p>
        </div>
        <p className={p}>
          You may also contact the Office of the Privacy Commissioner at{' '}
          <a href="https://www.privacy.org.nz" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline underline-offset-2">
            privacy.org.nz
          </a>{' '}
          or call 0800 803 909.
        </p>
      </main>

      {/* Footer */}
      <footer className={`border-t py-8 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            © 2026 MyBiz — a CloudPro Digital product. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs">
            <Link href="/" className={`${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Home</Link>
            <Link href="/terms" className={`${dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
