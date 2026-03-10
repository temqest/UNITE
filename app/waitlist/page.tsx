"use client";

import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Link } from "@heroui/link";
import { Navbar } from "@/components/layout/navbar";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  // Honeypot field state
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      // Pull API URL strictly from environment configurations with local fallbacks
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6700";
      
      const response = await fetch(`${baseUrl}/api/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email,
          company_name: companyName, // Honeypot field for bot trap
          source: "unite-website",
          signupPage: window.location.href // Track signup conversion source dynamically
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 409 Conflict (Duplicate Email) and 429 Bad Requests silently without throwing Native Errors
        setStatus("error");
        setErrorMessage(data.message || "Something went wrong. Please try again.");
        return; // Early return to prevent success propagation
      }

      // Success
      setStatus("success");
      setEmail("");
      setCompanyName(""); // clear honeypot safely via cleanup
      
    } catch (err: any) {
      setStatus("error");
      setErrorMessage("Unable to join waitlist. Please try again later.");
    }
  };

  return (
    <>
      <Navbar />
      <section className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-8 md:py-10 bg-white">
        <div className="inline-block max-w-3xl text-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Join the <span className="text-[#FF3B3B]">movement</span>
          </h1>
          <p className="text-lg text-default-800 mt-4 max-w-2xl mx-auto">
            Get early access to Unite — the next-generation health tech platform built as a movement. One donation, infinite impact.
          </p>
        </div>

        <div className="mt-8 w-full max-w-md px-4">
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <h3 className="text-2xl font-bold mt-4">You&apos;re on the list!</h3>
              <p className="text-default-800 text-center">
                Keep an eye on your inbox. We&apos;ll be in touch soon with updates.
              </p>
              <Button 
                as={Link}
                href="/"
                size="md" 
                variant="bordered"
                className="mt-4"
              >
                Return home
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
                {/* Honeypot field hidden from screen readers and visual layout */}
                <div style={{ display: 'none' }} aria-hidden="true">
                  <label htmlFor="company_name">Company Name</label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                
                <Input 
                  type="email" 
                  placeholder="Enter your email address" 
                  className="flex-1"
                  radius="md"
                  size="md"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if(status === 'error') setStatus('idle');
                  }}
                  isDisabled={status === "loading"}
                  required
                  aria-label="Email address"
                />
                <Button 
                  type="submit"
                  className="text-white"
                  color="danger"
                  radius="md"
                  size="md"
                  variant="solid"
                  isLoading={status === "loading"}
                >
                  {status === "loading" ? "Joining..." : "Waitlist"}
                </Button>
              </form>
              {status === "error" && (
                <p className="text-[#FF3B3B] text-sm mt-3 text-center">
                  {errorMessage}
                </p>
              )}
              
              <div className="mt-8 flex flex-col items-center">
                <p className="text-sm text-default-500 text-center">
                  Join 1,000+ others already waiting. No spam. Unsubscribe anytime.
                </p>
                <Button 
                  as={Link}
                  href="/about"
                  size="md" 
                  variant="bordered"
                  className="mt-6 text-slate-800 font-medium border-slate-300 hover:bg-slate-50"
                >
                  Learn more
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
