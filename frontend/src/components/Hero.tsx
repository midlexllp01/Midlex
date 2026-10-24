"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight, ShieldCheck, Scale, Briefcase, Smartphone, ExternalLink, PlusSquare } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-[#fafafa]">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 opacity-5">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6"
            >
              <ShieldCheck size={18} />
              <span>Prudence in Law, Excellence in Service</span>
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="text-5xl lg:text-7xl font-bold text-primary leading-tight mb-6"
            >
              Midlex <br />
              <span className="text-secondary italic font-serif">LLP</span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-xl text-gray-600 mb-8 max-w-lg leading-relaxed"
            >
              Midlex LLP provides premium legal representation, property acquisition, 
              and corporate advisory services tailored for excellence in Benin City and beyond.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: "#143a22" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-primary text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 transition-all"
                >
                  Get Legal Help <ArrowRight size={20} />
                </motion.button>
              </Link>
              <a
                href="https://mobile.midlex.xyz"
                target="_blank"
                rel="noopener noreferrer"
              >
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: "#b89047" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-secondary text-primary font-bold px-7 sm:px-8 py-4 sm:py-5 rounded-2xl flex items-center gap-2 shadow-xl shadow-secondary/20 transition-all border border-secondary"
                >
                  <Smartphone size={20} />
                  <span>Open Mobile App</span>
                  <ExternalLink size={16} />
                </motion.button>
              </a>
              <Link href="#services">
                <motion.button
                  whileHover={{ scale: 1.05, borderColor: "rgba(27, 77, 46, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-primary border-2 border-primary/10 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  Our Services
                </motion.button>
              </Link>
            </motion.div>

            {/* Quick Add-to-Home-Screen Instructions right next to the App button */}
            <motion.div
              variants={itemVariants}
              className="mt-5 p-4 rounded-2xl bg-primary/[0.04] border border-primary/15 max-w-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm">
                  <PlusSquare size={16} className="text-secondary shrink-0" />
                  <span>Install Web App on Your Phone Home Screen:</span>
                </div>
                <a
                  href="https://mobile.midlex.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-bold text-secondary hover:underline"
                >
                  mobile.midlex.xyz ↗
                </a>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5 text-xs text-gray-600 leading-relaxed">
                <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                  <span className="font-bold text-primary block mb-0.5"> iPhone / iOS (Safari):</span>
                  Open <a href="https://mobile.midlex.xyz" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">mobile.midlex.xyz</a> → Tap <strong>Share (↑)</strong> → Select <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                  <span className="font-bold text-primary block mb-0.5">🤖 Android (Chrome):</span>
                  Open <a href="https://mobile.midlex.xyz" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">mobile.midlex.xyz</a> → Tap <strong>Menu (⋮)</strong> → Tap <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                </div>
              </div>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="mt-12 grid grid-cols-3 gap-6 border-t border-gray-100 pt-10"
            >
              <div>
                <h3 className="text-3xl font-bold text-primary">15+</h3>
                <p className="text-sm text-gray-500 font-medium">Years Experience</p>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-primary">500+</h3>
                <p className="text-sm text-gray-500 font-medium">Cases Won</p>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-primary">100%</h3>
                <p className="text-sm text-gray-500 font-medium">Satisfaction</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative lg:h-[700px] flex items-center justify-center"
          >
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-full max-w-[600px] aspect-square rounded-[60px] bg-primary overflow-hidden shadow-2xl border-[12px] border-white"
            >
              <img 
                src="/hero-lawyers.jpg" 
                alt="Midlex Senior Partners" 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 scale-110 hover:scale-100" 
              />
              <div className="absolute inset-0 bg-primary/20 hover:bg-transparent transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-primary/95 to-transparent">
                <p className="text-white text-base font-medium opacity-90 mb-2 italic">
                  "Excellence is not an act, but a habit."
                </p>
                <p className="text-white font-bold text-xl tracking-wide">Senior Partners, Midlex LLP</p>
              </div>
            </motion.div>
            
            {/* Floating Cards */}
            <motion.div
              animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 bg-white p-6 rounded-3xl shadow-2xl hidden xl:block border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-4 rounded-2xl text-white shadow-lg shadow-secondary/20">
                  <Briefcase size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-primary text-lg">Corporate Law</h4>
                  <p className="text-sm text-gray-500">Expert Solutions</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 30, 0], x: [0, -15, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl hidden xl:block border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <div className="bg-primary p-4 rounded-2xl text-white shadow-lg shadow-primary/20">
                  <Scale size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-primary text-lg">Litigation</h4>
                  <p className="text-sm text-gray-500">Superior Advocacy</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
