"use client";

import { useState, FormEvent } from "react";
import ScrollReveal from "./ScrollReveal";
import { Send, ArrowRight } from "lucide-react";
import { NeonGradientCard } from "./magicui/neon-gradient-card";

const projectTypes = [
  "Livestreaming",
  "Videography",
  "Promotional Video",
  "Social Content",
  "Hybrid Event",
  "Software Inquiry",
  "Other",
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    projectType: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-16 sm:py-20 relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-brand/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Let&apos;s Build Something Together
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Whether it&apos;s a livestream, a promo video, or a software
              solution — we&apos;d love to hear about your project.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          {submitted ? (
            <div className="text-center p-12 rounded-2xl bg-charcoal-dark border border-cyan-brand/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-brand/10 flex items-center justify-center">
                <Send className="text-cyan-brand" size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-xl font-bold text-white mb-2">
                Message Sent
              </h3>
              <p className="text-gray-400">
                We&apos;ll be in touch within 24 hours.
              </p>
            </div>
          ) : (
            <NeonGradientCard
              borderSize={1}
              borderRadius={16}
              neonColors={{
                firstColor: "#4EC5D4",
                secondColor: "#F59E0B",
              }}
            >
              <form
                onSubmit={handleSubmit}
                className="p-2 sm:p-4"
              >
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-charcoal-mid border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/50 transition-colors duration-200 outline-none"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-charcoal-mid border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/50 transition-colors duration-200 outline-none"
                      placeholder="you@email.com"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="projectType"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Project Type
                  </label>
                  <select
                    id="projectType"
                    value={formData.projectType}
                    onChange={(e) =>
                      setFormData({ ...formData, projectType: e.target.value })
                    }
                    className={`cursor-pointer w-full px-4 py-3 bg-charcoal-mid border border-white/10 rounded-lg text-sm focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/50 transition-colors duration-200 outline-none appearance-none ${
                      formData.projectType ? "text-white" : "text-gray-500"
                    }`}
                  >
                    <option value="" className="text-gray-600">
                      Select a project type
                    </option>
                    {projectTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-8">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-charcoal-mid border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/50 transition-colors duration-200 outline-none resize-none"
                    placeholder="Tell us about your project..."
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm mb-4">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="cursor-pointer w-full sm:w-auto px-8 py-3.5 bg-cyan-brand text-charcoal-deep font-heading font-semibold text-base rounded-lg hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending..." : "Send Message"}
                  {!sending && <ArrowRight size={18} strokeWidth={2} />}
                </button>
              </form>
            </NeonGradientCard>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
