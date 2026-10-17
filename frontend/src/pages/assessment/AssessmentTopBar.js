import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Sun, Moon } from 'lucide-react';

export default function AssessmentTopBar({
  title = 'Assessment',
  subtitle = '',
  backPath,
  onBack,
  backLabel = 'Back to Dashboard',
  rightContent = null,
}) {
  const navigate = useNavigate();
  const { user, isDarkMode, toggleDarkMode } = useAuth();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate('/patient/dashboard');
    }
  };

  return (
    <header className="w-full max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 md:py-8 px-4 sm:px-6">
      {/* Left: Back Button & Title with Brand Vertical Pill */}
      <div className="flex items-center gap-3 md:gap-4 flex-wrap">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-primary-500/50 transition-all active:scale-95"
          title={backLabel}
        >
          <ChevronLeft className="w-4 h-4 text-primary-500" />
          <span>{backLabel}</span>
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />

        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-primary-500 rounded-full hidden sm:block" />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-widest uppercase">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: Custom actions + Dark Mode Toggle + User Avatar */}
      <div className="flex items-center gap-3 self-end md:self-auto">
        {rightContent}

        <button
          onClick={toggleDarkMode}
          className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-primary-500/50 transition-all shadow-sm flex items-center justify-center cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-gray-600" />}
        </button>

        {user && (
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-black shadow-sm">
              {(user.name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block leading-tight">
                {user.name || 'Patient'}
              </span>
              <span className="text-[10px] text-gray-400 font-medium block">
                {user.email}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

