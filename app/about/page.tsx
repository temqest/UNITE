"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Card, CardBody } from "@heroui/card";
import { 
  Heart, 
  Activity, 
  CalendarClock, 
  Building2, 
  BellRing, 
  ShieldCheck, 
  Users
} from "lucide-react";

// --- Data Configuration ---
interface FeatureItem {
  title: string;
  description: string;
  icon: React.ElementType;
}

const FEATURES: FeatureItem[] = [
  { 
    title: "Real-Time Inventory", 
    description: "Live blood supply tracking across all partner facilities with predictive analytics for shortage prevention.", 
    icon: Activity
  },
  { 
    title: "Smart Scheduling", 
    description: "Intelligent appointment system that maximizes donor convenience and operational efficiency.", 
    icon: CalendarClock
  },
  { 
    title: "Hospital Network", 
    description: "Seamless inter-facility blood sharing with emergency protocols and real-time coordination.", 
    icon: Building2
  },
  { 
    title: "Emergency Alerts", 
    description: "Multi-channel notification system for critical shortages and Code Red situations.", 
    icon: BellRing
  },
  { 
    title: "Community Drives", 
    description: "End-to-end blood drive management from planning to post-event analytics.", 
    icon: Users
  },
  { 
    title: "Data Security", 
    description: "Bank-grade encryption with full DOH compliance and comprehensive audit trails.", 
    icon: ShieldCheck
  },
];

const IMPACT_STATS = [
  { value: "24/7", label: "System Uptime" },
  { value: "Quality-First", label: "Built for Trust" },
  { value: "<2min", label: "Avg Response" },
  { value: "Scalable", label: "Regional-Ready" },
];

const TIMELINE = [
  { 
    year: "2023", 
    quarter: "Q4",
    title: "Discovery Phase", 
    description: "Deep collaboration with BMC staff to map workflows and identify critical pain points in blood management." 
  },
  { 
    year: "2024", 
    quarter: "Q2",
    title: "Alpha Launch", 
    description: "Deployed core inventory management system with real-time sync across three pilot facilities." 
  },
  { 
    year: "2024", 
    quarter: "Q4",
    title: "Beta Expansion", 
    description: "Added donor portal, mobile app, and emergency requisition features based on frontline feedback." 
  },
  { 
    year: "2025", 
    quarter: "Q1",
    title: "Regional Scale", 
    description: "Expanding to full Bicol network with LGU partnerships and community blood drive integration." 
  },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-hidden">
      <Navbar />

      {/* Hero Section aligned with Landing Page */}
      <section className="flex flex-col items-center justify-center pt-24 pb-16 md:pt-32 md:pb-24 px-4 bg-white">
        <div className="inline-block max-w-4xl text-center">
          <div className="mb-6 inline-flex border border-default-200 rounded-full px-4 py-1.5 text-sm font-semibold text-default-800 tracking-wide">
            Bicol's Blood Banking Revolution
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Technology That <span className="text-[#FF3B3B]">Saves Lives</span>
          </h1>
          <p className="text-lg md:text-xl text-default-800 mt-6 max-w-2xl mx-auto leading-relaxed">
            UNITE connects Bicol Medical Center, partner hospitals, and community donors into one intelligent ecosystem—ensuring the right blood reaches the right patient at the right time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
            <Button 
              as={Link}
              className="text-white font-medium"
              color="danger"
              href="/waitlist"
              size="lg"
              variant="solid"
            >
              Join as Donor
            </Button>
            <Button 
              as={Link}
              className="font-medium"
              href="/auth/signin"
              size="lg" 
              variant="bordered"
            >
              Hospital Portal
            </Button>
          </div>
        </div>
      </section>

      {/* Mission Statement block matching Landing Page minimal styling */}
      <section className="py-24 bg-white border-t border-default-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">
            The <span className="text-[#FF3B3B]">Mission</span>
          </h2>
          <blockquote className="text-xl md:text-3xl text-default-800 font-medium leading-relaxed max-w-3xl mx-auto border-l-4 border-[#FF3B3B] pl-6 text-left">
            "We aim to eliminate preventable deaths from blood shortages by building the Philippines' most reliable, transparent, and accessible blood management network."
          </blockquote>
        </div>
      </section>

      {/* Journey Timeline */}
      <section className="py-24 bg-default-50 border-t border-default-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
              Our Journey
            </h2>
            <p className="text-lg text-default-800 max-w-2xl mx-auto">
              From listening sessions with hospital staff to a regional platform serving thousands—built step by step with frontline feedback.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {TIMELINE.map((item, idx) => (
              <Card key={idx} className="border border-default-200 shadow-sm bg-white hover:border-default-400 transition-colors">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[#FF3B3B] font-bold text-lg">{item.year}</span>
                    <span className="text-default-500 text-sm font-semibold">{item.quarter}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-default-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white border-t border-default-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
              Platform Capabilities
            </h2>
            <p className="text-lg text-default-800 max-w-2xl mx-auto">
              Six pillars of modern blood banking designed to reduce friction and prevent waste.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <Card key={idx} className="border border-default-200 shadow-sm bg-white hover:border-default-400 transition-colors">
                <CardBody className="p-6 flex flex-col items-start text-left">
                  <div className="p-3 bg-default-100 rounded-xl mb-4 text-[#FF3B3B]">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-default-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-24 bg-default-50 border-t border-default-100">
        <div className="max-w-5xl mx-auto px-6">
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {IMPACT_STATS.map((stat, idx) => (
              <div 
                key={idx} 
                className="text-center flex flex-col items-center justify-center p-6 border border-default-200 bg-white rounded-2xl shadow-sm"
              >
                <div className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-default-600 font-medium text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clean Call to Action mirroring the waitlist/landing page */}
      <section className="py-24 bg-white border-t border-default-100 text-center px-4">
          <Heart className="w-16 h-16 text-[#FF3B3B] mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Ready to make a difference?
          </h2>
          <p className="text-lg text-default-800 mb-10 max-w-2xl mx-auto">
            Whether you're a donor, hospital, or community organizer—there's a place for you in the movement.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              as={Link}
              size="lg" 
              className="text-white font-medium"
              color="danger"
              href="/waitlist"
              variant="solid"
            >
              Become a Donor
            </Button>
            <Button 
              as={Link}
              size="lg" 
              variant="bordered" 
              className="font-medium"
              href="/auth/signin"
            >
              Partner with UNITE
            </Button>
          </div>
      </section>

    </div>
  );
}