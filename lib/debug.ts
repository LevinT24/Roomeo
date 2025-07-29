// lib/debug.ts - Debug utilities for Supabase
import { supabase } from './supabase';

export async function debugDatabaseConnection() {
  console.log('🔍 Debugging database connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    console.log('✅ Database connection successful');
    return {
      success: true,
      message: 'Database connection working'
    };
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function debugUserProfile(userId: string) {
  console.log('🔍 Debugging user profile for:', userId);
  
  try {
    // Test user profile retrieval
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ User profile retrieval failed:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    console.log('✅ User profile found:', data);
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('❌ Debug user profile failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function debugTableExists(tableName: string) {
  console.log('🔍 Checking if table exists:', tableName);
  
  try {
    // Try to select from the table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Table check failed:', error);
      return {
        exists: false,
        error: error.message
      };
    }
    
    console.log('✅ Table exists:', tableName);
    return {
      exists: true,
      message: `Table ${tableName} exists`
    };
  } catch (error) {
    console.error('❌ Table check failed:', error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 