import "../styles/globals.css"; // ✅ Import Tailwind (if used)
import { SessionProvider } from "next-auth/react"; // ✅ Import NextAuth
import Navbar from "../components/Navbar"; 
import { DarkModeProvider } from "../context/DarkModeContext"; // ✅ Import Dark Mode Context

export default function MyApp({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <DarkModeProvider>
        <Navbar /> {/* ✅ Navbar now correctly wrapped in DarkModeProvider */}
        <Component {...pageProps} />
      </DarkModeProvider>
    </SessionProvider>
  );
}
