import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/router";

export default function SignIn() {
  const router = useRouter();
  const { error } = router.query;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Map specific NextAuth errors to friendlier messages
  const getFriendlyErrorMessage = (errorString) => {
    if (errorString === "CredentialsSignin") {
      return "Invalid credentials. Please check your email or password.";
    }
    // Fallback for any other error
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
      // Refine error message
      const friendlyMessage = getFriendlyErrorMessage(result.error);
      setLoading(false);
      router.push(`/auth/signin?error=${encodeURIComponent(friendlyMessage)}`);
    } else {
      router.push("/dashboard"); // Redirect to dashboard on success
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
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
          <a href="/auth/forgot-password" className="text-blue-500 hover:underline">
            Forgot Password?
          </a>
          <p>
            Don&apos;t have an account?{" "}
            <a href="/auth/signup" className="text-blue-500 hover:underline">
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}