import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import DanceMedia from "@/components/DanceMedia";
import BusinessVideo from "@/components/BusinessVideo";
import Software from "@/components/Software";
import Clients from "@/components/Clients";
import Team from "@/components/Team";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://streamstage.live/#organization",
      name: "StreamStage",
      url: "https://streamstage.live",
      email: "hello@streamstage.live",
      description:
        "Canada's dance industry partner — media production, software, and live broadcast.",
      areaServed: {
        "@type": "Country",
        name: "Canada",
      },
      knowsAbout: [
        "Dance competition livestreaming",
        "Dance videography",
        "Business video production",
        "Dance competition software",
        "Studio management software",
      ],
      sameAs: [
        "https://instagram.com/streamstage",
        "https://facebook.com/streamstage",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://streamstage.live/#website",
      url: "https://streamstage.live",
      name: "StreamStage",
      publisher: { "@id": "https://streamstage.live/#organization" },
    },
    {
      "@type": "WebPage",
      "@id": "https://streamstage.live/#webpage",
      url: "https://streamstage.live",
      name: "StreamStage — Where Dance Meets Technology",
      isPartOf: { "@id": "https://streamstage.live/#website" },
      about: { "@id": "https://streamstage.live/#organization" },
      description:
        "Canada's dance industry partner — media production, software, and live broadcast. Dance & stage media, business video, and dance software solutions.",
    },
    {
      "@type": "Service",
      name: "Dance & Stage Media",
      provider: { "@id": "https://streamstage.live/#organization" },
      description:
        "Multi-camera livestreaming, videography, and promotional content for dance competitions, recitals, and showcases.",
      serviceType: "Video Production",
      areaServed: { "@type": "Country", name: "Canada" },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Dance Media Services",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Livestreaming",
              description:
                "Multi-camera live broadcast for competitions, recitals, and showcases.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Videography & Editing",
              description:
                "Full-service video production from capture to final cut.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Promotional Videos",
              description:
                "Cinematic promotional content for studios, companies, and productions.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Social Content",
              description:
                "Short-form, platform-optimized content for Instagram, TikTok, and YouTube.",
            },
          },
        ],
      },
    },
    {
      "@type": "Service",
      name: "Business Video",
      provider: { "@id": "https://streamstage.live/#organization" },
      description:
        "Professional video production for businesses — hybrid events, social highlights, promotional content, and strategy.",
      serviceType: "Video Production",
      areaServed: { "@type": "Country", name: "Canada" },
    },
    {
      "@type": "SoftwareApplication",
      name: "CompSync",
      applicationCategory: "BusinessApplication",
      description:
        "Complete competition management — registration, scheduling, scoring, and livestream integration.",
      url: "https://compsync.net",
      offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
      provider: { "@id": "https://streamstage.live/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "StudioSage",
      applicationCategory: "BusinessApplication",
      description:
        "AI-powered studio assistant that answers parent questions, manages communication, and reduces admin work.",
      provider: { "@id": "https://streamstage.live/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "StudioSync",
      applicationCategory: "BusinessApplication",
      description:
        "Unified studio management platform — class scheduling, attendance, billing, and parent communication in one place.",
      provider: { "@id": "https://streamstage.live/#organization" },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <Navbar />
        <Hero />
        <About />
        <DanceMedia />
        <BusinessVideo />
        <Software />
        <Clients />
        <Team />
        <Contact />
        <Footer />
      </main>
    </>
  );
}
