import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc
} from "firebase/firestore";

function Home() {
  const navigate = useNavigate();

  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredBook, setHoveredBook] = useState(null);
  const hoverTimer = useRef(null);

  // 🌓 DARK MODE STATE (Persisted in localStorage)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("pageverse-theme") === "dark";
  });

  // Sync theme with localStorage
  useEffect(() => {
    localStorage.setItem("pageverse-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // 1. 🔥 SPLIT & CLEAN GENRES FOR DROPDOWN
  const genres = useMemo(() => {
    const allIndividualGenres = [];

    books.forEach((book) => {
      if (book.genre) {
        const splitParts = book.genre.split("/").map((g) => g.trim());
        allIndividualGenres.push(...splitParts);
      }
    });

    const uniqueGenres = [...new Set(allIndividualGenres)].filter(Boolean);
    return ["All", ...uniqueGenres];
  }, [books]);

  const fetchBooks = async () => {
    try {
      const snap = await getDocs(collection(db, "books"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBooks(list);
    } catch (error) {
      console.error("fetchBooks error:", error);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    if (books.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBook((prev) => (prev + 1) % books.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [books]);

  // 2. 🔍 FILTER LOGIC TO MATCH INDIVIDUAL SUB-GENRES
  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      (book.genre && book.genre.toLowerCase().includes(search.toLowerCase()));
    
    const bookGenresArray = book.genre ? book.genre.split("/").map((g) => g.trim()) : [];
    const matchesGenre =
      selectedGenre === "All" || bookGenresArray.includes(selectedGenre);

    return matchesSearch && matchesGenre;
  });

  const addToCart = async (book) => {
    try {
      const user = auth.currentUser;
      if (!user) { alert("Please login first"); return; }
      await addDoc(collection(db, "users", user.uid, "cart"), {
        title: book.title,
        price: book.price,
        genre: book.genre,
        image: book.image,
        addedAt: new Date(),
      });
      alert(`${book.title} added to cart`);
    } catch (error) {
      console.log(error);
      alert("Failed to add to cart");
    }
  };

  const handleMouseEnter = (book) => {
    hoverTimer.current = setTimeout(() => {
      setHoveredBook(book);
    }, 1000);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    setHoveredBook(null);
  };

  return (
    <div 
      style={{ 
        minHeight: "100vh", 
        backgroundColor: darkMode ? "#0f172a" : "#bfdbfe",
        transition: "background-color 0.3s ease"
      }}
    >

      {/* NAVBAR */}
      <div
        style={{
          width: "100%",
          backgroundColor: darkMode ? "#1e293b" : "#1e3a8a",
          padding: "18px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
          borderBottom: darkMode ? "1px solid #334155" : "none",
          transition: "background-color 0.3s ease"
        }}
      >
        {/* BRAND & TOGGLE WRAPPER */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <h1 style={{ color: "white", margin: 0, fontSize: "30px" }}>
            PageVerse 📚
          </h1>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              backgroundColor: darkMode ? "#334155" : "#3b82f6",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        <input
          type="text"
          placeholder="Search books or genres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "320px",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "none",
            outline: "none",
            backgroundColor: darkMode ? "#334155" : "white",
            color: darkMode ? "white" : "#1e293b",
            fontSize: "15px",
            fontWeight: "500",
            transition: "all 0.3s ease"
          }}
        />

        <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Categories ▼
            </button>

            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "35px",
                  right: 0,
                  backgroundColor: darkMode ? "#1e293b" : "white",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  zIndex: 100,
                  minWidth: "180px",
                  border: darkMode ? "1px solid #334155" : "none",
                }}
              >
                {genres.map((genre, index) => (
                  <div
                    key={index}
                    onClick={() => { setSelectedGenre(genre); setShowDropdown(false); }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      color: darkMode ? "#e2e8f0" : "#1e293b",
                      backgroundColor: selectedGenre === genre 
                        ? (darkMode ? "#334155" : "#eff6ff") 
                        : "transparent",
                      borderBottom: index !== genres.length - 1 
                        ? (darkMode ? "1px solid #334155" : "1px solid #e2e8f0") 
                        : "none",
                    }}
                  >
                    {genre}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => navigate("/cart")} style={{ background: "none", border: "none", color: "white", fontSize: "16px", cursor: "pointer" }}>
            Cart
          </button>

          <button onClick={() => navigate("/profile")} style={{ background: "none", border: "none", color: "white", fontSize: "16px", cursor: "pointer" }}>
            Profile
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: "flex", padding: "40px", gap: "30px", alignItems: "flex-start" }}>

        {/* LEFT SECTION */}
        <div style={{ flex: 1 }}>
          <h2 style={{ color: darkMode ? "#60a5fa" : "#1e40af", marginBottom: "25px" }}>Available Books</h2>

          {filteredBooks.length === 0 ? (
            <p style={{ color: darkMode ? "#94a3b8" : "#334155", fontSize: "16px" }}>No books found.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  onMouseEnter={() => handleMouseEnter(book)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    backgroundColor: darkMode ? "#1e293b" : "white",
                    padding: "20px",
                    width: "220px",
                    borderRadius: "12px",
                    boxShadow: darkMode ? "0 4px 14px rgba(0,0,0,0.5)" : "0 4px 10px rgba(0,0,0,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "450px",
                    position: "relative",
                    cursor: "default",
                    boxSizing: "border-box",
                    border: darkMode ? "1px solid #334155" : "none",
                    transition: "transform 0.2s, background-color 0.3s ease"
                  }}
                >
                  <div>
                    <img
                      src={book.image}
                      alt={book.title}
                      style={{
                        width: "100%",
                        height: "260px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        marginBottom: "15px",
                      }}
                    />
                    <h3 style={{ color: darkMode ? "#f8fafc" : "#1e293b", marginBottom: "10px", fontSize: "16px" }}>{book.title}</h3>
                    <p style={{ color: darkMode ? "#60a5fa" : "#2563eb", fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>{book.genre}</p>
                    <p style={{ color: darkMode ? "#cbd5e1" : "#334155", marginBottom: "15px", fontWeight: "bold", fontSize: "14px" }}>{book.price}</p>
                  </div>

                  {/* CONDITIONAL STOCK CONTROL */}
                  {book.quantity === 0 ? (
                    <div
                      style={{
                        backgroundColor: darkMode ? "#334155" : "#cbd5e1",
                        color: darkMode ? "#94a3b8" : "#64748b",
                        padding: "10px",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontWeight: "bold",
                        width: "100%",
                        boxSizing: "border-box",
                        cursor: "not-allowed",
                        fontSize: "14px",
                        border: darkMode ? "1px solid #475569" : "1px solid #94a3b8"
                      }}
                    >
                      Out of Stock
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(book)}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "white",
                        border: "none",
                        padding: "10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        width: "100%",
                        fontWeight: "bold",
                        fontSize: "14px"
                      }}
                    >
                      Add to Cart
                    </button>
                  )}

                  {/* HOVER POPUP */}
                  {hoveredBook?.id === book.id && (
                    <div
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "240px",
                        width: "260px",
                        backgroundColor: darkMode ? "#0f172a" : "#1e293b",
                        borderRadius: "14px",
                        padding: "20px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        zIndex: 999,
                        color: "white",
                        border: darkMode ? "1px solid #334155" : "1px solid #475569",
                      }}
                    >
                      <h3 style={{ color: "#60a5fa", marginBottom: "10px", fontSize: "16px" }}>
                        {book.title}
                      </h3>

                      <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "6px" }}>
                        Genre: <span style={{ color: "white" }}>{book.genre}</span>
                      </p>

                      <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "6px" }}>
                        Price: <span style={{ color: "#4ade80", fontWeight: "bold" }}>{book.price}</span>
                      </p>

                      <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "6px" }}>
                        Availability:{" "}
                        <span style={{ color: book.quantity === 0 ? "#f87171" : "#fbbf24", fontWeight: "bold" }}>
                          {book.quantity === 0 ? "Out of Stock" : `${book.quantity} Left`}
                        </span>
                      </p>

                      <div
                        style={{
                          marginTop: "12px",
                          padding: "12px 0 0 0",
                          borderTop: "1px solid #334155",
                        }}
                      >
                        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "6px" }}>
                          Summary:
                        </p>
                        <p style={{ color: "#e2e8f0", fontSize: "13px", lineHeight: "1.6" }}>
                          {book.summary || "No summary available."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT DYNAMIC WIDGET */}
        {books.length > 0 && (
          <div
            style={{
              width: "280px",
              height: "700px",
              borderRadius: "20px",
              overflow: "hidden",
              position: "sticky",
              top: "20px",
              boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,0.6)" : "0 6px 18px rgba(0,0,0,0.3)",
              border: darkMode ? "1px solid #334155" : "none",
            }}
          >
            <img
              src={books[currentBook].image}
              alt={books[currentBook].title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "left",
                transition: "0.5s",
              }}
            />

            <div
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                padding: "20px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.92))",
                color: "white",
                boxSizing: "border-box",
              }}
            >
              <h2 style={{ marginBottom: "8px", fontSize: "28px", color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
                {books[currentBook].title}
              </h2>
              <p style={{ fontWeight: "bold", color: "#dbeafe", fontSize: "18px" }}>
                {books[currentBook].price}
              </p>
              <p style={{ marginTop: "8px", color: "#bfdbfe", fontWeight: "bold" }}>
                {books[currentBook].genre}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;