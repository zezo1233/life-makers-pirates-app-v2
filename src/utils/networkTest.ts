// Network test utilities for React Native
import { supabase } from '../config/supabase';

export const testNetworkConnection = async () => {
  console.log('🔍 Testing network connection...');
  
  try {
    // Test 1: Simple fetch
    console.log('1️⃣ Testing basic fetch...');
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('✅ Basic fetch successful');
    } else {
      console.log('❌ Basic fetch failed:', response.status);
    }
    
    // Test 2: Supabase connection
    console.log('2️⃣ Testing Supabase connection...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return false;
    } else {
      console.log('✅ Supabase connection successful');
      return true;
    }
    
  } catch (error) {
    console.log('💥 Network test error:', error);
    return false;
  }
};

export const testSupabaseAuth = async () => {
  console.log('🔐 Testing Supabase auth...');
  
  try {
    // Test auth endpoint
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Auth test failed:', error.message);
      return false;
    } else {
      console.log('✅ Auth endpoint accessible');
      return true;
    }
    
  } catch (error) {
    console.log('💥 Auth test error:', error);
    return false;
  }
};

export const debugNetworkInfo = () => {
  console.log('📊 Network Debug Info:');
  console.log('User Agent:', navigator.userAgent);
  console.log('Online:', navigator.onLine);
  console.log('Connection:', (navigator as any).connection?.effectiveType || 'unknown');
};
