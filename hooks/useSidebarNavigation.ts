import { useState, useEffect, useMemo } from 'react';
import { PAGE_PERMISSION_MAP, hasAnyPermission, hasAllPermissions, type UserPermissions } from '@/lib/permissions/page-mapping';
import { fetchJsonWithAuth } from '@/utils/fetchWithAuth';

/**
 * Menu item structure for sidebar navigation
 */
export interface MenuItem {
  id: string;
  label: string;
  route: string;
  icon?: React.ReactNode;
  visible: boolean;
}

/**
 * Default menu items configuration
 * This defines all possible menu items in the sidebar
 * Visibility is determined by permissions
 */
const DEFAULT_MENU_ITEMS: Omit<MenuItem, 'visible'>[] = [
  {
    id: 'campaign',
    label: 'Campaign',
    route: '/dashboard/campaign',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    route: '/dashboard/calendar',
  },
  {
    id: 'chat',
    label: 'Chat',
    route: '/dashboard/chat',
  },
  {
    id: 'stakeholder-management',
    label: 'Stakeholder Management',
    route: '/dashboard/stakeholder-management',
  },
  {
    id: 'coordinator-management',
    label: 'Coordinator Management',
    route: '/dashboard/coordinator-management',
  },
];

/**
 * Custom hook for sidebar navigation logic
 * Determines which menu items are visible based on permissions
 * Uses /api/pages/accessible endpoint for efficient permission checking
 * 
 * This hook contains NO rendering logic - only permission checking
 */
export function useSidebarNavigation() {
  const [accessiblePages, setAccessiblePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch accessible pages from backend
   * Uses /api/pages/accessible endpoint (recommended approach)
   */
  useEffect(() => {
    const fetchAccessiblePages = async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        const url = base ? `${base}/api/pages/accessible` : `/api/pages/accessible`;
        
        const body: any = await fetchJsonWithAuth(url).catch(() => ({}));
        
        if (body?.success && Array.isArray(body.data)) {
          setAccessiblePages(body.data);
        } else {
          setAccessiblePages([]);
        }
      } catch (error) {
        console.error('Error fetching accessible pages:', error);
        setAccessiblePages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessiblePages();
  }, []);

  /**
   * Convert user permissions from auth context to UserPermissions format
   * For now, we'll use accessiblePages as the primary source of truth
   */
  const userPermissions: UserPermissions = useMemo(() => {
    return {
      permissions: [], // Will be populated from /api/auth/me if needed
      accessiblePages,
    };
  }, [accessiblePages]);

  /**
   * Determine if a page should be visible based on permissions
   * Uses accessiblePages from backend (preferred) or falls back to permission checking
   */
  const isPageVisible = useMemo(() => {
    return (pageRoute: string): boolean => {
      const pageConfig = PAGE_PERMISSION_MAP[pageRoute];
      if (!pageConfig) {
        // Page not in mapping - default to hidden for security
        return false;
      }

      // If we have accessiblePages from backend, use that (most reliable)
      if (accessiblePages.length > 0) {
        return accessiblePages.includes(pageRoute);
      }

      // Fallback: Check permissions directly if accessiblePages not available
      // This should rarely happen, but provides a fallback
      if (pageConfig.requiredPermissions.length === 0) {
        // No permissions required = visible to all authenticated users
        return true; // Assume authenticated if hook is being used
      }

      if (pageConfig.requireAll) {
        // AND logic: User needs all permissions
        return hasAllPermissions(userPermissions, pageConfig.requiredPermissions);
      } else {
        // OR logic: User needs at least one permission
        return hasAnyPermission(userPermissions, pageConfig.requiredPermissions);
      }
    };
  }, [accessiblePages, userPermissions]);

  /**
   * Filter menu items based on permissions
   * Returns only visible menu items
   */
  const menuItems: MenuItem[] = useMemo(() => {
    return DEFAULT_MENU_ITEMS.map((item) => ({
      ...item,
      visible: isPageVisible(item.id),
    })).filter((item) => item.visible);
  }, [isPageVisible]);

  /**
   * Refresh accessible pages
   * Call this when permissions might have changed
   */
  const refreshAccessiblePages = async () => {
    setLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const url = base ? `${base}/api/pages/accessible` : `/api/pages/accessible`;
      
      const body: any = await fetchJsonWithAuth(url).catch(() => ({}));
      
      if (body?.success && Array.isArray(body.data)) {
        setAccessiblePages(body.data);
      }
    } catch (error) {
      console.error('Error refreshing accessible pages:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    menuItems,
    loading,
    accessiblePages,
    refreshAccessiblePages,
  };
}
