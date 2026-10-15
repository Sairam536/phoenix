import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.js';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by?: string;
  settings?: Record<string, unknown>;
  user_role?: string;
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  switchOrg: (orgId: string) => void;
  refreshOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Apex Logistics & Industrial Corp',
      slug: 'apex-logistics',
      user_role: 'owner',
    },
  ]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(() => {
    const saved = localStorage.getItem('documind_org');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Apex Logistics & Industrial Corp',
      slug: 'apex-logistics',
      user_role: 'owner',
    };
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshOrgs = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<Organization[]>('/organizations');
      if (Array.isArray(data) && data.length > 0) {
        setOrganizations(data);
        if (!currentOrg || !data.some(o => o.id === currentOrg.id)) {
          setCurrentOrg(data[0]);
          localStorage.setItem('documind_org_id', data[0].id);
          localStorage.setItem('documind_org', JSON.stringify(data[0]));
        }
      }
    } catch {
      // Fallback in demo mode
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshOrgs();
  }, []);

  const switchOrg = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem('documind_org_id', org.id);
      localStorage.setItem('documind_org', JSON.stringify(org));
    }
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        isLoading,
        switchOrg,
        refreshOrgs,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) throw new Error('useOrg must be used within an OrgProvider');
  return context;
};
