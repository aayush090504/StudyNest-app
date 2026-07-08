/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { THEMES } from './lib/constants';
import { Heart } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, profile, loading, focusModeEnabled, isTimerActive } = useAuth();
  
  const currentThemeId = profile?.theme || 'warm-cozy';
  const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];

  const isFocusModeActive = focusModeEnabled && isTimerActive;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50/70 text-amber-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold font-display tracking-tight text-lg animate-pulse">Entering StudyNest...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show login/signup screen first and block all study options
  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-500 ${theme.colors.bg} ${theme.colors.text}`}>
        <main className="flex-1 flex flex-col justify-center items-center">
          <Routes>
            <Route path="*" element={<Login />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
          </Routes>
        </main>
        
        <footer className="w-full py-6 mt-12 px-6 border-t border-black/5 dark:border-white/5 text-center flex flex-col sm:flex-row items-center justify-between gap-4 z-10 text-xs">
          <div className={`font-semibold ${theme.colors.muted}`}>
            &copy; {new Date().getFullYear()} StudyNest. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/privacy" className="hover:underline transition text-stone-400 font-medium">Privacy Policy</Link>
            <span className="text-stone-300">|</span>
            <Link to="/terms" className="hover:underline transition text-stone-400 font-medium">Terms & Conditions</Link>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${theme.colors.bg} ${theme.colors.text}`}>
      {/* Navbar navigation header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
        </Routes>
      </main>

      {/* Cozy Aesthetic Footer */}
      {!isFocusModeActive && (
        <footer className="w-full py-6 mt-12 px-6 border-t border-black/5 dark:border-white/5 text-center flex flex-col sm:flex-row items-center justify-between gap-4 z-10 text-xs animate-fade-in">
          <div className={`font-semibold ${theme.colors.muted}`}>
            &copy; {new Date().getFullYear()} StudyNest. All rights reserved.
          </div>
          
          <div className="flex items-center space-x-1.5 text-stone-400">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" />
            <span>for cozy scholars.</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/privacy" className="hover:underline transition text-stone-400 font-medium">Privacy Policy</Link>
            <span className="text-stone-300">|</span>
            <Link to="/terms" className="hover:underline transition text-stone-400 font-medium">Terms & Conditions</Link>
            <span className="text-stone-300">|</span>
            <a href="mailto:support@studynest.co" className="hover:underline transition text-stone-400 font-medium">support@studynest.co</a>
          </div>
        </footer>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
