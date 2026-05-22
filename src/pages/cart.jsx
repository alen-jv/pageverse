import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  runTransaction, // Added for atomic checkout safety
} from "firebase/firestore";

function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [masterBooks, setMasterBooks] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [showPopup, setShowPopup] = useState(false);

  const fetchMasterBooks = async () => {
    try {
      const snap = await getDocs(collection(db, "books"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMasterBooks(list);
    } catch (error) {
      console.log("Error fetching master books:", error);
    }
  };

  const fetchCart = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const querySnapshot = await getDocs(
        collection(db, "users", user.uid, "cart")
      );

      const items = [];
      querySnapshot.forEach((docItem) => {
        if (docItem.id !== "_init") {
          items.push({ id: docItem.id, ...docItem.data() });
        }
      });

      setCartItems(items);

      setQuantities((prev) => {
        const updated = { ...prev };
        items.forEach((item) => {
          if (!updated[item.id]) {
            updated[item.id] = 1;
          }
        });
        return updated;
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchMasterBooks();
    fetchCart();
  }, []);

  const removeItem = async (id) => {
    try {
      const user = auth.currentUser;
      await deleteDoc(doc(db, "users", user.uid, "cart", id));
      fetchCart();
    } catch (error) {
      console.log(error);
    }
  };

  const getMasterBook = (item) => {
    return masterBooks.find((b) => b.title === item.title);
  };

  const handleQuantityChange = (itemId, val, item) => {
    const targetQty = parseInt(val);
    if (isNaN(targetQty) || targetQty < 1) return;

    const matchedMasterBook = getMasterBook(item);
    const maxAvailable = matchedMasterBook ? matchedMasterBook.quantity : 0;

    if (targetQty > maxAvailable) {
      alert("Exceeded the availability limit");
      return;
    }

    setQuantities((prev) => ({
      ...prev,
      [itemId]: targetQty,
    }));
  };

  const totalItemsCount = cartItems.reduce((sum, item) => {
    return sum + (quantities[item.id] || 1);
  }, 0);

  const totalPrice = cartItems.reduce((sum, item) => {
    const num = parseInt(item.price.replace(/[^0-9]/g, ""));
    const cleanPrice = isNaN(num) ? 0 : num;
    const qty = quantities[item.id] || 1;
    return sum + cleanPrice * qty;
  }, 0);

  // 🛡️ ATOMIC TRANSACTION CHECKOUT METHOD
  const handleCheckout = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Structure the ordered items sub-array
      const orderedItems = cartItems.map((item) => ({
        bookId: item.id,
        title: item.title,
        price: item.price,
        image: item.image,
        genre: item.genre,
        quantityOrdered: quantities[item.id] || 1,
      }));

      // 2. Build our final order history document template
      const orderPayload = {
        userId: user.uid, 
        userEmail: user.email,
        items: orderedItems,
        totalPrice: totalPrice,
        totalItems: totalItemsCount,
        orderedAt: new Date().toISOString(),
        status: "Completed",
      };

      // 3. Fire the atomic network transaction block
      await runTransaction(db, async (transaction) => {
        const stockUpdates = [];

        // Step A: Read fresh server-side data first (All transaction reads MUST occur before writes)
        for (const item of cartItems) {
          const matchedMasterBook = getMasterBook(item);
          if (!matchedMasterBook) {
            throw new Error(`Inventory reference mapping missing for: ${item.title}`);
          }

          const bookRef = doc(db, "books", matchedMasterBook.id);
          const bookSnap = await transaction.get(bookRef);

          if (!bookSnap.exists()) {
            throw new Error(`Book listing "${item.title}" no longer exists in our database.`);
          }

          const currentLiveStock = bookSnap.data().quantity || 0;
          const qtyToSubtract = quantities[item.id] || 1;

          if (currentLiveStock < qtyToSubtract) {
            throw new Error(`Sorry, "${item.title}" just sold out! Only ${currentLiveStock} left.`);
          }

          // Cache references and calculations for our write batch phase
          stockUpdates.push({
            ref: bookRef,
            newQty: currentLiveStock - qtyToSubtract
          });
        }

        // Step B: Transaction Writes (Execute document updates, updates, and sets safely)
        stockUpdates.forEach((update) => {
          transaction.update(update.ref, { quantity: update.newQty });
        });

        // Initialize a clean document reference directly inside the root 'orders' collection
        const newOrderRef = doc(collection(db, "orders"));
        transaction.set(newOrderRef, orderPayload);

        // Clear the user's specific items inside their cart subcollection
        for (const item of cartItems) {
          const cartItemRef = doc(db, "users", user.uid, "cart", item.id);
          transaction.delete(cartItemRef);
        }
      });

      // 4. Update the local UI layout state smoothly after successful database commits
      await fetchMasterBooks();
      await fetchCart();
      setShowPopup(true);
    } catch (error) {
      console.error("Transaction failed:", error);
      alert(error.message || "Failed to complete checkout processing.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#dbeafe", padding: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "35px" }}>
        <button
          onClick={() => navigate("/home")}
          style={{ backgroundColor: "#1e3a8a", color: "white", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}
        >
          &larr; Back to Home
        </button>
        <h1 style={{ color: "#1e3a8a", margin: 0 }}>Your Cart 🛒</h1>
        <div style={{ width: "140px" }} />
      </div>

      {cartItems.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2 style={{ color: "#334155" }}>No items in cart</h2>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "25px" }}>
            {cartItems.map((item) => {
              const matchedBook = getMasterBook(item);
              return (
                <div
                  key={item.id}
                  style={{ backgroundColor: "white", padding: "20px", width: "240px", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                >
                  <div>
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{ width: "100%", height: "280px", objectFit: "cover", borderRadius: "10px", marginBottom: "15px" }}
                    />
                    <h3 style={{ color: "#1e293b", marginBottom: "10px" }}>{item.title}</h3>
                    <p style={{ color: "#2563eb", fontWeight: "bold", marginBottom: "8px" }}>{item.genre}</p>
                    <p style={{ color: "#334155", fontWeight: "bold", fontSize: "16px" }}>{item.price}</p>
                    
                    <div style={{ marginTop: "15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "14px", color: "#475569", fontWeight: "600" }}>Qty to Buy:</span>
                      <input
                        type="number"
                        min="1"
                        max={matchedBook ? matchedBook.quantity : 1}
                        value={quantities[item.id] || 1}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value, item)}
                        style={{ width: "65px", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", textAlign: "center", fontSize: "14px", fontWeight: "bold", outline: "none" }}
                      />
                    </div>
                    {matchedBook && (
                      <p style={{ fontSize: "12px", color: "#64748b", margin: "6px 0 0 0", textAlign: "right" }}>
                        ({matchedBook.quantity} available in stock)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{ width: "100%", marginTop: "18px", padding: "10px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "40px", backgroundColor: "white", padding: "25px", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxWidth: "400px" }}>
            <h2 style={{ color: "#1e293b", marginBottom: "15px" }}>Cart Summary</h2>
            <p style={{ fontSize: "18px", fontWeight: "bold", color: "#2563eb" }}>Total Items: {totalItemsCount}</p>
            <p style={{ fontSize: "18px", fontWeight: "bold", color: "#16a34a", marginTop: "8px" }}>Total: ₹{totalPrice}</p>
            <button
              onClick={handleCheckout}
              style={{ marginTop: "20px", width: "100%", padding: "12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}

      {showPopup && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "16px", textAlign: "center", width: "350px", boxShadow: "0 6px 20px rgba(0,0,0,0.3)" }}>
            <h2 style={{ color: "#16a34a", marginBottom: "15px" }}>Order Placed ✅</h2>
            <p style={{ color: "#334155", marginBottom: "25px" }}>Placed order successfully</p>
            <button
              onClick={() => setShowPopup(false)}
              style={{ backgroundColor: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;