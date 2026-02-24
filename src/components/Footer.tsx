import Image from "next/image";
import { Instagram, Facebook, Mail } from "lucide-react";

const socialLinks = [
  {
    icon: Instagram,
    href: "https://instagram.com/streamstage",
    label: "Instagram",
  },
  {
    icon: Facebook,
    href: "https://facebook.com/streamstage",
    label: "Facebook",
  },
  { icon: Mail, href: "mailto:hello@streamstage.live", label: "Email" },
];

const footerNav = [
  { label: "Dance & Stage", href: "#dance-media" },
  { label: "Business", href: "#business-video" },
  { label: "Software", href: "#software" },
  { label: "Team", href: "#team" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center gap-8">
          {/* Top row: logo + nav */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-6">
            {/* Logo */}
            <a href="/" className="block">
              <Image
                src="/logo-white.png"
                alt="StreamStage.live"
                width={140}
                height={40}
                className="h-7 w-auto"
              />
            </a>

            {/* Footer nav */}
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {footerNav.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Social */}
            <div className="flex items-center gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="cursor-pointer p-2 text-gray-500 hover:text-cyan-brand transition-colors duration-200"
                >
                  <link.icon size={20} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom row: location + copyright */}
          <div className="text-center space-y-1">
            <p className="text-gray-600 text-sm">
              Ontario, Canada &middot;{" "}
              <a
                href="mailto:hello@streamstage.live"
                className="hover:text-gray-400 transition-colors duration-200"
              >
                hello@streamstage.live
              </a>
            </p>
            <p className="text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} StreamStage. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
