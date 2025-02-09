// File: frontend/pages/auth/signin.js
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/Navbar";
import Link from "next/link";

export default function SignIn() {
  const router = useRouter();
  const { error } = router.query;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // State for sidebar toggle on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Map specific NextAuth errors to friendlier messages
  const getFriendlyErrorMessage = (errorString) => {
    if (errorString === "CredentialsSignin") {
      return "Invalid credentials. Please check your email or password.";
    }
    return errorString || "An unknown error occurred. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      const friendlyMessage = getFriendlyErrorMessage(result.error);
      setLoading(false);
      router.push(`/auth/signin?error=${encodeURIComponent(friendlyMessage)}`);
    } else {
      router.push("/dashboard");
    }
  };

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
        {/* Content Wrapper */}
        <div className="max-w-screen-xl mx-auto p-4 dark:bg-blue-900">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
            {error && (
              <p className="text-red-500 text-sm text-center mb-4">
                {decodeURIComponent(error)}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:ring-blue-400"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:ring-blue-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-md transition disabled:bg-gray-300"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="my-4 text-center text-gray-500">OR</div>

            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              aria-label="Sign in with Google"
              disabled={loading}
              className="w-full flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-100 text-black font-semibold py-3 rounded-md shadow-sm transition disabled:cursor-not-allowed"
            >
              <img src="/google.svg" alt="Google logo" className="h-5 w-5 mr-2" />
              Sign in with Google
            </button>

            <div className="flex flex-col items-center mt-4 space-y-1 text-sm">
              <Link href="/auth/forgot-password" className="text-blue-500 hover:underline">
                Forgot Password?
              </Link>
              <p>
                Don&apos;t have an account?{" "}
                <Link href="/auth/signup" className="text-blue-500 hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
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