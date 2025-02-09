// File: frontend/pages/dashboard.js

import { getSession, useSession } from "next-auth/react"; // Use session from NextAuth
import { useState, useEffect } from "react";
import { useDarkMode } from "../context/DarkModeContext"; // Use global Dark Mode context
import Navbar from "../components/Navbar"; // Import the existing Navbar component
import Link from "next/link";

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const { darkMode, setDarkMode } = useDarkMode();

  // State for sidebar toggle (for mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    // Outer container: static sidebar and main content.
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Sidebar for md and above is always visible.
          For smaller screens, use an overlay if sidebarOpen is true.
          Using "top-16 bottom-0" so that the sidebar starts below the hamburger icon */}
      <div className="bg-gray-800">
        <aside
          className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-gray-800 text-white p-4 transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:relative md:translate-x-0`}
        >
          <h2 className="text-xl font-bold mb-4">Menu</h2>
          <ul>
            <li className="mb-2">
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li className="mb-2">
              <Link href="/preferences" className="hover:underline">
                Preferences
              </Link>
            </li>
            <li className="mb-2">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
            </li>
          </ul>
          {/* AI Ranking Toggle in Sidebar */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-200">AI Ranking</h3>
            <label htmlFor="aiToggle" className="flex items-center cursor-pointer mt-2">
              <div className="relative">
                <input
                  type="checkbox"
                  id="aiToggle"
                  className="sr-only"
                  onChange={() => {}}
                />
                <div className="w-10 h-4 bg-gray-300 rounded-full shadow-inner"></div>
                <div className={`dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition transform`}></div>
              </div>
              <span className="ml-3 text-gray-200">AI Ranking</span>
            </label>
          </div>
        </aside>
        {/* Hamburger Button: visible only on small screens */}
        <div className="md:hidden fixed top-4 left-4 z-40">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-800 bg-white rounded-md shadow">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Content Container: fixed max width, centered, with dark mode background */}
        <div className="max-w-screen-xl mx-auto p-4 dark:bg-blue-900">
          <div className="mb-4">
            <p className="text-xl">Welcome, {session?.user?.name || "User"}!</p>
          </div>
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mt-4">
            <div className="flex items-center space-x-4">
              <img
                className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-500"
                src={session.user.image}
                alt="Profile"
              />
              <div>
                <h1 className="text-2xl font-semibold">{session.user.name}</h1>
                <p className="text-gray-600 dark:text-gray-300">{session.user.email}</p>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-lg font-medium">Preferences</h2>
              <div className="flex items-center mt-3">
                <span className="mr-2">🌞 Light</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={darkMode}
                    onChange={() => setDarkMode(!darkMode)}
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="ml-2">🌙 Dark</span>
              </div>
            </div>
          </div>
          <footer className="mt-8 border-t pt-4 text-center text-gray-600 dark:text-gray-300">
            <p>© 2025 News Aggregator AI. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <Link href="/about" className="hover:underline">
                About Us
              </Link>
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
              <Link href="/terms" className="hover:underline">
                Terms & Conditions
              </Link>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}