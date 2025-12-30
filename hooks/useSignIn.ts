import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/components/ui/loading-overlay';
import { secureFetchJson } from '@/utils/secureFetch';

/**
 * Custom hook for sign-in page logic
 * Handles form state, validation, API calls, and redirects
 * Separated from UI component for clean separation of concerns
 */
export function useSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setIsLoading: setGlobalLoading } = useLoading();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): string | null => {
    if (!email.trim()) {
      return 'Email is required';
    }
    if (!validateEmail(email)) {
      return 'Please enter a valid email address';
    }
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // Clear previous errors
    setError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setGlobalLoading(true);

    const payload = { email, password };

    try {
      // Try staff/admin/coordinator login first
      // Use secure fetch to prevent exposing API endpoints in console errors
      let res: Response;
      let body: any = {};
      
      const { response: res1, body: body1 } = await secureFetchJson(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
        suppressErrors: true, // Suppress console errors to avoid exposing API endpoints
      });
      
      res = res1;
      body = body1;

      // If staff login failed, try stakeholder login
      if (!res.ok || body.success === false) {
        const { response: res2, body: body2 } = await secureFetchJson(`${API_URL}/api/stakeholders/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
          suppressErrors: true, // Suppress console errors to avoid exposing API endpoints
        });
        
        res = res2;
        body = body2;
      }

      if (!res.ok || body.success === false) {
        // Handle 404 (route not found) or account not found errors
        // Use generic error messages that don't expose API structure
        if (res.status === 404 || body.message?.toLowerCase().includes('not found')) {
          setError('Account doesn\'t exist');
        } else if (res.status === 401 || res.status === 403) {
          setError('Invalid email or password');
        } else {
          // Generic error message - don't expose API error details
          setError('Invalid email or password');
        }
        setLoading(false);
        setGlobalLoading(false);
        return;
      }

      const { token, data } = body;

      // Debug: Log response data to help diagnose production issues
      if (process.env.NODE_ENV === 'development') {
        console.log('[Login] Response data:', {
          hasToken: !!token,
          hasData: !!data,
          staffType: data?.StaffType || data?.staff_type || data?.role,
          isAdmin: data?.isAdmin,
          dataKeys: data ? Object.keys(data) : [],
        });
      }

      // Persist auth details: token + user
      const storage = rememberMe ? localStorage : sessionStorage;

      if (token) storage.setItem('unite_token', token);
      if (data) storage.setItem('unite_user', JSON.stringify(data));

      // Also write a sanitized legacy `unite_user` object to localStorage
      // (development compatibility). This ensures the UNITE Sidebar's
      // client-side getUserInfo() can reliably detect roles during
      // hydration even when the app used sessionStorage or a different key.
      try {
        // Get StaffType from response - backend now includes this field
        const staffType =
          data?.StaffType || data?.staff_type || data?.role || null;
        const staffTypeStr = String(staffType || '').toLowerCase();

        // Determine if user is Admin: StaffType === 'Admin' or explicit isAdmin flag
        // This is critical for sidebar to show correct icons
        const isAdminUser =
          !!data?.isAdmin ||
          staffType === 'Admin' ||
          staffTypeStr === 'admin' ||
          (staffTypeStr.includes('sys') && staffTypeStr.includes('admin'));

        const legacy = {
          role: staffType,
          StaffType: staffType, // CRITICAL: Sidebar needs this exact field name
          staff_type: staffType, // Also include lowercase variant for compatibility
          isAdmin: isAdminUser,
          First_Name:
            data?.First_Name || data?.first_name || data?.FirstName || null,
          email: data?.Email || data?.email || null,
          id:
            data?.id ||
            data?.ID ||
            data?._id ||
            data?.Stakeholder_ID ||
            data?.StakeholderId ||
            data?.stakeholder_id ||
            data?.Coordinator_ID ||
            data?.CoordinatorId ||
            data?.coordinator_id ||
            data?.user_id ||
            null,
          // Include all original data for full compatibility
          ...data,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('unite_user', JSON.stringify(legacy));

          // Debug: Verify what was stored
          if (process.env.NODE_ENV === 'development') {
            console.log('[Login] Stored legacy object:', {
              StaffType: legacy.StaffType,
              role: legacy.role,
              isAdmin: legacy.isAdmin,
              hasStaffType: !!legacy.StaffType,
            });
          }
        }
      } catch (e) {
        // Log error in development to help debug production issues
        console.error('Error storing user info:', e);
      }

      // Emit an in-window event to notify client-side components of an
      // auth change (useful for SPA flows where storage events don't fire
      // in the same window). Then navigate to dashboard. For maximum
      // reliability we still perform a full navigation so SSR can read
      // HttpOnly cookies when present.
      try {
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(
              new CustomEvent('unite:auth-changed', {
                detail: { role: data?.role, isAdmin: data?.isAdmin },
              }),
            );
          } catch (e) {}
        }
      } catch (e) {}

      // Set flag to show loading overlay on dashboard navigation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('showLoadingOverlay', 'true');
      }

      // Use a full navigation so the browser sends the HttpOnly cookie and
      // the Next.js server-layout can read it during SSR.
      if (typeof window !== 'undefined') {
        window.location.assign('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      // Don't log errors to console in production - security best practice
      // Only log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Sign in error:', err);
      }
      // Generic error message - don't expose internal error details
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  return {
    email,
    password,
    rememberMe,
    error,
    loading,
    setEmail,
    setPassword,
    setRememberMe,
    handleSubmit,
  };
}
