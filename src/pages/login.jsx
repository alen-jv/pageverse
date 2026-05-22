import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import { auth, db } from "../firebase";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

function Login() {
  const navigate = useNavigate();

  // 🔥 Initialized as an empty array — no hardcoded URLs here anymore
  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(0);
  const [fade, setFade] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [invalidLogin, setInvalidLogin] = useState(false);

  // Fetch dynamic background books from Firestore on mount
  useEffect(() => {
    const fetchBackgroundBooks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "books"));
        const fetchedBooks = querySnapshot.docs
          .map((doc) => doc.data())
          .filter((data) => data.image); // Safety check: ensures image field exists

        if (fetchedBooks.length > 0) {
          setBooks(fetchedBooks);
        }
      } catch (error) {
        console.error("Error loading dynamic backgrounds from Firestore:", error);
      }
    };

    fetchBackgroundBooks();
  }, []);

  // Background slider interval
  useEffect(() => {
    if (books.length === 0) return; // Don't start interval if no books are loaded yet

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentBook((prev) => (prev + 1) % books.length);
        setFade(true);
      }, 900);
    }, 5000);

    return () => clearInterval(interval);
  }, [books]);

  // 🔐 LOGIN
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // check role
      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists() && snap.data().role === "admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } catch (error) {
      console.log(error);
      setInvalidLogin(true);
    }
  };

  // 🔐 SIGNUP
  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // create user document
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "user",
        createdAt: new Date(),
      });

      navigate("/home");
    } catch (error) {
      console.log(error);
      alert(error.message);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0f172a", // 🔥 Added dark placeholder background while images load
      }}
    >
      {/* BACKGROUND */}
      {books.length > 0 && books[currentBook] && (
        <img
          src={books[currentBook].image}
          alt="background"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: fade ? 1 : 0,
            transition: "opacity 1.8s ease-in-out, transform 5s ease",
            transform: "scale(1.08)",
            filter: "brightness(0.42)",
          }}
        />
      )}

      {/* OVERLAY */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.30)",
        }}
      />

      {/* PAGEVERSE TITLE */}
      <div
        style={{
          position: "absolute",
          top: "6%",
          textAlign: "center",
          width: "100%",
          zIndex: 2,
        }}
      >
        <div style={{ fontSize: "88px", color: "white" }}>📚</div>
        <div
          style={{
            fontSize: "60px",
            color: "white",
            fontWeight: "bold",
            letterSpacing: "7px",
          }}
        >
          PageVerse
        </div>
      </div>

      {/* LOGIN BOX */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          background: "rgba(59,130,246,0.08)",
          backdropFilter: "blur(10px)",
          padding: "18px 28px",
          borderRadius: "18px",
          width: "300px",
          border: "1px solid rgba(255,255,255,0.16)",
        }}
      >
        <h2 style={{ color: "white", textAlign: "center" }}>
          {isSignup ? "Create Account" : "Login"}
        </h2>

        {invalidLogin ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#fecaca" }}>
              Invalid Email or Password
            </p>

            <button
              onClick={() => setInvalidLogin(false)}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#1e40af",
                color: "white",
                borderRadius: "8px",
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "11px",
                marginBottom: "12px",
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "11px",
                marginBottom: "16px",
              }}
            />

            <button
              onClick={isSignup ? handleSignup : handleLogin}
              style={{
                width: "100%",
                padding: "11px",
                backgroundColor: "#1e40af",
                color: "white",
                borderRadius: "8px",
              }}
            >
              {isSignup ? "Create Account" : "Login"}
            </button>

            <p style={{ color: "white", textAlign: "center" }}>
              {isSignup ? "Already have an account?" : "New user?"}{" "}
              <span
                onClick={() => setIsSignup(!isSignup)}
                style={{ color: "#bfdbfe", cursor: "pointer" }}
              >
                {isSignup ? "Login" : "Register"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;