import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-800">
          News Aggregator
        </Link>

        <div className="flex items-center space-x-4">
          {session ? (
            <>
              <span className="text-gray-700 font-medium">{session.user.name}</span>
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border border-gray-300"
                />
              )}
              <button
                onClick={() => signOut()}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition">
                Sign In
              </Link>
              <Link href="/auth/signup" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}