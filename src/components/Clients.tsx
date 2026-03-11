"use client";

import ScrollReveal from "./ScrollReveal";
import { Marquee } from "./magicui/marquee";

const clients = [
  { name: "CBC Sports", logo: "/logos-white/cbc-sports.png" },
  { name: "The Musical Stage Co.", logo: "/logos-white/musical-stage-co.png" },
  { name: "SodaStream", logo: "/logos-white/sodastream.png" },
  { name: "CFL", logo: "/logos-white/cfl.png" },
  { name: "Centre Segal", logo: "/logos-white/centre-segal.png" },
  { name: "Nightwood Theatre", logo: "/logos-white/nightwood-theatre.png" },
  { name: "Theatre Woodstock", logo: "/logos-white/theatre-woodstock.png" },
  { name: "Randolph College", logo: "/logos-white/randolph-college.png" },
  { name: "Sheridan Alumni", logo: "/logos-white/sheridan-alumni.png" },
  { name: "St. Lawrence College", logo: "/logos-white/st-lawrence-college.png" },
  { name: "Bravo Academy", logo: "/logos-white/bravo-academy.png" },
  { name: "Harold Green Theatre", logo: "/logos-white/harold-green-theatre.png" },
  { name: "Cameco Capitol Arts Centre", logo: "/logos-white/cameco-capitol.png" },
  { name: "Tweed & Co Theatre", logo: "/logos-white/tweed-and-co.png" },
  { name: "Holt Fintech Accelerator", logo: "/logos-white/holt-fintech.png" },
  { name: "Jewish Federation of Ottawa", logo: "/logos-white/jewish-federation.png" },
  { name: "St. Albert Children's Theatre", logo: "/logos-white/st-albert.png" },
  { name: "Theatre Now", logo: "/logos-white/theatre-now.png" },
  { name: "Coeur d'Alene Summer Theatre", logo: "/logos-white/coeur-dalene-summer-theatre.png" },
  { name: "Canadian Dance Awards", logo: "/logos-white/canadian-dance-awards.png" },
  { name: "Ultimate Dance Connection", logo: "/logos-white/ultimate-dance-connection.png" },
  { name: "Impact Dance Complex", logo: "/logos-white/impact-dance-complex.png" },
  { name: "Footprints Dance Centre", logo: "/logos-white/footprints-dance-centre.png" },
  { name: "All That's Dance", logo: "/logos-white/all-thats-dance.png" },
  { name: "The Dance Class", logo: "/logos-white/the-dance-class.png" },
  { name: "Artistic Movement", logo: "/logos-white/artistic-movement.png" },
  { name: "Stagecoach", logo: "/logos-white/stagecoach.png" },
  { name: "SoundCrowd", logo: "/logos-white/soundcrowd.png" },
  { name: "Uvalux", logo: "/logos-white/uvalux.png" },
  { name: "Surmesur", logo: "/logos-white/surmesur.png" },
  { name: "Raw Rock Shop", logo: "/logos-white/raw-rock-shop.png" },
  { name: "K2K", logo: "/logos-white/k2k.png" },
  { name: "Here For Now Theatre", logo: "/logos-white/here-for-now-theatre.png" },
  { name: "The Disability Collective", logo: "/logos-white/the-disability-collective.png" },
  { name: "Bump Baby & Toddler Expo", logo: "/logos-white/bump-baby-toddler-expo.png" },
  { name: "Little Hobby Hill Farm", logo: "/logos-white/little-hobby-hill-farm.png" },
  { name: "Alt Vox", logo: "/logos-white/alt-vox.png" },
  { name: "Yare", logo: "/logos-white/yare.png" },
  { name: "Elite Dance", logo: "/logos-white/elite-dance.png" },
  { name: "Stagecoach Canada", logo: "/logos-white/stagecoach-canada.png" },
  { name: "Toronto Dance Teacher Expo", logo: "/logos-white/toronto-dance-teacher-expo.png" },
  { name: "Wavestage Theatre Co.", logo: "/logos-white/wavestage-theatre-co.png" },
  { name: "Wellington Winds Symphony", logo: "/logos-white/wellington-winds-symphony.png" },
  { name: "Woodstock Chamber of Commerce", logo: "/logos-white/woodstock-chamber-of-commerce.png" },
  { name: "Embro Truck & Tractor Pull", logo: "/logos-white/embro-tractor-pull.png" },
  { name: "Norwich T'N'T Pull", logo: "/logos-white/norwich-tnt-pull.png" },
  { name: "United Way Oxford", logo: "/logos-white/united-way-oxford.png" },
];

// Split into two rows for visual variety
const row1 = clients.slice(0, Math.ceil(clients.length / 2));
const row2 = clients.slice(Math.ceil(clients.length / 2));

function ClientLogo({ client }: { client: (typeof clients)[0] }) {
  return (
    <div className="flex items-center justify-center px-6 py-4 rounded-xl bg-charcoal-dark/30 border border-white/5 hover:border-white/10 transition-colors duration-300 min-w-[160px] h-20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={client.logo}
        alt={client.name}
        width={130}
        height={48}
        className="max-h-12 max-w-[130px] object-contain"
        loading="lazy"
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

          <Marquee pauseOnHover duration="40s" repeat={2}>
            {row1.map((client) => (
              <ClientLogo key={client.name} client={client} />
            ))}
          </Marquee>

          <Marquee pauseOnHover duration="45s" reverse repeat={2}>
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
