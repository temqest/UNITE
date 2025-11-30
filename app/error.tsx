"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    /* eslint-disable no-console */
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col items-center justify-center min-h-screen bg-white text-black py-8 md:py-10">
      <div className="inline-block max-w-3xl text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#FF3B3B] mb-4">
          Oops! Something went wrong
        </h1>
        <p className="text-lg text-gray-600 mt-4 mb-8">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        <Button
          className="text-white bg-[#FF3B3B] hover:bg-[#E63333]"
          size="md"
          onClick={reset}
        >
          Go back
        </Button>
      </div>
    </section>
  );
}
