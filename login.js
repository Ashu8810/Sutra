import { supabase } from './supabase.js';
import { showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const googleLoginBtn = document.getElementById('google-login-btn');
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  // Handle Google OAuth Login
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/dashboard.html'
          }
        });

        if (error) throw error;
      } catch (error) {
        console.error('Error logging in with Google:', error.message);
        showToast('Login failed: ' + error.message, 'error');
      }
    });
  }

  // Handle Email/Password Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevent default form action

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          throw error;
        }

        // Successfully logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
      } catch (error) {
        console.error('Error logging in:', error.message);
        showToast('Login failed: ' + error.message, 'error');
      }
    });
  }
});
