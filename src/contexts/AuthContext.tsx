import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Keycloak from 'keycloak-js';
import { appConfig } from '@/config/app.config';
import type { User } from '@/types/translation';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
  getToken: () => string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Keycloak instance
const keycloak = new Keycloak({
  url: appConfig.keycloak.url,
  realm: appConfig.keycloak.realm,
  clientId: appConfig.keycloak.clientId,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const parseUserFromToken = useCallback(() => {
    if (keycloak.tokenParsed) {
      const token = keycloak.tokenParsed as {
        sub: string;
        preferred_username?: string;
        client?: string;
        realm_access?: { roles?: string[] };
        resource_access?: { [key: string]: { roles?: string[] } };
      };

      // Extract roles from token
      const realmRoles = token.realm_access?.roles || [];
      const resourceRoles = token.resource_access?.[appConfig.keycloak.clientId]?.roles || [];
      const allRoles = [...realmRoles, ...resourceRoles];

      const roles: ('admin' | 'editor')[] = [];
      if (allRoles.includes('admin')) roles.push('admin');
      if (allRoles.includes('editor')) roles.push('editor');

      // Default to editor if no recognized role
      if (roles.length === 0) roles.push('editor');

      setUser({
        id: token.sub,
        username: token.preferred_username || 'Unknown',
        client: token.client || 'default',
        roles,
      });
    }
  }, []);

  useEffect(() => {
    keycloak
      .init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);
        if (authenticated) {
          parseUserFromToken();
          // Set up token refresh
          setInterval(() => {
            keycloak.updateToken(30).catch(() => {
              console.warn('Token refresh failed, logging out');
              keycloak.logout();
            });
          }, 60000);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Keycloak init failed:', error);
        setIsLoading(false);
      });

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        keycloak.logout();
      });
    };
  }, [parseUserFromToken]);

  const login = () => {
    keycloak.login();
  };

  const logout = () => {
    keycloak.logout();
  };

  const getToken = () => {
    return keycloak.token;
  };

  const isAdmin = user?.roles.includes('admin') || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
