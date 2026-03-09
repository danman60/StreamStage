"use client";

import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import { Marquee } from "./magicui/marquee";

const clients = [
  { name: "CBC Sports", logo: "/logos/cbc-sports.png" },
  { name: "The Musical Stage Co.", logo: "/logos/musical-stage-co.jpg" },
  { name: "SodaStream", logo: "/logos/sodastream.jpg" },
  { name: "CFL", logo: "/logos/cfl.jpg" },
  { name: "Centre Segal", logo: "/logos/centre-segal.jpg" },
  { name: "Nightwood Theatre", logo: "/logos/nightwood-theatre.jpg" },
  { name: "Theatre Woodstock", logo: "/logos/theatre-woodstock.jpg" },
  { name: "Randolph College", logo: "/logos/randolph-college.jpg" },
  { name: "Sheridan Alumni", logo: "/logos/sheridan-alumni.jpg" },
  { name: "St. Lawrence College", logo: "/logos/st-lawrence-college.jpg" },
  { name: "Bravo Academy", logo: "/logos/bravo-academy.jpg" },
  { name: "Harold Green Theatre", logo: "/logos/harold-green-theatre.jpg" },
  { name: "Cameco Capitol Arts Centre", logo: "/logos/cameco-capitol.jpg" },
  { name: "Tweed & Co Theatre", logo: "/logos/tweed-and-co.jpg" },
  { name: "Holt Fintech Accelerator", logo: "/logos/holt-fintech.jpg" },
  { name: "Jewish Federation of Ottawa", logo: "/logos/jewish-federation.jpg" },
  { name: "St. Albert Children's Theatre", logo: "/logos/st-albert.jpg" },
  { name: "Theatre Now", logo: "/logos/theatre-now.jpg" },
  { name: "Coeur d'Alene Summer Theatre", logo: "/logos/coeur-dalene-summer-theatre.jpg" },
  { name: "Canadian Dance Awards", logo: "/logos/canadian-dance-awards.png" },
  { name: "Ultimate Dance Connection", logo: "/logos/ultimate-dance-connection.png" },
  { name: "Impact Dance Complex", logo: "/logos/impact-dance-complex.png" },
  { name: "Footprints Dance Centre", logo: "/logos/footprints-dance-centre.png" },
  { name: "All That's Dance", logo: "/logos/all-thats-dance.png" },
  { name: "The Dance Class", logo: "/logos/the-dance-class.png" },
  { name: "Artistic Movement", logo: "/logos/artistic-movement.png" },
  { name: "Stagecoach", logo: "/logos/stagecoach.png" },
  { name: "SoundCrowd", logo: "/logos/soundcrowd.png" },
  { name: "Uvalux", logo: "/logos/uvalux.png" },
  { name: "Surmesur", logo: "/logos/surmesur.png" },
  { name: "Raw Rock Shop", logo: "/logos/raw-rock-shop.png" },
  { name: "K2K", logo: "/logos/k2k.png" },
  { name: "Here For Now Theatre", logo: "/logos/here-for-now-theatre.png" },
  { name: "The Disability Collective", logo: "/logos/the-disability-collective.png" },
  { name: "Bump Baby & Toddler Expo", logo: "/logos/bump-baby-toddler-expo.png" },
  { name: "Little Hobby Hill Farm", logo: "/logos/little-hobby-hill-farm.png" },
  { name: "Alt Vox", logo: "/logos/alt-vox.png" },
  { name: "Yare", logo: "/logos/yare.png" },
  { name: "Elite Dance", logo: "/logos/elite-dance.png" },
  { name: "Stagecoach Canada", logo: "/logos/stagecoach-canada.png" },
  { name: "Toronto Dance Teacher Expo", logo: "/logos/toronto-dance-teacher-expo.png" },
  { name: "Wavestage Theatre Co.", logo: "/logos/wavestage-theatre-co.webp" },
  { name: "Wellington Winds Symphony", logo: "/logos/wellington-winds-symphony.png" },
  { name: "Woodstock Chamber of Commerce", logo: "/logos/woodstock-chamber-of-commerce.webp" },
];

// Split into two rows for visual variety
const row1 = clients.slice(0, Math.ceil(clients.length / 2));
const row2 = clients.slice(Math.ceil(clients.length / 2));

function ClientLogo({ client }: { client: (typeof clients)[0] }) {
  return (
    <div className="flex items-center justify-center px-5 py-3 rounded-xl bg-white/90 min-w-[140px] h-16 hover:bg-white transition-colors duration-300">
      <Image
        src={client.logo}
        alt={client.name}
        width={120}
        height={48}
        className="max-h-10 w-auto object-contain"
      />
    </div>
  );
}

export default function Clients() {
  return (
    <section id="clients" className="py-16 sm:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-gray-500 text-sm font-semibold tracking-widest uppercase">
              Trusted By
            </h2>
          </div>
        </ScrollReveal>

        <div className="relative space-y-4">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-charcoal-deep to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-charcoal-deep to-transparent" />

          <Marquee pauseOnHover duration="40s">
            {row1.map((client) => (
              <ClientLogo key={client.name} client={client} />
            ))}
          </Marquee>

          <Marquee pauseOnHover duration="45s" reverse>
            {row2.map((client) => (
              <ClientLogo key={client.name} client={client} />
            ))}
          </Marquee>
        </div>
      </div>

      <div className="section-divider mt-16 sm:mt-20 max-w-4xl mx-auto" />
    </section>
  );
}
