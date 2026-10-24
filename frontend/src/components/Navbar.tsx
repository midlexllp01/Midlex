"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`sticky top-0 w-full z-50 transition-all duration-500 ${
      isScrolled ? "bg-white/90 backdrop-blur-xl border-b border-gray-100 py-2 shadow-sm" : "bg-transparent py-4"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 sm:h-20 items-center">
          <Link href="/" className="flex items-center gap-3">
            <motion.img 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              src="/logo.jpg" 
              alt="Midlex LLP" 
              className="h-14 sm:h-16 md:h-20 lg:h-24 w-auto object-contain" 
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-900">
            {[
              { label: "About", href: "/about" },
              { label: "Practice Areas", href: "/practice-areas" },
              { label: "Team", href: "/team" },
              { label: "Insights", href: "/insights" },
              { label: "Contact", href: "/contact" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link 
                  href={item.href} 
                  className="text-slate-900 hover:text-secondary transition-colors relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-secondary transition-all group-hover:w-full" />
                </Link>
              </motion.div>
            ))}
            <div className="flex items-center gap-3 ml-4">
              <a
                href="https://mobile.midlex.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-secondary bg-primary/5 hover:bg-primary/10 border border-secondary/30 px-3.5 py-2 rounded-full transition-all"
              >
                <Smartphone size={14} />
                <span>Mobile App</span>
              </a>
              <Link href="/login" className="text-primary hover:text-secondary transition-colors font-bold">Login</Link>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/signup" className="bg-primary text-white px-7 py-3 rounded-full hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 block font-bold">
                  Get Started
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Mobile Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-primary p-2">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

          {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-8 space-y-4 text-center font-bold text-lg">
              {[
                { label: "About", href: "/about" },
                { label: "Practice Areas", href: "/practice-areas" },
                { label: "Team", href: "/team" },
                { label: "Insights", href: "/insights" },
                { label: "Contact", href: "/contact" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link 
                    href={item.href} 
                    onClick={() => setIsOpen(false)} 
                    className="block py-3 text-slate-900 hover:text-secondary transition-colors"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <hr className="border-gray-100" />
              <div className="flex flex-col gap-3">
                <a
                  href="https://mobile.midlex.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="bg-secondary text-primary py-3.5 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md text-base"
                >
                  <Smartphone size={18} />
                  <span>Open Mobile App (mobile.midlex.xyz)</span>
                </a>
                <Link href="/login" onClick={() => setIsOpen(false)} className="py-2 text-primary">Login</Link>
                <Link href="/signup" onClick={() => setIsOpen(false)} className="bg-primary text-white py-4 rounded-2xl shadow-lg">
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
