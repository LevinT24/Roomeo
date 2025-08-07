// ==========================================
// 1. CREATE: lib/api.ts - Authenticated API Helper
// ==========================================

import { supabase } from '@/lib/supabase'

class AuthenticatedAPI {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.access_token) {
      throw new Error('No valid session found')
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  async get(url: string): Promise<Response> {
    const headers = await this.getAuthHeaders()
    return fetch(url, { 
      method: 'GET', 
      headers 
    })
  }

  async post(url: string, data?: any): Promise<Response> {
    const headers = await this.getAuthHeaders()
    return fetch(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch(url: string, data?: any): Promise<Response> {
    const headers = await this.getAuthHeaders()
    return fetch(url, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete(url: string): Promise<Response> {
    const headers = await this.getAuthHeaders()
    return fetch(url, {
      method: 'DELETE',
      headers
    })
  }
}

export const authAPI = new AuthenticatedAPI()