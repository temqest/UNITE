"use client";

import React from "react";
import { useRouter } from "next/navigation"; // Production Import
import { Navbar } from "@/components/navbar";

// Production HeroUI Imports for Page Content
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";

import { Heart, Activity, CalendarClock, Building2, BellRing, ShieldCheck, Users, ArrowRight, ChevronRight, MapPin, Phone, Mail } from "lucide-react";

// --- Data Configuration ---

interface FeatureItem {
  title: string;
  description: string;
  icon: React.ElementType;
  color: "danger" | "primary" | "success" | "warning" | "secondary" | "default";
}

const FEATURES: FeatureItem[] = [
  { title: "Real-Time Inventory", description: "Live dashboards showing blood supply by type, volume, and location. Instant visibility prevents critical shortages.", icon: Activity, color: "danger" },
  { title: "Smart Scheduling", description: "Secure portal for donors to book appointments and track donation history with automated eligibility reminders.", icon: CalendarClock, color: "primary" },
  { title: "Inter-Hospital Exchange", description: "Emergency requisition board allowing hospitals to request and share units instantly with audit trails.", icon: Building2, color: "success" },
  { title: "Automated Alerts", description: "Configurable notifications for low stock, expiring units, and 'Code Red' events sent to key personnel.", icon: BellRing, color: "warning" },
  { title: "Event Management", description: "Tools to organize blood drives, including venue assignment, capacity limits, and attendance tracking.", icon: Users, color: "secondary" },
  { title: "Secure & Compliant", description: "Role-based access controls and encryption fully aligned with Data Privacy Act and DOH standards.", icon: ShieldCheck, color: "default" },
];

const FeatureCard: React.FC<FeatureItem> = ({ title, description, icon: Icon, color }) => {
    const colorMap = {
      danger: "text-red-600 bg-red-50",
      primary: "text-blue-600 bg-blue-50",
      success: "text-emerald-600 bg-emerald-50",
      warning: "text-amber-600 bg-amber-50",
      secondary: "text-purple-600 bg-purple-50",
      default: "text-slate-600 bg-slate-100",
    };
    const style = colorMap[color];
  
    return (
      <Card className="border-none shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden h-full">
        <CardHeader className="flex gap-4 items-center pb-2">
          <div className={`p-3 rounded-xl ${style}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-bold text-slate-900">{title}</p>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
        </CardBody>
      </Card>
    );
};


export default function AboutPage() {
    const router = useRouter(); 

    // Helper for smooth scrolling to sections
    const scrollToMission = () => {
        document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* Reusable Navbar */}
            <Navbar /> 

            {/* --- Hero Section (pt-24 pushes content below fixed navbar) --- */}
            <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-white">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                Unifying Neighborhoods In <span className="text-red-600">Transfusion Ecosystem</span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-500 max-w-xl leading-relaxed">
                                Bridging the gap between Bicol Medical Center, local hospitals, and lifesavers like you. A centralized hub for smarter blood management.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <Button 
                                    size="lg" 
                                    variant="shadow" 
                                    color="danger"
                                    endContent={<ArrowRight size={18} />}
                                    onPress={() => router.push('/auth/signup')}
                                >
                                    Get Started
                                </Button>
                                <Button 
                                    size="lg" 
                                    variant="bordered"
                                    color="danger"
                                    onPress={scrollToMission}
                                >
                                    Learn More
                                </Button>
                            </div>
                        </div>

                        {/* Abstract Visual Placeholder */}
                        <div className="relative h-full min-h-[400px] flex items-center justify-center">
                             <div className="absolute inset-0 bg-gradient-to-tr from-red-50 to-white rounded-full opacity-60 blur-3xl" />
                             <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm shadow-xl border border-slate-100 z-20">
                               <CardBody className="p-6 gap-6">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                              <Activity size={24} />
                                          </div>
                                          <div>
                                              <p className="text-sm font-semibold text-slate-900">Inventory Status</p>
                                              <p className="text-xs text-slate-500">Bicol Medical Center</p>
                                          </div>
                                      </div>
                                      <Chip size="sm" color="success">NORMAL</Chip>
                                  </div>
                                  <div className="space-y-5">
                                      {/* Inventory Bars Placeholder */}
                                      <div className="flex justify-between items-center"><span className="text-sm font-medium">Type A+</span><div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 w-[80%] rounded-full"></div></div></div>
                                      <div className="flex justify-between items-center"><span className="text-sm font-medium">Type O+</span><div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-[45%] rounded-full"></div></div></div>
                                      <div className="flex justify-between items-center"><span className="text-sm font-medium">Type B-</span><div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-700 w-[20%] rounded-full"></div></div></div>
                                  </div>
                                  <Button size="md" className="w-full mt-4" variant="solid" color="default" onPress={() => router.push('/dashboard')}>
                                      View Full Dashboard
                                  </Button>
                               </CardBody>
                             </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Mission Statement --- */}
            <section id="mission" className="bg-slate-900 py-24 px-6">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <h2 className="text-3xl font-bold text-white">Our Mission</h2>
                    <Divider className="border-slate-700 w-24 mx-auto" />
                    <p className="text-2xl md:text-3xl text-slate-300 font-light leading-relaxed italic">
                        "To build a resilient, technology-driven blood transfusion network that ensures every patient in the Bicol region has timely access to safe blood products."
                    </p>
                </div>
            </section>

            {/* --- Features Grid --- */}
            <section className="py-24 bg-slate-50 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-red-600 font-bold uppercase tracking-wider text-sm">Core Capabilities</h2>
                        <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Technology that Saves Lives</h3>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                            UNITE integrates critical blood banking functions into one secure, accessible cloud platform.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {FEATURES.map((feature, index) => (<FeatureCard key={index} {...feature} />))}
                    </div>
                </div>
            </section>

             {/* --- Stakeholders & Stats (Re-adding this section for completeness) --- */}
            <section className="py-24 bg-white px-6">
                <div className="max-w-7xl mx-auto">
                <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-start">
                    
                    {/* Left Content */}
                    <div className="lg:col-span-7 space-y-10 mb-12 lg:mb-0">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Empowering the Ecosystem</h2>
                        <p className="text-slate-600 text-lg leading-relaxed">
                            We don't just connect data; we connect people. UNITE serves as the digital bridge between institutions and the community.
                        </p>
                    </div>
                    
                    <div className="space-y-8">
                        {[
                        { title: "Bicol Medical Center & Hospitals", desc: "Streamline inventory and reduce wastage through inter-hospital transfers." },
                        { title: "Health Workers & Coordinators", desc: "Simplify blood drive organization with automated reporting logs." },
                        { title: "Individual Donors", desc: "Experience a hassle-free donation process with online booking and history tracking." }
                        ].map((item, idx) => (
                        <div key={idx} className="flex gap-5">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-lg border border-red-200">
                                {idx + 1}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h4>
                                <p className="text-slate-500">{item.desc}</p>
                            </div>
                        </div>
                        ))}
                    </div>
                    </div>

                    {/* Right Stats Card */}
                    <div className="lg:col-span-5">
                    <Card className="bg-slate-50 border border-slate-200 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-red-500 rounded-full opacity-10 blur-xl"></div>
                        <CardHeader className="pb-0 pt-8 px-8">
                            <h3 className="text-xl font-bold text-slate-800">System Impact</h3>
                        </CardHeader>
                        <CardBody className="grid grid-cols-2 gap-4 p-8">
                            {[
                                { val: "24/7", label: "Availability", color: "text-red-600" },
                                { val: "100%", label: "DOH Compliant", color: "text-blue-600" },
                                { val: "Real-Time", label: "Data Sync", color: "text-emerald-600" },
                                { val: "AES-256", label: "Encryption", color: "text-purple-600" },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
                                    <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.val}</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase mt-2 tracking-wide">{stat.label}</p>
                                </div>
                            ))}
                        </CardBody>
                        <CardFooter className="px-8 pb-8 pt-0">
                            <Button 
                                as="a" 
                                href="#" 
                                fullWidth
                                color="danger" 
                                variant="flat"
                                endContent={<ChevronRight size={16} />}
                                onPress={() => console.log('View Reports Clicked')}
                            >
                                View Public Reports
                            </Button>
                        </CardFooter>
                    </Card>
                    </div>
                </div>
                </div>
            </section>

            {/* --- CTA --- */}
            <section className="py-24 bg-red-700 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Ready to make a difference?</h2>
                    <p className="text-red-100 text-xl max-w-2xl mx-auto">
                        Join the UNITE network today.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-5 justify-center">
                        <Button 
                          size="lg" 
                          className="bg-white text-red-700 font-bold shadow-xl hover:bg-slate-100"
                          onPress={() => router.push('/auth/signup')}
                        >
                            Register as Donor
                        </Button>
                        <Button 
                          size="lg" 
                          variant="bordered" 
                          className="text-white border-white font-bold hover:bg-white/10"
                          onPress={() => router.push('/auth/signin')}
                        >
                            Partner with Us
                        </Button>
                    </div>
                </div>
            </section>

            {/* --- Footer (Using standard HTML structure and Lucide icons) --- */}
            <footer className="bg-slate-900 text-slate-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <Heart className="h-6 w-6 text-red-500 fill-current" />
                                <span className="font-bold text-xl text-white">UNITE</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-4 max-w-sm">
                                Unifying Neighborhoods In Transfusion Ecosystem. A project dedicated to modernizing blood banking in the Bicol Region through accessible technology.
                            </p>
                        </div>
                        
                        <div>
                            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                                <li><a href="/calendar" className="hover:text-white transition-colors">Find a Blood Drive</a></li>
                                <li><button onClick={() => router.push('/auth/signin')} className="hover:text-white transition-colors text-left">Hospital Login</button></li>
                                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-white font-semibold mb-4">Contact</h3>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start gap-3">
                                <MapPin size={18} className="text-red-500 mt-0.5" />
                                <span>Bicol Medical Center,<br/>Naga City, Camarines Sur</span>
                                </li>
                                <li className="flex items-center gap-3">
                                <Phone size={18} className="text-red-500" />
                                <span>(054) 472-XXXX</span>
                                </li>
                                <li className="flex items-center gap-3">
                                <Mail size={18} className="text-red-500" />
                                <span>support@unite-project.ph</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 mt-12 pt-8 text-sm text-center text-slate-500">
                        &copy; {new Date().getFullYear()} UNITE Project. All rights reserved.
                    </div>
                </div>
            </footer>

        </div>
    );
}