import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import DanceMedia from "@/components/DanceMedia";
import BusinessVideo from "@/components/BusinessVideo";
import Software from "@/components/Software";
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
      email: "hello@streamstage.live",
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
        "https://instagram.com/streamstage",
        "https://facebook.com/streamstage",
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
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is StreamStage?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "StreamStage is Canada's dance industry partner, providing media production (livestreaming, videography, promotional content), dance-specific software (CompSync, StudioSage, StudioSync), and live broadcast services. With over 100 events streamed and 500+ videos produced for 50+ studios across Canada, StreamStage combines creative expertise with purpose-built technology for the performing arts.",
          },
        },
        {
          "@type": "Question",
          name: "How does dance competition livestreaming work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "StreamStage provides professional multi-camera livestreaming for dance competitions, recitals, and showcases. The service includes multi-angle camera setups, professional audio capture, real-time switching, and live broadcast to audiences worldwide. Families and fans can watch performances in real-time from any device, anywhere. StreamStage has broadcast over 100 events across Canada with professional-grade quality.",
          },
        },
        {
          "@type": "Question",
          name: "What is CompSync?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CompSync is an all-in-one dance competition management platform built by StreamStage. It handles registration, scheduling, scoring, live results, and livestream integration — all in a single system designed specifically for dance competitions. CompSync is free to use and available at compsync.net.",
          },
        },
        {
          "@type": "Question",
          name: "Does StreamStage offer business video production?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Beyond the dance industry, StreamStage provides full-stack video production for businesses, including hybrid event production (live + virtual), social media content for Instagram, TikTok, and YouTube, promotional and brand videos, and end-to-end video strategy from concept through delivery.",
          },
        },
        {
          "@type": "Question",
          name: "What dance software does StreamStage build?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "StreamStage builds three dance-specific software products: CompSync for competition management (registration, scheduling, scoring, livestream integration), StudioSage for AI-powered studio insights and analytics, and StudioSync for studio management and parent-teacher-student communication. All are purpose-built for the dance industry.",
          },
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
      name: "StudioSync",
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
        <BusinessVideo />
        <Software />
        <Clients />
        <Team />
        <FAQ />
        <Contact />
        <Footer />
      </main>
    </>
  );
}
