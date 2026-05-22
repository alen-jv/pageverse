import { useState } from "react"; 
import { useNavigate } from "react-router-dom";
import { deleteUser } from "firebase/auth";
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  query, 
  where 
} from "firebase/firestore"; // Added query and where for root collection filtering
import { auth, db } from "../firebase";

function Profile() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const firstLetter = user?.email?.charAt(0).toUpperCase() || "U";

  // State to manage the order history popup modal and fetched data
  const [showOrdersPopup, setShowOrdersPopup] = useState(false);
  const [orders, setOrders] = useState([]);

  // Function to fetch orders from the root-level collection
  const fetchOrderHistory = async () => {
    if (!user) return;
    try {
      // Pointing directly to the global, root-level 'orders' collection
      const ordersRef = collection(db, "orders");
      
      // Filter out documents matching the current user's UID
      const q = query(ordersRef, where("userId", "==", user.uid));
      const snap = await getDocs(q);
      
      const fetchedOrders = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort orders locally so that the newest purchases display first
      fetchedOrders.sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));

      setOrders(fetchedOrders);
      setShowOrdersPopup(true); // Reveal popup modal overlay
    } catch (error) {
      console.error("Error fetching orders:", error);
      alert("Failed to load order history.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This will permanently erase your profile and clear all your data."
    );
    
    if (!confirmDelete) return;

    try {
      if (user) {
        const batch = writeBatch(db);

        // 1. Get and delete all items in the user's cart subcollection
        const cartRef = collection(db, "users", user.uid, "cart");
        const cartSnap = await getDocs(cartRef);
        cartSnap.docs.forEach((item) => {
          batch.delete(item.ref);
        });
        
        // 2. ALSO delete the main user profile document itself
        const userDocRef = doc(db, "users", user.uid);
        batch.delete(userDocRef); 

        // Commit all batch deletions to Firestore safely at once
        await batch.commit();

        // 3. Finally, delete the user credentials profile from Firebase Authentication
        await deleteUser(user);
        
        alert("Your account and all associated data have been completely deleted.");
        navigate("/"); // Redirect to primary landing login view
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      
      if (error.code === "auth/requires-recent-login") {
        alert(
          "For security reasons, you must have logged in recently to delete your account. Please log out, log back in, and try again."
        );
      } else {
        alert("Failed to delete account. Please try again.");
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #dbeafe, #93c5fd)",
        padding: "40px",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "50px",
        }}
      >
        <button
          onClick={() => navigate("/home")}
          style={{
            backgroundColor: "#1e3a8a",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "15px",
          }}
        >
          &larr; Back to Home
        </button>

        <h1 style={{ color: "#1e3a8a", margin: 0, fontSize: "34px" }}>
          Profile 👤
        </h1>

        <div style={{ width: "140px" }}></div>
      </div>

      {/* PROFILE CARD */}
      <div
        style={{
          backgroundColor: "white",
          maxWidth: "500px",
          margin: "0 auto",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "130px",
            height: "130px",
            borderRadius: "50%",
            background: "linear-gradient(to bottom right, #2563eb, #1e3a8a)",
            color: "white",
            fontSize: "52px",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto 25px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {firstLetter}
        </div>

        <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>
          Welcome Back
        </h2>

        <p
          style={{
            color: "#475569",
            fontSize: "17px",
            marginBottom: "30px",
            wordBreak: "break-word",
          }}
        >
          {user?.email}
        </p>

        <div
          style={{
            backgroundColor: "#eff6ff",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "30px",
            textAlign: "left",
          }}
        >
          <p style={{ marginBottom: "12px", color: "#1e3a8a", fontWeight: "bold" }}>
            Account Status: Active
          </p>
          <p style={{ marginBottom: "12px", color: "#1e3a8a", fontWeight: "bold" }}>
            Saved Cart: Synced 
          </p>
          <p style={{ color: "#1e3a8a", fontWeight: "bold" }}>
            Member of PageVerse 📚
          </p>
        </div>

        {/* VIEW ORDERS BUTTON */}
        <button
          onClick={fetchOrderHistory}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            marginBottom: "15px",
            boxShadow: "0 4px 10px rgba(37,99,235,0.3)",
            boxSizing: "border-box"
          }}
        >
          View Order History 📦
        </button>

        {/* LOGOUT BUTTON */}
        <button
          onClick={() => {
            auth.signOut();
            navigate("/");
          }}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            boxShadow: "0 4px 10px rgba(239,68,68,0.4)",
            boxSizing: "border-box"
          }}
        >
          Logout
        </button>

        {/* DELETE ACCOUNT BUTTON */}
        <button
          onClick={handleDeleteAccount}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "transparent",
            color: "#ef4444",
            border: "2px solid #ef4444",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            marginTop: "15px",
            boxSizing: "border-box"
          }}
        >
          Delete Account
        </button>
      </div>

      {/* ORDER HISTORY POPUP MODAL */}
      {showOrdersPopup && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "16px", width: "90%", maxWidth: "550px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 6px 20px rgba(0,0,0,0.3)", position: "relative" }}>
            
            {/* Close Button */}
            <button 
              onClick={() => setShowOrdersPopup(false)} 
              style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
            >
              ✖
            </button>
            
            <h2 style={{ color: "#1e3a8a", marginTop: 0, marginBottom: "25px", borderBottom: "2px solid #eff6ff", paddingBottom: "10px" }}>
              Your Order History
            </h2>
            
            {orders.length === 0 ? (
              <p style={{ color: "#475569", textAlign: "center", fontSize: "16px", margin: "40px 0" }}>
                You haven't placed any orders yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {orders.map((order) => (
                  <div key={order.id} style={{ backgroundColor: "#f8fafc", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    
                    {/* Order Header: Date & Status */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontWeight: "bold", color: "#334155" }}>
                        {new Date(order.orderedAt).toLocaleString()}
                      </span>
                      <span style={{ color: "#16a34a", fontWeight: "bold", fontSize: "14px" }}>
                        {order.status || "Completed"}
                      </span>
                    </div>

                    {/* Order Details */}
                    <p style={{ margin: "0 0 10px 0", color: "#475569", fontSize: "15px" }}>
                      <strong>Total:</strong> ₹{order.totalPrice} ({order.totalItems} items)
                    </p>

                    {/* Purchased Items List */}
                    <ul style={{ margin: 0, paddingLeft: "20px", color: "#64748b", fontSize: "14px" }}>
                      {order.items?.map((item, index) => (
                        <li key={index} style={{ marginBottom: "4px" }}>
                          {item.title} - <span style={{ fontWeight: "bold" }}>Qty: {item.quantityOrdered}</span>
                        </li>
                      ))}
                    </ul>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;