'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DharoharLogo from '@/components/DharoharLogo';
import { Menu, X, ArrowRight, Compass, ShieldCheck } from 'lucide-react';

export default function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Explore Heritage', href: '#showcase' },
    { label: 'Platform', href: '#capabilities' },
    { label: 'Research & Tech', href: '#technology' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 border-b ${
        isScrolled
          ? 'bg-[#FFFCF5]/95 backdrop-blur-md border-[#DED3C2] shadow-xs py-3'
          : 'bg-[#F6F1E7]/90 backdrop-blur-xs border-[#EBE4D8] py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand identity */}
        <Link href="#home" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#642F38] text-[#FFFCF5] flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
            <DharoharLogo className="w-6 h-6 text-[#FFFCF5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-lg text-[#642F38] tracking-tight">
                DHAROHAR AI
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#642F38]/10 text-[#642F38] font-serif">
                धरोहर
              </span>
            </div>
            <span className="text-[11px] font-sans text-[#756D66] tracking-wide -mt-0.5">
              Digital Heritage Intelligence Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs lg:text-sm font-sans font-medium text-[#756D66] hover:text-[#642F38] transition-colors relative py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Enter Platform Action */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/platform?tab=dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] font-serif text-xs lg:text-sm font-medium shadow-xs transition-all hover:gap-2.5 cursor-pointer"
          >
            <span>Enter Platform</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C8AD8D]" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[#756D66] hover:text-[#393331] hover:bg-[#EFE8DC] transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#DED3C2] bg-[#FFFCF5] px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[#393331] hover:bg-[#EFE8DC] hover:text-[#642F38] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-2 border-t border-[#EBE4D8]">
            <Link
              href="/platform?tab=dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#642F38] text-[#FFFCF5] font-serif text-sm font-medium shadow-xs"
            >
              <span>Enter DHAROHAR AI Platform</span>
              <ArrowRight className="w-4 h-4 text-[#C8AD8D]" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

