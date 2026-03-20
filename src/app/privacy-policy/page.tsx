import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — StreamStage",
  description: "StreamStage privacy policy. How we collect, use, and protect your information.",
  alternates: { canonical: "/privacy-policy" },
  robots: { index: false },
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-brand transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          Back to StreamStage
        </Link>

        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-invert prose-gray max-w-none space-y-6 text-gray-300 leading-relaxed">
          <p className="text-sm text-gray-500">
            Last updated: March 20, 2026
          </p>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            Who We Are
          </h2>
          <p>
            Stream Stage Productions Inc. (&ldquo;StreamStage&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
            operates the website streamstage.live and provides media production, livestreaming,
            and software services for the dance and events industry in Canada.
          </p>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            Information We Collect
          </h2>
          <p>We collect information you voluntarily provide through our website:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Contact forms and proposal builders:</strong> Name, email, phone number,
              studio/organization name, event details, and any notes you provide.
            </li>
            <li>
              <strong>Email communications:</strong> When you email us directly.
            </li>
          </ul>
          <p>
            We may also collect anonymized usage data through analytics tools to understand
            how visitors use our website and improve our services.
          </p>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To respond to your inquiries and proposal submissions</li>
            <li>To provide quotes and coordinate services</li>
            <li>To improve our website and services</li>
            <li>To send follow-up communications related to your inquiry</li>
          </ul>
          <p>
            We do not sell, trade, or rent your personal information to third parties.
          </p>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            Data Storage and Security
          </h2>
          <p>
            Form submissions are sent to us via encrypted email. We use industry-standard
            security measures to protect your information. However, no method of transmission
            over the Internet is 100% secure.
          </p>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            Cookies
          </h2>
          <p>
            Our website may use essential cookies for site functionality and analytics cookies
            to understand usage patterns. You can control cookies through your browser settings.
          </p>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            Third-Party Services
          </h2>
          <p>
            We may use third-party services such as Google Analytics, Vercel (hosting), and
            Cloudflare (content delivery) that may collect anonymized data in accordance with
            their own privacy policies.
          </p>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Request access to the personal information we hold about you</li>
            <li>Request correction or deletion of your personal information</li>
            <li>Withdraw consent for communications at any time</li>
          </ul>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            Contact Us
          </h2>
          <p>
            If you have questions about this privacy policy or your personal information,
            contact us at{" "}
            <a
              href="mailto:daniel@streamstage.live"
              className="text-cyan-brand hover:underline"
            >
              daniel@streamstage.live
            </a>.
          </p>

          <h2 className="font-heading text-xl font-semibold text-white mt-10">
            Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. Changes will be posted
            on this page with an updated date.
          </p>
        </div>
      </div>
      <div className="mt-16">
        <Footer />
      </div>
    </main>
  );
}
