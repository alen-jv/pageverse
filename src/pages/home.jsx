import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  onSnapshot
} from "firebase/firestore";

function Home() {
  const navigate = useNavigate();

  // Responsive width tracking
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1080;

  // State
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBook, setCurrentBook] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const [cartCount, setCartCount] = useState(0);
  const [addingId, setAddingId] = useState(null);
  const [selectedModalBook, setSelectedModalBook] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // 🌓 Dark mode state persisted in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("pageverse-theme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("pageverse-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Toast notification helper
  const showToast = useCallback((message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // Real-time cart count listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = collection(db, "users", user.uid, "cart");
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const validDocs = snap.docs.filter((d) => d.id !== "_init");
          setCartCount(validDocs.length);
        },
        (error) => console.log("Cart count error:", error)
      );
      return () => unsubscribe();
    } catch (e) {
      console.log(e);
    }
  }, []);

  // Fetch Books from Firestore
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "books"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBooks(list);
    } catch (error) {
      console.error("fetchBooks error:", error);
      showToast("Unable to load books. Please check your connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Spotlight carousel auto-advance
  useEffect(() => {
    if (books.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBook((prev) => (prev + 1) % books.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [books.length]);

  // Keyboard escape closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedModalBook(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Clean and unique genres list
  const genres = useMemo(() => {
    const allIndividualGenres = [];
    books.forEach((book) => {
      if (book.genre) {
        const splitParts = book.genre.split("/").map((g) => g.trim());
        allIndividualGenres.push(...splitParts);
      }
    });
    const unique = [...new Set(allIndividualGenres)].filter(Boolean);
    return ["All", ...unique];
  }, [books]);

  // Price parser for sorting
  const parsePrice = (priceVal) => {
    if (typeof priceVal === "number") return priceVal;
    if (!priceVal) return 0;
    const num = parseFloat(String(priceVal).replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = books.filter((book) => {
      const matchesSearch =
        !q ||
        (book.title && book.title.toLowerCase().includes(q)) ||
        (book.genre && book.genre.toLowerCase().includes(q)) ||
        (book.summary && book.summary.toLowerCase().includes(q));

      const bookGenresArray = book.genre
        ? book.genre.split("/").map((g) => g.trim())
        : [];
      const matchesGenre =
        selectedGenre === "All" || bookGenresArray.includes(selectedGenre);

      return matchesSearch && matchesGenre;
    });

    if (sortBy === "price-low") {
      result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (sortBy === "title") {
      result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    return result;
  }, [books, search, selectedGenre, sortBy]);

  // Add to cart with smooth toast feedback
  const addToCart = async (book, e) => {
    if (e) e.stopPropagation();
    try {
      const user = auth.currentUser;
      if (!user) {
        showToast("Please log in first to add books to your cart", "warning");
        return;
      }
      setAddingId(book.id);
      await addDoc(collection(db, "users", user.uid, "cart"), {
        title: book.title,
        price: book.price,
        genre: book.genre,
        image: book.image,
        addedAt: new Date(),
      });
      showToast(`"${book.title}" added to your cart!`, "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to add book to cart. Please try again.", "error");
    } finally {
      setAddingId(null);
    }
  };

  // Theme palettes
  const theme = {
    bg: darkMode ? "#090d16" : "#f1f5f9",
    pageText: darkMode ? "#f8fafc" : "#0f172a",
    subText: darkMode ? "#94a3b8" : "#475569",
    navBg: darkMode ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.92)",
    navBorder: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    heroBg: darkMode
      ? "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #172554 100%)"
      : "linear-gradient(135deg, #dbeafe 0%, #eff6ff 50%, #e0e7ff 100%)",
    heroBorder: darkMode ? "1px solid rgba(99, 102, 241, 0.2)" : "1px solid rgba(191, 219, 254, 0.8)",
    cardBg: darkMode ? "#111827" : "#ffffff",
    cardBorder: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
    cardShadow: darkMode
      ? "0 4px 20px rgba(0, 0, 0, 0.45)"
      : "0 4px 18px rgba(30, 41, 59, 0.08)",
    inputBg: darkMode ? "#1f2937" : "#ffffff",
    inputBorder: darkMode ? "1px solid #374151" : "1px solid #cbd5e1",
    accent: "#3b82f6",
    accentGradient: "linear-gradient(135deg, #2563eb, #3b82f6)",
    accentHover: "linear-gradient(135deg, #1d4ed8, #2563eb)",
    chipBg: darkMode ? "#1e293b" : "#e2e8f0",
    chipActiveBg: "#2563eb",
    chipText: darkMode ? "#cbd5e1" : "#334155",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.pageText,
        transition: "background-color 0.3s ease, color 0.3s ease",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {/* INJECT ANIMATION KEYFRAMES */}
      <style>{`
        @keyframes toastIn {
          from { transform: translateY(-20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmerPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.95; }
        }
        .book-card-item {
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease, border-color 0.28s ease;
        }
        .book-card-item:hover {
          transform: translateY(-7px);
        }
        .book-img-zoom {
          transition: transform 0.4s ease;
        }
        .book-card-item:hover .book-img-zoom {
          transform: scale(1.05);
        }
        .action-btn-hover:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }
        .action-btn-hover:active {
          transform: translateY(0);
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.4);
          border-radius: 4px;
        }
      `}</style>

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            borderRadius: "14px",
            backgroundColor:
              toast.type === "success"
                ? "#065f46"
                : toast.type === "error"
                ? "#991b1b"
                : "#854d0e",
            color: "#ffffff",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
            animation: "toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            fontSize: "14px",
            fontWeight: 500,
            maxWidth: "380px"
          }}
        >
          <span style={{ fontSize: "18px" }}>
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "⚠️"}
          </span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.8)",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 0 0 6px"
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* NAVBAR */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: theme.navBg,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: `1px solid ${theme.navBorder}`,
          padding: isMobile ? "12px 18px" : "14px 40px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: isMobile ? "12px" : "24px",
          transition: "all 0.3s ease"
        }}
      >
        {/* Brand & Theme Switch */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div
            onClick={() => { setSearch(""); setSelectedGenre("All"); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              userSelect: "none"
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: theme.accentGradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
                fontSize: "20px"
              }}
            >
              📖
            </div>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                background: darkMode
                  ? "linear-gradient(90deg, #ffffff, #93c5fd)"
                  : "linear-gradient(90deg, #1e3a8a, #2563eb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              PageVerse
            </span>
          </div>

          {/* Theme Switch Pill */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle Light / Dark mode"
            style={{
              backgroundColor: darkMode ? "#1e293b" : "#e2e8f0",
              color: darkMode ? "#f8fafc" : "#1e293b",
              border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
              padding: "6px 12px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Global Search Bar */}
        <div
          style={{
            flex: isMobile ? "none" : "1",
            maxWidth: isMobile ? "100%" : "440px",
            position: "relative",
            display: "flex",
            alignItems: "center"
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "14px",
              color: theme.subText,
              pointerEvents: "none",
              fontSize: "15px"
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search books, authors, genres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 38px 10px 40px",
              borderRadius: "12px",
              border: theme.inputBorder,
              backgroundColor: theme.inputBg,
              color: theme.pageText,
              fontSize: "14px",
              fontWeight: 500,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease"
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = darkMode ? "#374151" : "#cbd5e1")}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: "12px",
                background: "none",
                border: "none",
                color: theme.subText,
                cursor: "pointer",
                fontSize: "14px",
                padding: "4px"
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isMobile ? "space-between" : "flex-end",
            gap: "12px"
          }}
        >
          {/* Cart Button with Real-time Count Badge */}
          <button
            onClick={() => navigate("/cart")}
            className="action-btn-hover"
            style={{
              position: "relative",
              backgroundColor: darkMode ? "#1e293b" : "#e0e7ff",
              color: darkMode ? "#f8fafc" : "#1e40af",
              border: darkMode ? "1px solid #334155" : "1px solid #c7d2fe",
              padding: "9px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease"
            }}
          >
            <span>🛒 Cart</span>
            {cartCount > 0 && (
              <span
                style={{
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "10px",
                  minWidth: "16px",
                  textAlign: "center"
                }}
              >
                {cartCount}
              </span>
            )}
          </button>

          {/* Profile Button */}
          <button
            onClick={() => navigate("/profile")}
            className="action-btn-hover"
            style={{
              backgroundColor: darkMode ? "#1e293b" : "#f1f5f9",
              color: darkMode ? "#f8fafc" : "#1e293b",
              border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
              padding: "9px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            <span>👤 Profile</span>
          </button>
        </div>
      </header>

      {/* HERO BANNER */}
      <section
        style={{
          margin: isMobile ? "12px" : "24px 40px 16px 40px",
          padding: isMobile ? "24px 18px" : "40px 48px",
          background: theme.heroBg,
          borderRadius: "24px",
          border: theme.heroBorder,
          position: "relative",
          overflow: "hidden",
          boxShadow: darkMode ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 30px rgba(59,130,246,0.12)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "28px"
        }}
      >
        <div style={{ maxWidth: isMobile ? "100%" : "640px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: darkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.1)",
              color: darkMode ? "#93c5fd" : "#1d4ed8",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "14px"
            }}
          >
            ✨ The Modern Online Bookstore
          </div>

          <h1
            style={{
              fontSize: isMobile ? "28px" : "42px",
              lineHeight: 1.18,
              fontWeight: 800,
              letterSpacing: "-1px",
              margin: "0 0 14px 0",
              color: darkMode ? "#f8fafc" : "#0f172a"
            }}
          >
            Discover Your Next Favorite Book at PageVerse
          </h1>

          <p
            style={{
              fontSize: isMobile ? "14px" : "16px",
              lineHeight: 1.6,
              color: theme.subText,
              margin: "0 0 24px 0",
              fontWeight: 400
            }}
          >
            Explore our curated selection of thrillers, fantasy epics, heartwarming fiction,
            and insightful non-fiction. Real-time stock, instant checkout, and seamless reading.
          </p>

          {/* Quick stats / Highlights */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: isMobile ? "12px" : "20px",
              fontSize: "13px",
              fontWeight: 600,
              color: darkMode ? "#cbd5e1" : "#334155"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📚</span> {books.length} Titles in Library
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚡</span> Fast Delivery
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🔒</span> Verified Transactions
            </div>
          </div>
        </div>

        {/* Hero Visual Pill / Right Spotlight preview */}
        {books.length > 0 && (
          <div
            onClick={() => setSelectedModalBook(books[currentBook])}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              backgroundColor: darkMode ? "rgba(17, 24, 39, 0.75)" : "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(12px)",
              padding: "16px",
              borderRadius: "18px",
              border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.06)",
              cursor: "pointer",
              maxWidth: "340px",
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              transition: "transform 0.2s ease"
            }}
            title="Click to view featured book details"
          >
            <img
              src={books[currentBook].image}
              alt={books[currentBook].title}
              style={{
                width: "74px",
                height: "106px",
                objectFit: "cover",
                borderRadius: "10px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.25)"
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#3b82f6",
                  textTransform: "uppercase"
                }}
              >
                Featured Pick
              </span>
              <h4
                style={{
                  margin: "4px 0",
                  fontSize: "15px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: theme.pageText
                }}
              >
                {books[currentBook].title}
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#10b981"
                }}
              >
                {books[currentBook].price}
              </p>
              <span
                style={{
                  display: "inline-block",
                  marginTop: "6px",
                  fontSize: "12px",
                  color: darkMode ? "#93c5fd" : "#2563eb",
                  fontWeight: 600
                }}
              >
                Quick View →
              </span>
            </div>
          </div>
        )}
      </section>

      {/* FILTER & GENRE CHIPS BAR */}
      <section
        style={{
          padding: isMobile ? "0 14px 14px 14px" : "0 40px 16px 40px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: "14px"
        }}
      >
        {/* Horizontal Genre Chips */}
        <div
          className="custom-scrollbar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "6px",
            flex: 1
          }}
        >
          {genres.map((genre) => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                style={{
                  whiteSpace: "nowrap",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isActive
                    ? "none"
                    : darkMode
                    ? "1px solid #334155"
                    : "1px solid #cbd5e1",
                  backgroundColor: isActive
                    ? theme.chipActiveBg
                    : darkMode
                    ? "#1e293b"
                    : "#ffffff",
                  color: isActive ? "#ffffff" : theme.chipText,
                  boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                  transition: "all 0.2s ease"
                }}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
          <label
            htmlFor="sort-select"
            style={{ fontSize: "13px", fontWeight: 600, color: theme.subText }}
          >
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: theme.inputBorder,
              backgroundColor: theme.inputBg,
              color: theme.pageText,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="title">Alphabetical: A-Z</option>
          </select>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main
        style={{
          display: "flex",
          flexDirection: isMobile || isTablet ? "column" : "row",
          padding: isMobile ? "12px 14px 40px 14px" : "10px 40px 60px 40px",
          gap: "28px",
          alignItems: "flex-start",
          flex: 1
        }}
      >
        {/* LEFT / CENTER: BOOKS GRID */}
        <div style={{ flex: 1, width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px"
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                margin: 0,
                color: darkMode ? "#f8fafc" : "#1e293b"
              }}
            >
              {selectedGenre === "All" ? "Available Books" : `${selectedGenre} Titles`}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: theme.subText,
                  marginLeft: "10px"
                }}
              >
                ({filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"})
              </span>
            </h2>

            {(search || selectedGenre !== "All") && (
              <button
                onClick={() => { setSearch(""); setSelectedGenre("All"); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Reset filters
              </button>
            )}
          </div>

          {/* SKELETON LOADING STATE */}
          {loading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(auto-fill, minmax(150px, 1fr))"
                  : "repeat(auto-fill, minmax(210px, 1fr))",
                gap: "20px"
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: theme.cardBg,
                    border: theme.cardBorder,
                    borderRadius: "16px",
                    padding: "16px",
                    height: "390px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    animation: "shimmerPulse 1.5s infinite ease-in-out"
                  }}
                >
                  <div
                    style={{
                      height: "230px",
                      borderRadius: "10px",
                      backgroundColor: darkMode ? "#1f2937" : "#e2e8f0"
                    }}
                  />
                  <div
                    style={{
                      height: "18px",
                      borderRadius: "6px",
                      width: "80%",
                      backgroundColor: darkMode ? "#1f2937" : "#e2e8f0"
                    }}
                  />
                  <div
                    style={{
                      height: "14px",
                      borderRadius: "6px",
                      width: "50%",
                      backgroundColor: darkMode ? "#1f2937" : "#e2e8f0"
                    }}
                  />
                  <div
                    style={{
                      height: "36px",
                      borderRadius: "8px",
                      marginTop: "auto",
                      backgroundColor: darkMode ? "#1f2937" : "#e2e8f0"
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && filteredBooks.length === 0 && (
            <div
              style={{
                backgroundColor: theme.cardBg,
                border: theme.cardBorder,
                borderRadius: "20px",
                padding: "60px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "14px",
                boxShadow: theme.cardShadow
              }}
            >
              <span style={{ fontSize: "52px" }}>🔍</span>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: theme.pageText }}>
                No books match your criteria
              </h3>
              <p style={{ margin: 0, color: theme.subText, fontSize: "14px", maxWidth: "400px" }}>
                We couldn't find any books matching your search or selected genre. Try searching
                for another title or clear your filters.
              </p>
              <button
                onClick={() => { setSearch(""); setSelectedGenre("All"); }}
                className="action-btn-hover"
                style={{
                  marginTop: "8px",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* BOOKS GRID */}
          {!loading && filteredBooks.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(auto-fill, minmax(160px, 1fr))"
                  : "repeat(auto-fill, minmax(215px, 1fr))",
                gap: isMobile ? "16px" : "22px"
              }}
            >
              {filteredBooks.map((book) => {
                const isOutOfStock = book.quantity === 0;
                const isAdding = addingId === book.id;

                return (
                  <div
                    key={book.id}
                    className="book-card-item"
                    onClick={() => setSelectedModalBook(book)}
                    style={{
                      backgroundColor: theme.cardBg,
                      border: theme.cardBorder,
                      borderRadius: "16px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: theme.cardShadow,
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    {/* Top Image Container */}
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: isMobile ? "210px" : "260px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        backgroundColor: darkMode ? "#1e293b" : "#e2e8f0",
                        marginBottom: "14px"
                      }}
                    >
                      <img
                        src={book.image}
                        alt={book.title}
                        className="book-img-zoom"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block"
                        }}
                        loading="lazy"
                      />

                      {/* Genre Pill Tag */}
                      {book.genre && (
                        <div
                          style={{
                            position: "absolute",
                            top: "8px",
                            left: "8px",
                            backgroundColor: "rgba(15, 23, 42, 0.75)",
                            backdropFilter: "blur(6px)",
                            color: "#93c5fd",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}
                        >
                          {book.genre.split("/")[0].trim()}
                        </div>
                      )}

                      {/* Stock Status Badge */}
                      <div
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          backgroundColor: isOutOfStock
                            ? "rgba(220, 38, 38, 0.9)"
                            : "rgba(16, 185, 129, 0.9)",
                          backdropFilter: "blur(6px)",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "6px"
                        }}
                      >
                        {isOutOfStock ? "Sold Out" : `${book.quantity || "In"} Stock`}
                      </div>
                    </div>

                    {/* Book Metadata */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", marginBottom: "14px" }}>
                      <h3
                        title={book.title}
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          margin: "0 0 6px 0",
                          color: theme.pageText,
                          lineHeight: 1.35,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: "40px"
                        }}
                      >
                        {book.title}
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          marginTop: "auto"
                        }}
                      >
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            color: darkMode ? "#4ade80" : "#15803d"
                          }}
                        >
                          {book.price}
                        </span>

                        <span
                          style={{
                            fontSize: "11px",
                            color: theme.subText,
                            fontWeight: 500
                          }}
                        >
                          Click for preview
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {isOutOfStock ? (
                      <div
                        style={{
                          backgroundColor: darkMode ? "#1e293b" : "#f1f5f9",
                          color: darkMode ? "#64748b" : "#94a3b8",
                          border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                          padding: "10px",
                          borderRadius: "10px",
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "not-allowed"
                        }}
                      >
                        Out of Stock
                      </div>
                    ) : (
                      <button
                        onClick={(e) => addToCart(book, e)}
                        disabled={isAdding}
                        className="action-btn-hover"
                        style={{
                          background: theme.accentGradient,
                          color: "#ffffff",
                          border: "none",
                          padding: "10px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: isAdding ? "wait" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                          opacity: isAdding ? 0.75 : 1
                        }}
                      >
                        <span>🛒</span>
                        <span>{isAdding ? "Adding..." : "Add to Cart"}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT SPOTLIGHT WIDGET (DESKTOP) */}
        {!isMobile && !isTablet && books.length > 0 && (
          <aside
            style={{
              width: "310px",
              position: "sticky",
              top: "90px",
              backgroundColor: theme.cardBg,
              border: theme.cardBorder,
              borderRadius: "22px",
              padding: "20px",
              boxShadow: theme.cardShadow,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: "#3b82f6"
                }}
              >
                ⭐ Staff Spotlight
              </span>

              {/* Prev / Next controls */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setCurrentBook((prev) => (prev - 1 + books.length) % books.length)}
                  title="Previous spotlight"
                  style={{
                    background: darkMode ? "#1e293b" : "#f1f5f9",
                    border: "none",
                    borderRadius: "6px",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                    color: theme.pageText,
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ◀
                </button>
                <button
                  onClick={() => setCurrentBook((prev) => (prev + 1) % books.length)}
                  title="Next spotlight"
                  style={{
                    background: darkMode ? "#1e293b" : "#f1f5f9",
                    border: "none",
                    borderRadius: "6px",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                    color: theme.pageText,
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Spotlight Book Image */}
            <div
              onClick={() => setSelectedModalBook(books[currentBook])}
              style={{
                position: "relative",
                width: "100%",
                height: "360px",
                borderRadius: "14px",
                overflow: "hidden",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.25)"
              }}
            >
              <img
                src={books[currentBook].image}
                alt={books[currentBook].title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "opacity 0.4s ease"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "18px 16px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
                  color: "#ffffff"
                }}
              >
                <p style={{ fontSize: "12px", color: "#93c5fd", fontWeight: 700, margin: "0 0 4px 0" }}>
                  {books[currentBook].genre}
                </p>
                <h3
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "18px",
                    fontWeight: 800,
                    lineHeight: 1.25,
                    color: "#ffffff"
                  }}
                >
                  {books[currentBook].title}
                </h3>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#4ade80", margin: 0 }}>
                  {books[currentBook].price}
                </p>
              </div>
            </div>

            {/* Spotlight Synopsis Teaser */}
            {books[currentBook].summary && (
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: theme.subText,
                  margin: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {books[currentBook].summary}
              </p>
            )}

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
              <button
                onClick={() => setSelectedModalBook(books[currentBook])}
                className="action-btn-hover"
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: darkMode ? "#1e293b" : "#f1f5f9",
                  color: theme.pageText,
                  border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Details
              </button>

              <button
                onClick={(e) => addToCart(books[currentBook], e)}
                disabled={books[currentBook].quantity === 0 || addingId === books[currentBook].id}
                className="action-btn-hover"
                style={{
                  flex: 1.4,
                  padding: "10px",
                  borderRadius: "10px",
                  background: theme.accentGradient,
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: books[currentBook].quantity === 0 ? "not-allowed" : "pointer",
                  opacity: books[currentBook].quantity === 0 ? 0.6 : 1
                }}
              >
                {books[currentBook].quantity === 0 ? "Sold Out" : "Add to Cart"}
              </button>
            </div>
          </aside>
        )}
      </main>

      {/* QUICK VIEW DETAILS MODAL */}
      {selectedModalBook && (
        <div
          onClick={() => setSelectedModalBook(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.cardBg,
              color: theme.pageText,
              borderRadius: "24px",
              border: theme.cardBorder,
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              animation: "modalFadeIn 0.22s ease-out",
              position: "relative",
              padding: isMobile ? "20px" : "32px",
              boxSizing: "border-box"
            }}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedModalBook(null)}
              style={{
                position: "absolute",
                top: "18px",
                right: "18px",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                backgroundColor: darkMode ? "#1f2937" : "#e2e8f0",
                border: "none",
                color: theme.pageText,
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "24px",
                alignItems: isMobile ? "center" : "flex-start"
              }}
            >
              {/* Cover Image in Modal */}
              <img
                src={selectedModalBook.image}
                alt={selectedModalBook.title}
                style={{
                  width: isMobile ? "180px" : "210px",
                  height: isMobile ? "260px" : "310px",
                  objectFit: "cover",
                  borderRadius: "14px",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.3)"
                }}
              />

              {/* Book Details */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {selectedModalBook.genre && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#3b82f6",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "6px"
                    }}
                  >
                    {selectedModalBook.genre}
                  </span>
                )}

                <h2
                  style={{
                    fontSize: isMobile ? "20px" : "24px",
                    fontWeight: 800,
                    margin: "0 0 10px 0",
                    color: theme.pageText,
                    lineHeight: 1.25
                  }}
                >
                  {selectedModalBook.title}
                </h2>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    marginBottom: "16px"
                  }}
                >
                  <span
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: darkMode ? "#4ade80" : "#15803d"
                    }}
                  >
                    {selectedModalBook.price}
                  </span>

                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor:
                        selectedModalBook.quantity === 0
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(16, 185, 129, 0.15)",
                      color: selectedModalBook.quantity === 0 ? "#ef4444" : "#10b981"
                    }}
                  >
                    {selectedModalBook.quantity === 0
                      ? "Out of Stock"
                      : `${selectedModalBook.quantity} Copies Available`}
                  </span>
                </div>

                {/* Synopsis */}
                <div style={{ marginBottom: "24px" }}>
                  <h4
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: theme.subText,
                      margin: "0 0 6px 0"
                    }}
                  >
                    Synopsis
                  </h4>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.65,
                      color: theme.subText,
                      margin: 0
                    }}
                  >
                    {selectedModalBook.summary || "No summary provided for this title yet."}
                  </p>
                </div>

                {/* Modal CTA Buttons */}
                <div style={{ display: "flex", gap: "12px", marginTop: "auto" }}>
                  <button
                    onClick={() => {
                      addToCart(selectedModalBook);
                    }}
                    disabled={selectedModalBook.quantity === 0 || addingId === selectedModalBook.id}
                    className="action-btn-hover"
                    style={{
                      flex: 1,
                      padding: "12px 20px",
                      borderRadius: "12px",
                      background: theme.accentGradient,
                      color: "#ffffff",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: selectedModalBook.quantity === 0 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                      opacity: selectedModalBook.quantity === 0 ? 0.6 : 1
                    }}
                  >
                    <span>🛒</span>
                    <span>
                      {selectedModalBook.quantity === 0
                        ? "Sold Out"
                        : addingId === selectedModalBook.id
                        ? "Adding..."
                        : "Add to Cart"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer
        style={{
          borderTop: `1px solid ${theme.navBorder}`,
          backgroundColor: theme.navBg,
          padding: isMobile ? "24px 18px" : "28px 40px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          color: theme.subText,
          fontSize: "13px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📖</span>
          <span style={{ fontWeight: 700, color: theme.pageText }}>PageVerse</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div style={{ display: "flex", gap: "18px" }}>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/home")}>Books</span>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/cart")}>Cart</span>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/profile")}>Profile</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;
