// ============================================================
// Kobi Business OS â Shared Types
// ============================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  owner_user_id?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'ultimate';
  status: 'active' | 'suspended' | 'trial';
  max_users: number;
  trial_ends_at?: string;
  industry?: string;
  country: string;
  language: string;
  currency: string;
  timezone: string;
  logo_url?: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id?: string;
  email: string;
  display_name: string;
  role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
  permissions?: Record<string, any>;
  status: 'active' | 'invited' | 'suspended';
  last_login_at?: string;
}

export interface Module {
  id: string;
  key: string;
  name_en: string;
  name_he: string;
  description_en: string;
  description_he: string;
  category: string;
  icon: string;
  price_monthly: number;
  price_yearly?: number;
  tier_required: 'starter' | 'professional' | 'enterprise' | 'ultimate';
  features?: Record<string, any>;
  dependencies?: string[];
  status: 'available' | 'coming_soon' | 'beta' | 'deprecated';
  sort_order?: number;
  routes?: Record<string, any>;
  launchpad_tile?: Record<string, any>;
}

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_key: string;
  enabled: boolean;
  config?: Record<string, any>;
  activated_at?: string;
  deactivated_at?: string;
  module?: Module;
}

export interface AISession {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  model: string;
  context?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    role: string;
    tenant_id: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status?: string;
  } | null;
}

export interface ModuleCategory {
  category: string;
  count: number;
}

export type Language = 'he' | 'en' | 'ar';
export type Direction = 'rtl' | 'ltr';
