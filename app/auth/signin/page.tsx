"use client";

import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Checkbox } from "@heroui/checkbox";
import { Eye, EyeSlash } from '@gravity-ui/icons';
import { useState } from "react";

import { useSignIn } from "@/hooks/useSignIn";

/**
 * Sign-In Page UI Component
 * Pure presentation component - no business logic
 * All logic is handled by useSignIn hook
 */
export default function SignIn() {
  const {
    email,
    password,
    rememberMe,
    error,
    loading,
    setEmail,
    setPassword,
    setRememberMe,
    handleSubmit,
  } = useSignIn();

  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="w-full max-w-[360px]">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold mb-6 text-danger">Sign in</h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                className="text-sm font-medium mb-1.5 block"
                htmlFor="email"
              >
                Email
                <span aria-label="required" className="text-danger ml-1">
                  *
                </span>
              </label>
              <Input
                isRequired
                autoComplete="email"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-default-200 hover:border-default-400",
                }}
                id="email"
                placeholder="johndoe@email.com"
                size="md"
                type="email"
                value={email}
                variant="bordered"
                onChange={(e) => setEmail(e.target.value)}
                isDisabled={loading}
              />
            </div>

            <div>
              <label
                className="text-sm font-medium mb-1.5 block"
                htmlFor="password"
              >
                Password
                <span aria-label="required" className="text-danger ml-1">
                  *
                </span>
              </label>
              <Input
                isRequired
                autoComplete="current-password"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-default-200 hover:border-default-400",
                }}
                endContent={
                  <button
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="focus:outline-none"
                    type="button"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <Eye
                        className="text-default-800 pointer-events-none w-5 h-5"
                      />
                    ) : (
                      <EyeSlash
                        className="text-default-800 pointer-events-none w-5 h-5"
                      />
                    )}
                  </button>
                }
                id="password"
                placeholder="Enter password"
                size="md"
                type={showPassword ? "text" : "password"}
                value={password}
                variant="bordered"
                onChange={(e) => setPassword(e.target.value)}
                isDisabled={loading}
              />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Checkbox
                classNames={{
                  label: "text-sm text-danger font-medium",
                }}
                color="default"
                id="remember"
                isSelected={rememberMe}
                size="sm"
                onValueChange={setRememberMe}
                isDisabled={loading}
              >
                Keep me signed in
              </Checkbox>
              <p className="text-[11px] text-default-800 ml-6">
                Recommended on trusted devices
              </p>
            </div>

            <Link
              className="text-sm text-danger font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
              href="/auth/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <div>
            <Button
              className="w-full text-white"
              color="danger"
              endContent={!loading}
              isLoading={loading}
              size="md"
              type="submit"
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
