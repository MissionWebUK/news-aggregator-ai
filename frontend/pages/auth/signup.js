// File: frontend/pages/auth/signup.js
import { useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/Navbar";
import Link from "next/link";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Basic client-side checks
    if (!name || !email || !password || !confirmPassword) {
      return setError("All fields are required");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    // 2. Start loading
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        // 3. On success, redirect to sign-in
        router.push("/auth/signin");
      } else {
        const data = await res.json();
        setError(data.message || "Failed to sign up");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // State for controlling the mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="bg-gray-800">
        <aside
          className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-gray-800 text-white p-4 transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:relative md:translate-x-0`}
        >
          <h2 className="text-xl font-bold mb-4">Menu</h2>
          <ul>
            <li className="mb-2">
              <Link href="/" className="hover:underline">Home</Link>
            </li>
            <li className="mb-2">
              <Link href="/auth/signin" className="hover:underline">Sign In</Link>
            </li>
            <li className="mb-2">
              <Link href="/auth/signup" className="hover:underline">Sign Up</Link>
            </li>
          </ul>
        </aside>
        {/* Hamburger Button: visible only on small screens */}
        <div className="md:hidden fixed top-4 left-4 z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-800 bg-white rounded-md shadow"
          >
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
        {/* Content Wrapper: fixed max width, centered, with dark blue background in dark mode */}
        <div className="max-w-screen-xl mx-auto p-4 dark:bg-blue-900">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md mx-auto mt-10">
            <h2 className="text-2xl font-bold mb-4 text-center">Sign Up</h2>
            {error && <p className="text-red-500 mb-2 text-center">{error}</p>}
            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                className="block w-full p-2 border rounded mb-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <input
                type="email"
                placeholder="Email"
                className="block w-full p-2 border rounded mb-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                className="block w-full p-2 border rounded mb-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Confirm Password"
                className="block w-full p-2 border rounded mb-4"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:bg-gray-300"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>
            <div className="mt-4 text-center text-sm">
              <p>
                Already have an account?{" "}
                <Link href="/auth/signin" className="text-blue-500 hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 border-t pt-4 text-center text-gray-600 dark:text-gray-300">
            <p>© 2025 News Aggregator AI. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <Link href="/about" className="hover:underline">About Us</Link>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <Link href="/terms" className="hover:underline">Terms & Conditions</Link>
              <Link href="/contact" className="hover:underline">Contact</Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}