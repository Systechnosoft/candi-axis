"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  UserCircle, 
  Bell, 
  Tag, 
  Shield, 
  Settings, 
  LogOut 
} from 'lucide-react';

export function Topbar() {
  const { session, logout, hasAccess } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-between px-6 z-40 relative">
      {/* Left: Logo Text */}
      <div className="flex items-center h-16 pointer-events-none">
        <div className="flex items-center rounded-sm -ml-5 pointer-events-none">
          <Image 
            src="/logo.png" 
            alt="CandiAxis" 
            width={200}
            height={80}
            priority
            className="object-contain object-left pointer-events-none" 
          />
        </div>
      </div>

      {/* Middle: Search bar */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search candidates, reqs, jobs..." 
            className="w-full pl-9 pr-4 py-1.5 bg-subtle border border-border rounded-md text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>
      
      {/* Right: User Menu */}
      <div 
        className="relative" 
        ref={dropdownRef}
      >
        <button 
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center justify-center p-1.5 rounded-full hover:bg-subtle text-text-secondary hover:text-text-primary transition-all focus:outline-none"
          aria-expanded={isDropdownOpen}
          aria-label="User menu"
        >
          <UserCircle className="w-6 h-6" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-lg py-2 text-[14px] text-text-primary z-50 animate-in fade-in slide-in-from-top-1 duration-100">
            {/* User Info Header */}
            {session && (
              <div className="px-4 py-2 border-b border-border">
                <p className="font-semibold text-text-primary truncate">{session.user.full_name}</p>
                <p className="text-[11px] text-text-muted truncate mt-0.5">{session.user.email}</p>
              </div>
            )}

            {/* Main Menu Links */}
            <div className="py-1">
              <Link 
                href="/notifications" 
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-subtle text-text-secondary hover:text-text-primary transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </Link>
              
              <Link 
                href="/admin/tags" 
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-subtle text-text-secondary hover:text-text-primary transition-colors"
              >
                <Tag className="w-4 h-4" />
                <span>Tags Dictionary</span>
              </Link>

              {/* Admin Section */}
              {hasAccess('users') && (
                <Link 
                  href="/admin/usermanagement" 
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-subtle text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Console</span>
                </Link>
              )}

              <Link 
                href="/admin/site-configuration" 
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-subtle text-text-secondary hover:text-text-primary transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </div>

            {/* Logout Action */}
            <div className="border-t border-border mt-1 pt-1">
              <button 
                onClick={() => {
                  setIsDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-subtle text-status-error hover:text-status-error/90 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
