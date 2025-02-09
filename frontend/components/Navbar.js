// File: frontend/components/Navbar.js
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useDarkMode } from "../context/DarkModeContext";
import Link from "next/link";

export default function Navbar({ toggleSidebar }) {
  const { data: session } = useSession();
  const { darkMode, setDarkMode } = useDarkMode();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef(null);

  // Ensure dark mode is applied after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md py-3 px-6 flex items-center">
      {/* Hamburger button: visible on small screens only */}
      <button
        onClick={toggleSidebar}
        className="md:hidden mr-3 p-2 rounded-md focus:outline-none focus:ring"
      >
        <svg
          className="w-6 h-6 text-gray-900 dark:text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>

      {/* Title: positioned to the right of the hamburger */}
      <Link href="/">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">News Aggregator</h1>
      </Link>

      <div className="ml-auto flex items-center space-x-4">
        {/* Dark Mode Toggle */}
        {mounted && (
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
          >
            {darkMode ? "🌙" : "☀️"}
          </button>
        )}

        {session ? (
          <div className="relative" ref={dropdownRef}>
            <button
              id="dropdownMenu"
              className="flex items-center space-x-2 focus:outline-none"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <img
                src={session.user.image}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-500"
              />
              <span className="text-gray-900 dark:text-white hidden sm:inline">{session.user.name}</span>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
                <ul className="py-2 text-gray-800 dark:text-gray-200">
                  <li>
                    <Link href="/" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                      📰 My Feed
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                      📊 Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/preferences" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                      ⚙️ Preferences
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={() => signOut()}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      🚪 Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth/signin">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
}