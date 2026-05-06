import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const googleSignupBtn = document.getElementById('google-signup-btn');
  const signupForm = document.getElementById('signup-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  // Handle Google OAuth Signup
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', async () => {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/dashboard.html'
          }
        });

        if (error) throw error;
      } catch (error) {
        console.error('Error signing up with Google:', error.message);
        alert('Failed to sign up with Google: ' + error.message);
      }
    });
  }

  // Handle Email/Password Signup
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: name
            }
          }
        });

        if (error) {
          throw error;
        }

        // Successfully signed up
        alert('Account created successfully! You can now log in.');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Error signing up:', error.message);
        alert('Signup failed: ' + error.message);
      }
    });
  }
});
