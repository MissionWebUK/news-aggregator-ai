//import "flowbite/dist/flowbite.css";  // ✅ Import Flowbite styles
import "../styles/globals.css";  // ✅ Import Tailwind (if used)
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react"; // ✅ Import NextAuth
import Navbar from "../components/Navbar";

function AuthButton() {
  const { data: session } = useSession();

  return session ? (
    <div>
      <span>Welcome, {session.user.email}</span>
      <button onClick={() => signOut()} className="ml-4 px-4 py-2 bg-red-500 text-white rounded">
        Sign Out
      </button>
    </div>
  ) : (
    <button onClick={() => signIn()} className="px-4 py-2 bg-blue-500 text-white rounded">
      Sign In
    </button>
  );
}

export default function MyApp({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <Navbar />
      <Component {...pageProps} />
      <AuthButton />
    </SessionProvider>
  );
}

