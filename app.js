console.log("app.js running");

// =========================
// Imports
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, getDoc, deleteDoc, onSnapshot, query, orderBy
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
//////
// =========================
// Global user
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
    // Get display name
    const usersSnapshot = await getDocs(collection(db, "users"));
    displayName = user.email;

    usersSnapshot.forEach(u => {
      if (u.data().uid === user.uid) {
        displayName = u.data().displayName || user.email;
      }
    });

    topRight.innerText = displayName;

    const logoutBtn = document.createElement("button");
    logoutBtn.innerText = "Logout";
    logoutBtn.onclick = () => signOut(auth);
    authButtons.appendChild(logoutBtn);

  } else {
    topRight.innerText = "Not logged in";

    const loginBtn = document.createElement("a");
    loginBtn.href = "login.html";
    loginBtn.innerText = "Login";
    loginBtn.classList.add("nav-btn");
    authButtons.appendChild(loginBtn);
  }

  loadPosts();
  loadSinglePost();
});

// =========================
// Auth
// =========================
window.register = async function () {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  const name = document.getElementById("displayName")?.value || "Anonymous";

  if (!email || !password) return alert("Enter email/password");

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  await addDoc(collection(db, "users"), {
    uid: cred.user.uid,
    email,
    displayName: name
  });

  alert("Registered!");
  window.location.href = "login.html";
};

window.login = async function () {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;

  if (!email || !password) return alert("Enter email/password");

  await signInWithEmailAndPassword(auth, email, password);
  window.location.href = "index.html";
};

// =========================
// Create Post
// =========================
window.createPost = async function () {
  if (!currentUser) return alert("Login first");

  const title = document.getElementById("title")?.value;
  const content = document.getElementById("content")?.value;

  if (!title || !content) return alert("Fill all fields");

  await addDoc(collection(db, "posts"), {
    title,
    content,
    userId: currentUser.uid,
    userEmail: currentUser.email,
    displayName,
    createdAt: Date.now()
  });

  alert("Posted!");
};

// =========================
// Load Posts (forum)
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
            ${post.displayName || post.userEmail} • ${new Date(post.createdAt).toLocaleString()}
          </div>
          <h3>${post.title}</h3>
          <p>${post.content}</p>
          <button onclick="location.href='post.html?id=${docSnap.id}'">View</button>
          ${isAuthor ? `<button onclick="deletePost('${docSnap.id}')">Delete</button>` : ""}
        </div>
      `;
    });
  });
}

// =========================
// Load Single Post
// =========================
function loadSinglePost() {
  const titleEl = document.getElementById("post-title");
  if (!titleEl) return;

  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");

  if (!postId) {
    titleEl.innerText = "No post ID.";
    return;
  }

  const docRef = doc(db, "posts", postId);

  onSnapshot(docRef, docSnap => {
    if (!docSnap.exists()) {
      titleEl.innerText = "Post not found";
      return;
    }

    const post = docSnap.data();

    document.getElementById("post-title").innerText = post.title;
    document.getElementById("post-content").innerText = post.content;
    document.getElementById("post-meta").innerText =
      `${post.displayName || post.userEmail} • ${new Date(post.createdAt).toLocaleString()}`;

    loadComments(postId);
  });
}

// =========================
// Comments
// =========================
function loadComments(postId) {
  const commentsDiv = document.getElementById("comments");
  if (!commentsDiv) return;

  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );

  onSnapshot(q, snapshot => {
    commentsDiv.innerHTML = "";

    snapshot.forEach(doc => {
      const c = doc.data();

      commentsDiv.innerHTML += `
        <div class="comment">
          <b>${c.displayName || c.userEmail}</b>
          <p>${c.text}</p>
        </div>
      `;
    });
  });
}

window.addComment = async function () {
  if (!currentUser) return alert("Login first");

  const input = document.getElementById("comment-input");
  const text = input.value;

  if (!text) return;

  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");

  await addDoc(collection(db, "posts", postId, "comments"), {
    text,
    userId: currentUser.uid,
    userEmail: currentUser.email,
    displayName,
    createdAt: Date.now()
  });

  input.value = "";
};

// =========================
// Delete Post
// =========================
window.deletePost = async function (postId) {
  if (!currentUser) return;

  if (!confirm("Delete post?")) return;

  await deleteDoc(doc(db, "posts", postId));
};
// Background images
const images = ['bg2.jpg','bg7.jpg','bg3.jpg','bg4.jpg','bg5.jpg','bg6.jpg']
let current = 0;
const bgDiv = document.querySelector('.hero-bg');

// -------- Image cycling --------
function cycleBackground() {
  bgDiv.style.backgroundImage = `url('${images[current]}')`;
  bgDiv.style.opacity = 1;

  setTimeout(() => {
    bgDiv.style.opacity = 0;
  }, 4000); // visible 4s

  current = (current + 1) % images.length;
}
cycleBackground();
setInterval(cycleBackground, 5000);

// -------- Smooth parallax --------
let targetY = 0;
let currentY = 0;

function animateParallax() {
  // target is 30% of scroll for subtle effect
  targetY = window.scrollY * 0.3;

  // lerp: smooth interpolation
  currentY += (targetY - currentY) * 0.08; // 0.08 = smoothing factor
  bgDiv.style.transform = `translateY(${currentY}px)`;

  requestAnimationFrame(animateParallax);
}

animateParallax(); // start loop