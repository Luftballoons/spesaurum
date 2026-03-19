console.log("app.js running");

// =========================
// Imports
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, getDoc, deleteDoc, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// =========================
// Firebase config
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBtyzPBgTyiff9ZpQR45tREKYaa6D1-K7U",
  authDomain: "spesaurum.firebaseapp.com",
  projectId: "spesaurum",
  storageBucket: "spesaurum.firebasestorage.app",
  messagingSenderId: "5666077206",
  appId: "1:5666077206:web:b847a0caf51e401b3f9337"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// =========================
// Global User
// =========================
let currentUser = null;
let displayName = null;

onAuthStateChanged(auth, async user => {
  currentUser = user;
  const topRight = document.getElementById("top-right");
  const authButtons = document.getElementById("auth-buttons");
  if (!topRight || !authButtons) return;

  authButtons.innerHTML = "";

  if (user) {
    // get display name
    const usersSnapshot = await getDocs(collection(db, "users"));
    displayName = user.email;
    usersSnapshot.forEach(u => {
      if (u.data().uid === user.uid) {
        displayName = u.data().displayName || user.email;
      }
    });

    topRight.innerText = displayName;

    // Logout button
    const logoutBtn = document.createElement("button");
    logoutBtn.innerText = "Logout";
    logoutBtn.onclick = () => {
      signOut(auth).then(() => window.location.href = "login.html");
    };
    authButtons.appendChild(logoutBtn);

  } else {
    topRight.innerText = "Not logged in";
    const loginBtn = document.createElement("a");
    loginBtn.href = "login.html";
    loginBtn.innerText = "Login";
    loginBtn.classList.add("nav-btn");
    authButtons.appendChild(loginBtn);
  }

  loadPosts(); // refresh posts with correct delete button
});

// =========================
// Register
// =========================
window.register = function() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  const name = document.getElementById("displayName")?.value || "Anonymous";

  if (!email || !password) return alert("Enter email/password");

  createUserWithEmailAndPassword(auth, email, password)
    .then(async cred => {
      await addDoc(collection(db, "users"), {
        uid: cred.user.uid,
        email,
        displayName: name
      });
      alert("Registered!");
      window.location.href = "login.html";
    })
    .catch(err => alert(err.message));
};

// =========================
// Login
// =========================
window.login = function() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return alert("Enter email/password");

  signInWithEmailAndPassword(auth, email, password)
    .then(() => window.location.href = "index.html")
    .catch(err => alert(err.message));
};

// =========================
// Create Post
// =========================
window.createPost = async function() {
  if (!currentUser) return alert("Login first");

  const title = document.getElementById("title")?.value;
  const content = document.getElementById("content")?.value;

  if (!title || !content) return alert("Fill all fields");

  await addDoc(collection(db, "posts"), {
    title,
    content,
    userId: currentUser.uid,
    userEmail: currentUser.email,
    displayName: displayName,
    createdAt: Date.now()
  });

  alert("Posted!");
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
};

// =========================
// Load Posts
// =========================
function loadPosts() {
  const postsDiv = document.getElementById("posts");
  if (!postsDiv) return;

  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(postsQuery, snapshot => {
    postsDiv.innerHTML = "";
    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const isAuthor = currentUser && post.userId === currentUser.uid;

      postsDiv.innerHTML += `
        <div class="post">
          <div class="post-meta">
            Posted by ${post.displayName || post.userEmail} at ${new Date(post.createdAt).toLocaleString()}
          </div>
          <h3>${post.title}</h3>
          <p>${post.content}</p>
          <button onclick="window.location.href='post.html?id=${docSnap.id}'">View</button>
          ${isAuthor ? `<button onclick="deletePost('${docSnap.id}')">Delete</button>` : ""}
        </div>
      `;
    });
  });
}

// =========================
// Delete Post
// =========================
window.deletePost = async function(postId) {
  if (!currentUser) return alert("Not authorized");
  const confirmDelete = confirm("Delete this post?");
  if (!confirmDelete) return;

  await deleteDoc(doc(db, "posts", postId));
};