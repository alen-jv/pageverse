import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch role from Firestore
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          setRole(snap.data().role);
        }
      } else {
        setUser(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw", // Explicitly ensure full screen width
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "24px",
          fontWeight: "bold",
          backgroundColor: "#dbeafe",
          color: "#1e3a8a",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <BrowserRouter>
        <Routes>
          {/* LOGIN */}
          <Route
            path="/"
            element={
              !user ? (
                <Login />
              ) : role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <Navigate to="/home" />
              )
            }
          />

          {/* HOME */}
          <Route
            path="/home"
            element={user ? <Home /> : <Navigate to="/" />}
          />

          {/* CART */}
          <Route
            path="/cart"
            element={user ? <Cart /> : <Navigate to="/" />}
          />

          {/* PROFILE */}
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/" />}
          />

          {/* ADMIN */}
          <Route
            path="/admin"
            element={user ? <AdminDashboard /> : <Navigate to="/" />}
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;