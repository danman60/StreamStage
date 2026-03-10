import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import DanceMedia from "@/components/DanceMedia";
import BusinessVideo from "@/components/BusinessVideo";
import Software from "@/components/Software";
import Testimonials from "@/components/Testimonials";
import Clients from "@/components/Clients";
import Team from "@/components/Team";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "LocalBusiness"],
      "@id": "https://streamstage.live/#organization",
      name: "StreamStage",
      url: "https://streamstage.live",
      email: "daniel@streamstage.live",
      logo: "https://streamstage.live/logo-color.png",
      foundingDate: "2015",
      description:
        "Canada's dance industry partner — media production, software, and live broadcast. Over 100 events streamed and 500 videos produced for 50+ studios across Canada.",
      areaServed: {
        "@type": "Country",
        name: "Canada",
      },
      address: {
        "@type": "PostalAddress",
        addressCountry: "CA",
        addressRegion: "ON",
      },
      knowsAbout: [
        "Dance competition livestreaming",
        "Dance videography",
        "Business video production",
        "Dance competition software",
        "Studio management software",
        "Dance recital video production",
        "Multi-camera live broadcast",
      ],
      sameAs: [
        "https://www.instagram.com/streamstage.live/",
        "https://www.facebook.com/streamstagedotlive",
      ],
      numberOfEmployees: {
        "@type": "QuantitativeValue",
        minValue: 2,
        maxValue: 10,
      },
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
      datePublished: "2024-01-01",
      dateModified: new Date().toISOString().split("T")[0],
      description:
        "Canada's dance industry partner — media production, software, and live broadcast. Dance & stage media, business video, and dance software solutions.",
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", "#about h2", "#about p"],
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://streamstage.live",
        },
      ],
    },
    {
      "@type": "Service",
      name: "Dance & Stage Media",
      provider: { "@id": "https://streamstage.live/#organization" },
      description:
        "Multi-camera livestreaming, videography, and promotional content for dance competitions, recitals, and showcases across Canada. Over 100 events broadcast and 500+ videos produced.",
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
      operatingSystem: "Web",
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
      operatingSystem: "Web",
      description:
        "AI-powered studio assistant that answers parent questions, manages communication, and reduces admin work.",
      provider: { "@id": "https://streamstage.live/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "StudioBeat",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
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
        <Software />
        <BusinessVideo />
        <Testimonials />
        <Clients />
        <Team />
        <FAQ />
        <Contact />
        <Footer />
      </main>
    </>
  );
}
