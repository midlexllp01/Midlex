"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function MarketingFooter() {
  return (
    <footer className="bg-primary text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 border-b border-white/10 pb-16">
          <div className="col-span-2">
            <span className="text-3xl font-bold tracking-tight mb-6 block">
              MIDLEX <span className="text-secondary">LLP</span>
            </span>
            <p className="text-white/60 max-w-sm leading-relaxed mb-8">
              Prudence in law, excellence in service. Providing premium legal excellence and strategic advisory across Nigeria.
            </p>
            <div className="flex gap-4">
              {[
                {
                  name: "Instagram",
                  href: "https://www.instagram.com/midlexllp/",
                  icon:
                    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z",
                },
                {
                  name: "Facebook",
                  href: "https://www.facebook.com/people/Midlex-LLP/100094930886471/",
                  icon:
                    "M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z",
                },
                {
                  name: "LinkedIn",
                  href: "https://ng.linkedin.com/company/leges-prudentia-ilc",
                  icon:
                    "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z",
                },
              ].map((social, i) => (
                <motion.a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ y: -5, backgroundColor: "#c5a059" }}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-all"
                  aria-label={social.name}
                  title={social.name}
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
              <li>
                <Link href="/about" className="hover:text-secondary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/practice-areas" className="hover:text-secondary transition-colors">
                  Practice Areas
                </Link>
              </li>
              <li>
                <Link href="/team" className="hover:text-secondary transition-colors">
                  Our Team
                </Link>
              </li>
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
              <li>
                <Link href="/contact" className="hover:text-secondary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-secondary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-secondary transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">Headquarters</h4>
            <p className="text-white/60 leading-relaxed mb-6">
              Owa Street, Off Wire Road,
              <br />
              Benin City, Edo State,
              <br />
              Nigeria.
            </p>
            <h4 className="font-bold mb-3">Port Harcourt Branch</h4>
            <p className="text-white/60 leading-relaxed">
              Midlex Law Chambers,
              <br />
              Port Harcourt, Rivers State,
              <br />
              Nigeria.
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-white/40">
          <p>© {new Date().getFullYear()} Midlex LLP. All rights reserved.</p>
          <p>Designed by Emrald Code Studio</p>
        </div>
      </div>
    </footer>
  );
}

