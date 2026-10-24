"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Link from "next/link";
import Testimonials from "@/components/Testimonials/Testimonials";
import Gallery from "@/components/Gallery";
import { Reveal } from "@/components/Reveal";
import { motion } from "framer-motion";
import { Smartphone, Download } from "lucide-react";
import dynamic from "next/dynamic";

const Contact = dynamic(() => import("@/components/Contact/Contact"), { ssr: false });

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Services />
      <Gallery />
      
      {/* About Section */}
      <section id="about" className="py-24 bg-[#fafafa] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal direction="left">
              <div className="relative">
                <div className="aspect-[4/5] bg-primary rounded-[40px] overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-secondary/30" />
                  <img 
                    src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070&auto=format&fit=crop" 
                    alt="Midlex LLP Office"
                    className="w-full h-full object-cover mix-blend-overlay"
                  />
                </div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="absolute -bottom-10 -right-10 bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hidden md:block"
                >
                  <p className="text-4xl font-bold text-primary mb-1">20+</p>
                  <p className="text-gray-500 font-medium">Expert Lawyers</p>
                </motion.div>
              </div>
            </Reveal>
            
            <Reveal direction="right">
              <div>
                <h2 className="text-4xl font-bold text-primary mb-8 leading-tight">
                  About Midlex LLP <br />
                  <span className="text-secondary">(Prudence in Law)</span>
                </h2>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Headquartered in the heart of Benin City, Midlex LLP is a distinguished law firm 
                  dedicated to providing sophisticated legal solutions for complex challenges.
                </p>
                <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                  Our philosophy, "Leges Prudentia" (Prudence in Law), reflects our commitment to 
                  wisdom, foresight, and meticulous attention to detail in every case we handle.
                </p>
                
                <div className="space-y-6">
                  {[
                    "Integrity & Transparency",
                    "Client-Centric Advocacy",
                    "Results-Oriented Approach",
                    "Innovative Legal Solutions"
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + 0.5 }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-white">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-lg font-semibold text-primary">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Meet the Lawyers */}
      <section id="lawyers" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-4xl font-bold text-primary mb-16">Meet Our Partners</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "UZOMA MESHACK OKONTI, ESQ", role: "Head of Chambers", img: "/uzoma-meshack-okonti.jpg" },
              { name: "ENYAWUILE C. ABEDNEGO, ESQ", role: "Principal Partner", img: "/enyawuile-c-abednego.jpg" },
              { name: "SHEDRACK U. ENYAWUILE, ESQ", role: "Managing Partner", img: "/shedrack-u-enyawuile.jpg" },
              { name: "HANNAH C. GOODMAN, ESQ", role: "Head of Midlex Port Harcourt Nigeria", img: "/hannah-c-goodman.png" }
            ].map((lawyer, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div 
                  whileHover={{ y: -10 }}
                  className="group"
                >
                  <div className="aspect-[3/4] bg-gray-100 rounded-[32px] overflow-hidden mb-6 relative">
                    <img src={lawyer.img} alt={lawyer.name} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-all duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-primary leading-snug">{lawyer.name}</h3>
                  <p className="text-secondary font-medium uppercase text-xs tracking-wider mt-1">{lawyer.role}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />

      {/* Mobile App Showcase Section */}
      <section id="mobile-app" className="py-20 bg-gradient-to-b from-[#fafafa] to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#1B4D2E] via-[#143a22] to-[#0d2616] rounded-[40px] p-8 sm:p-12 lg:p-16 text-white relative overflow-hidden shadow-2xl border border-secondary/20">
            {/* Ambient Background glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="grid lg:grid-cols-12 gap-10 items-center relative z-10">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-secondary text-sm font-semibold border border-white/10">
                  <Smartphone size={18} />
                  <span>Official Mobile Web App (iOS & Android)</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  Access Midlex LLP <br />
                  <span className="text-secondary italic font-serif">Anytime, Anywhere</span>
                </h2>

                <p className="text-white/80 text-base sm:text-lg max-w-xl leading-relaxed">
                  Track your cases in real-time, consult with senior legal counsel, manage invoices and court dates, and receive instant hearing alerts directly from <span className="text-secondary font-semibold">mobile.midlex.xyz</span> on your iPhone or Android device.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="https://mobile.midlex.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-secondary hover:bg-[#b89047] text-primary font-bold px-8 py-4 rounded-2xl shadow-xl shadow-secondary/20 transition-all transform hover:scale-105"
                  >
                    <Smartphone size={22} />
                    <span>Open Mobile App (mobile.midlex.xyz)</span>
                  </a>

                  <div className="text-white/70 text-sm flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Works on iPhone (iOS) & Android • Instant Web App</span>
                  </div>
                </div>

                {/* Instructions on How to Add to Home Screen - Right next to the App Button */}
                <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-secondary/30 shadow-inner">
                  <div className="flex items-center gap-2 text-secondary font-bold text-sm sm:text-base uppercase tracking-wider mb-3">
                    <Smartphone size={18} />
                    <span>How to Add Mobile App to Your Phone Home Screen</span>
                  </div>
                  <p className="text-xs sm:text-sm text-white/80 mb-4">
                    Install <a href="https://mobile.midlex.xyz" target="_blank" rel="noopener noreferrer" className="text-secondary underline font-semibold">mobile.midlex.xyz</a> directly onto your home screen for one-tap full-screen access—no app store download required:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="bg-black/25 rounded-xl p-4 border border-white/10">
                      <p className="font-bold text-secondary mb-2 flex items-center gap-1.5">
                        <span>🍎 iPhone / iPad (Safari)</span>
                      </p>
                      <ol className="space-y-1.5 text-white/85 list-decimal list-inside">
                        <li>Open <a href="https://mobile.midlex.xyz" target="_blank" rel="noopener noreferrer" className="text-secondary underline font-medium">mobile.midlex.xyz</a> in <strong>Safari</strong>.</li>
                        <li>Tap the <strong>Share</strong> icon <span className="inline-block px-1.5 py-0.5 bg-white/10 rounded text-[11px]">⬆️</span> at the bottom of the screen.</li>
                        <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
                        <li>Tap <strong>Add</strong> in the top-right corner.</li>
                      </ol>
                    </div>
                    <div className="bg-black/25 rounded-xl p-4 border border-white/10">
                      <p className="font-bold text-secondary mb-2 flex items-center gap-1.5">
                        <span>🤖 Android (Chrome)</span>
                      </p>
                      <ol className="space-y-1.5 text-white/85 list-decimal list-inside">
                        <li>Open <a href="https://mobile.midlex.xyz" target="_blank" rel="noopener noreferrer" className="text-secondary underline font-medium">mobile.midlex.xyz</a> in <strong>Chrome</strong>.</li>
                        <li>Tap the <strong>three-dot menu (⋮)</strong> in the top-right corner.</li>
                        <li>Select <strong>&ldquo;Add to Home screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong>.</li>
                        <li>Tap <strong>Install / Add</strong> to place the Midlex icon on your screen.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs sm:text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="text-secondary font-bold">✓</span> Real-Time Case Updates
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-secondary font-bold">✓</span> Direct Lawyer Messaging
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-secondary font-bold">✓</span> Fast & Secure Access
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-xs bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center">
                    <img src="/logo.jpg" alt="Midlex LLP" className="w-full h-full object-contain rounded-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Midlex Mobile</h3>
                  <p className="text-xs text-secondary font-semibold uppercase tracking-wider mb-4">Official Legal Client App</p>
                  <div className="bg-white/10 rounded-xl p-3 mb-4 text-xs text-white/80 text-left space-y-1.5 font-mono">
                    <p className="flex justify-between"><span>Web URL:</span> <span className="text-secondary">mobile.midlex.xyz</span></p>
                    <p className="flex justify-between"><span>Platform:</span> <span className="text-secondary">iOS & Android PWA</span></p>
                    <p className="flex justify-between"><span>Install:</span> <span className="text-secondary">Add to Home Screen</span></p>
                  </div>
                  <a
                    href="https://mobile.midlex.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-secondary text-primary font-bold rounded-xl text-sm hover:bg-opacity-90 transition-all shadow-md mb-2.5"
                  >
                    Launch Mobile App ↗
                  </a>
                  <a
                    href="https://drive.google.com/file/d/1WPu4QDjyHalkAYdAPHH2CV1zIe4WJbkq/view?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 bg-white/10 text-white/80 font-medium rounded-xl text-xs hover:bg-white/20 transition-all"
                  >
                    Or Download Android APK
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Contact />

      {/* Footer */}
      <footer className="bg-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 border-b border-white/10 pb-16">
            <div className="col-span-2">
              <span className="text-3xl font-bold tracking-tight mb-6 block">
                MIDLEX <span className="text-secondary">LLP</span>
              </span>
              <p className="text-white/60 max-w-sm leading-relaxed mb-8">
                Prudence in law, excellence in service. Providing premium legal excellence and 
                strategic advisory across Nigeria.
              </p>
              <div className="flex gap-4">
                {[
                  { name: "Instagram", href: "https://www.instagram.com/midlexllp/", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" },
                  { name: "Facebook", href: "https://www.facebook.com/people/Midlex-LLP/100094930886471/", icon: "M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" },
                  { name: "LinkedIn", href: "https://ng.linkedin.com/company/leges-prudentia-ilc", icon: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" }
                ].map((social, i) => (
                  <motion.a 
                    key={i} 
                    href={social.href} 
                    target="_blank" 
                    rel="noreferrer" 
                    whileHover={{ y: -5, backgroundColor: "#c5a059" }}
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-all"
                  >
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d={social.icon} />
                    </svg>
                  </motion.a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-white/60">
                <li><Link href="#about" className="hover:text-secondary transition-colors">About Us</Link></li>
                <li><Link href="#services" className="hover:text-secondary transition-colors">Services</Link></li>
                <li><Link href="#lawyers" className="hover:text-secondary transition-colors">Our Team</Link></li>
                <li>
                  <a 
                    href="https://mobile.midlex.xyz" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-secondary font-semibold hover:underline flex items-center gap-1.5"
                  >
                    <span>📱 Mobile App (mobile.midlex.xyz)</span>
                  </a>
                </li>
                <li><Link href="#contact" className="hover:text-secondary transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">Headquarters</h4>
              <p className="text-white/60 leading-relaxed mb-6">
                Owa Street, Off Wire Road,<br />
                Benin City, Edo State,<br />
                Nigeria.
              </p>
              <h4 className="font-bold mb-3">Port Harcourt Branch</h4>
              <p className="text-white/60 leading-relaxed">
                Midlex Law Chambers,<br />
                Port Harcourt, Rivers State,<br />
                Nigeria.
              </p>
            </div>
          </div>
          <div className="pt-8 flex justify-between items-center text-sm text-white/40">
            <p>© 2026 Midlex LLP. All rights reserved.</p>
            <p>Designed by Emrald Code Studio</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
