import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [editingSummary, setEditingSummary] = useState(null);
  const [summaryInput, setSummaryInput] = useState("");
  
  // New states for editing book quantity inline
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [quantityInput, setQuantityInput] = useState("");

  const [newBook, setNewBook] = useState({
    title: "",
    price: "",
    genre: "",
    image: "",
    summary: "",
    quantity: "", // Added quantity field
  });

  const usersRef = collection(db, "users");
  const booksRef = collection(db, "books");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(usersRef);
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          try {
            const cartSnap = await getDocs(collection(db, "users", d.id, "cart"));
            const cartCount = cartSnap.docs.length;
            return { id: d.id, ...d.data(), cartCount };
          } catch (err) {
            return { id: d.id, ...d.data(), cartCount: 0 };
          }
        })
      );
      setUsers(list);
    } catch (error) {
      console.error("fetchUsers error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async () => {
    setBooksLoading(true);
    try {
      const snap = await getDocs(booksRef);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBooks(list);
    } catch (error) {
      console.error("fetchBooks error:", error);
    } finally {
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBooks();
  }, []);

  const addBook = async () => {
    if (!newBook.title || !newBook.price || !newBook.genre || !newBook.image || !newBook.quantity) {
      alert("Please fill in all fields (including quantity)");
      return;
    }
    try {
      await addDoc(booksRef, {
        title: newBook.title,
        price: newBook.price,
        genre: newBook.genre,
        image: newBook.image,
        summary: newBook.summary || "",
        quantity: parseInt(newBook.quantity, 10) || 0, // Saved as a number
        addedAt: new Date(),
      });
      setNewBook({ title: "", price: "", genre: "", image: "", summary: "", quantity: "" });
      fetchBooks();
    } catch (error) {
      console.error("addBook error:", error);
      alert("Failed to add book");
    }
  };

  const removeBook = async (id) => {
    try {
      await deleteDoc(doc(db, "books", id));
      fetchBooks();
    } catch (error) {
      console.error("removeBook error:", error);
      alert("Failed to remove book");
    }
  };

  const saveSummary = async (id) => {
    try {
      await updateDoc(doc(db, "books", id), { summary: summaryInput });
      setEditingSummary(null);
      setSummaryInput("");
      fetchBooks();
    } catch (error) {
      console.error("saveSummary error:", error);
      alert("Failed to save summary");
    }
  };

  // 🔥 NEW: SAVE QUANTITY MODIFICATION
  const saveQuantity = async (id) => {
    try {
      await updateDoc(doc(db, "books", id), { quantity: parseInt(quantityInput, 10) || 0 });
      setEditingQuantity(null);
      setQuantityInput("");
      fetchBooks();
    } catch (error) {
      console.error("saveQuantity error:", error);
      alert("Failed to update quantity");
    }
  };

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const regularUsers = users.filter((u) => u.role !== "admin");

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "white",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white", padding: "30px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold" }}>⚙️ PageVerse Admin Panel</h1>
        <button
          onClick={logout}
          style={{ backgroundColor: "#dc2626", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}
        >
          Logout
        </button>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "30px" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px" }}>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>Total Users</p>
          <p style={{ fontSize: "36px", fontWeight: "bold", color: "#60a5fa" }}>{regularUsers.length}</p>
        </div>
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px" }}>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>Total Admins</p>
          <p style={{ fontSize: "36px", fontWeight: "bold", color: "#4ade80" }}>{users.filter((u) => u.role === "admin").length}</p>
        </div>
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px" }}>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>Total Books</p>
          <p style={{ fontSize: "36px", fontWeight: "bold", color: "#f59e0b" }}>{books.length}</p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab("users")}
          style={{ padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "15px", backgroundColor: activeTab === "users" ? "#2563eb" : "#1e293b", color: "white" }}
        >
          👥 Users
        </button>
        <button
          onClick={() => setActiveTab("books")}
          style={{ padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "15px", backgroundColor: activeTab === "books" ? "#2563eb" : "#1e293b", color: "white" }}
        >
          📚 Books
        </button>
      </div>

      {/* USERS TAB */}
      {activeTab === "users" && (
        <div style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "20px" }}>👥 Manage Users</h2>
          {loading ? (
            <p style={{ color: "#94a3b8" }}>Loading users...</p>
          ) : regularUsers.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No users found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {regularUsers.map((user) => (
                <div
                  key={user.id}
                  style={{ backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", display: "flex", flexDirection: "column", gap: "6px" }}
                >
                  <p style={{ fontWeight: "bold", fontSize: "16px", color: "white" }}>📧 {user.email}</p>
                  <p style={{ fontSize: "12px", color: "#475569" }}>UID: {user.id}</p>
                  <p style={{ fontSize: "14px", color: "#94a3b8" }}>
                    Role: <span style={{ color: "#fbbf24", fontWeight: "bold" }}>{user.role || "user"}</span>
                  </p>
                  <p style={{ fontSize: "13px", color: "#94a3b8" }}>🕒 Joined: {formatDate(user.createdAt)}</p>
                  <p style={{ fontSize: "13px", color: "#94a3b8" }}>🛒 Cart Items: {user.cartCount}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BOOKS TAB */}
      {activeTab === "books" && (
        <div style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "20px" }}>📚 Manage Books</h2>

          {/* ADD BOOK FORM */}
          <div
            style={{ backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <h3 style={{ color: "white", marginBottom: "4px" }}>➕ Add New Book</h3>
            <input style={inputStyle} placeholder="Title" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} />
            <input style={inputStyle} placeholder="Price (e.g. ₹499)" value={newBook.price} onChange={(e) => setNewBook({ ...newBook, price: e.target.value })} />
            <input style={inputStyle} placeholder="Genre (e.g. Fiction)" value={newBook.genre} onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })} />
            <input style={inputStyle} placeholder="Image URL" value={newBook.image} onChange={(e) => setNewBook({ ...newBook, image: e.target.value })} />
            
            {/* Added Quantity Input */}
            <input 
              type="number" 
              style={inputStyle} 
              placeholder="Quantity Available" 
              value={newBook.quantity} 
              onChange={(e) => setNewBook({ ...newBook, quantity: e.target.value })} 
            />
            
            <textarea
              style={{ ...inputStyle, height: "80px", resize: "vertical" }}
              placeholder="Summary (optional)"
              value={newBook.summary}
              onChange={(e) => setNewBook({ ...newBook, summary: e.target.value })}
            />
            <button
              onClick={addBook}
              style={{ backgroundColor: "#2563eb", color: "white", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}
            >
              Add Book
            </button>
          </div>

          {/* BOOK LIST */}
          {booksLoading ? (
            <p style={{ color: "#94a3b8" }}>Loading books...</p>
          ) : books.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No books added yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {books.map((book) => (
                <div
                  key={book.id}
                  style={{ 
                    backgroundColor: "#0f172a", 
                    padding: "16px", 
                    borderRadius: "10px", 
                    border: "1px solid #334155", 
                    width: "240px", // Expanded slightly to comfortably fit quantity inputs
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "8px",
                    boxSizing: "border-box"
                  }}
                >
                  <img
                    src={book.image}
                    alt={book.title}
                    style={{ width: "100%", height: "220px", objectFit: "cover", borderRadius: "8px" }}
                  />
                  <p style={{ fontWeight: "bold", color: "white", fontSize: "14px" }}>{book.title}</p>
                  <p style={{ color: "#60a5fa", fontSize: "13px" }}>{book.genre}</p>
                  <p style={{ color: "#4ade80", fontSize: "13px", fontWeight: "bold" }}>{book.price}</p>

                  {/* 🔥 INLINE QUANTITY MODIFIER */}
                  {editingQuantity === book.id ? (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input 
                        type="number"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        style={{ ...inputStyle, padding: "4px 8px", fontSize: "12px", width: "70px" }}
                      />
                      <button
                        onClick={() => saveQuantity(book.id)}
                        style={{ backgroundColor: "#16a34a", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingQuantity(null)}
                        style={{ backgroundColor: "#475569", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: "13px", color: "#e2e8f0" }}>
                      Stock: <span style={{ fontWeight: "bold", color: "#f59e0b" }}>{book.quantity !== undefined ? book.quantity : "0"}</span> 
                      <span 
                        onClick={() => { setEditingQuantity(book.id); setQuantityInput(book.quantity || "0"); }}
                        style={{ marginLeft: "8px", color: "#38bdf8", cursor: "pointer", fontSize: "11px", textDecoration: "underline" }}
                      >
                        Edit
                      </span>
                    </p>
                  )}

                  <p style={{ color: "#94a3b8", fontSize: "12px", lineHeight: "1.5" }}>
                    {book.summary || "No summary yet."}
                  </p>

                  {/* 🔥 ACTION CONTAINER (Pinned to bottom via marginTop: 'auto') */}
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {editingSummary === book.id ? (
                      <>
                        <textarea
                          value={summaryInput}
                          onChange={(e) => setSummaryInput(e.target.value)}
                          placeholder="Enter summary..."
                          style={{ ...inputStyle, height: "60px", resize: "vertical", fontSize: "12px" }}
                        />
                        <button
                          onClick={() => saveSummary(book.id)}
                          style={{ backgroundColor: "#16a34a", color: "white", border: "none", padding: "7px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                        >
                          Save Summary
                        </button>
                        <button
                          onClick={() => { setEditingSummary(null); setSummaryInput(""); }}
                          style={{ backgroundColor: "#475569", color: "white", border: "none", padding: "7px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setEditingSummary(book.id); setSummaryInput(book.summary || ""); }}
                        style={{ backgroundColor: "#1d4ed8", color: "white", border: "none", padding: "7px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                      >
                        {book.summary ? "Edit Summary" : "Add Summary"}
                      </button>
                    )}

                    <button
                      onClick={() => removeBook(book.id)}
                      style={{ backgroundColor: "#dc2626", color: "white", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
                    >
                      Remove
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}