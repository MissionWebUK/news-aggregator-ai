//import "flowbite/dist/flowbite.css";  // ✅ Import Flowbite styles
import "../styles/globals.css";  // ✅ Import Tailwind (if used)

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}