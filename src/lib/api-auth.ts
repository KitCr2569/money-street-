import { NextResponse } from 'next/server';

/** Standalone: always returns a local admin/pro user */
const LOCAL_USER = {
  id: 'local',
  name: 'Local User',
  email: 'local@localhost',
  role: 'admin' as const,
  plan: 'pro' as const,
};

export async function getAuthUser() {
  return LOCAL_USER;
}

export async function requireAuth() {
  return { user: LOCAL_USER, error: null };
}

export async function requireAdmin() {
  return { user: LOCAL_USER, error: null };
}

export async function requirePro() {
  return { user: LOCAL_USER, error: null };
}
