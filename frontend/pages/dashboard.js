import { getSession, useSession } from "next-auth/react"; // ✅ Fixed missing useSession import
import { useEffect } from "react";
import { useDarkMode } from "../context/DarkModeContext"; // ✅ Use global Dark Mode context

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
  const { data: session } = useSession(); // ✅ Use session from NextAuth
  const { darkMode, setDarkMode } = useDarkMode(); // ✅ Use global dark mode state

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
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {session?.user?.name || "User"}!</p>
      
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
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
    </div>
  );
}