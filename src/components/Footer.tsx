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
            <a href="/" className="font-heading text-lg font-bold tracking-tight">
              <span className="text-cyan-brand">Stream</span>
              <span className="text-white">Stage</span>
              <span className="text-cyan-brand text-xs font-normal">.live</span>
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

          {/* Bottom row: copyright */}
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} StreamStage. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
