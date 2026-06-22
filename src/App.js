import "@/App.css";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/pages/AuthPage";
import BoardPage from "@/pages/BoardPage";
import { Loader2 } from "lucide-react";

function Gate() {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#d97706]" />
      </div>
    );
  }
  return user ? <BoardPage /> : <AuthPage />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Gate />
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 600,
              border: "2.5px solid #1c1917",
              borderRadius: "16px",
            },
          }}
        />
      </AuthProvider>
    </div>
  );
}

export default App;
