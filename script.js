import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    getDoc, 
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";
import { env } from "./env.js";

const firebaseConfig = {
    apiKey: env.API_KEY,
    authDomain: env.AUTH_DOMAIN,
    databaseURL: env.DATABASE_URL,
    projectId: env.PROJECT_ID,
    storageBucket: env.STORAGE_BUCKET,
    messagingSenderId: env.MESSAGING_SENDER_ID,
    appId: env.APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const todoInput = document.getElementById("todoInput");
const addTodoBtn = document.getElementById("addTodoBtn");
const todoList = document.getElementById("todoList");
const completedList = document.getElementById("completedList");
const notification = document.getElementById("notification");

function isOnline() {
    return navigator.onLine;
}

function showNotification(message) {
    notification.textContent = message;
    notification.style.display = "block";
    setTimeout(() => {
        notification.style.display = "none";
    }, 3000);
}

async function syncTodos() {
    if (isOnline()) {
        const offlineTodos = JSON.parse(localStorage.getItem("offlineTodos")) || [];
        for (const todo of offlineTodos) {
            await addDoc(collection(db, "todos"), todo);
        }
        localStorage.removeItem("offlineTodos");
        fetchTodos();
    }
}

// Function to add a new todo to Firestore
async function addTodoToFirestore(todoText) {
    const todo = {
        text: todoText,
        completed: false,
        createdAt: Timestamp.now(), // Use Firestore Timestamp
        updatedAt: null, // Initialize updatedAt as null
        completedAt: null // Initially null
    };
    await addDoc(collection(db, "todos"), todo);
    fetchTodos();
}

// Function to mark a todo as done and save to history
async function markAsDone(id) {
    const todoRef = doc(db, "todos", id);
    const todoSnapshot = await getDoc(todoRef);
    
    if (todoSnapshot.exists()) {
        await updateDoc(todoRef, {
            completed: true,
            completedAt: Timestamp.now(), // Set completion time
            updatedAt: Timestamp.now() // Update the updatedAt field
        });

        fetchTodos();
    }
}

// Function to delete a todo
async function deleteTodo(id) {
    console.log(`Deleting todo with ID: ${id}`); // Log the ID being deleted
    await deleteDoc(doc(db, "todos", id));
    fetchTodos();
}

// Fetch todos from Firestore and display them
async function fetchTodos() {
    todoList.innerHTML = "";
    completedList.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "todos"));
    querySnapshot.forEach((docSnapshot) => {
        const todo = docSnapshot.data();
        const li = document.createElement("li");

        const todoText = document.createElement("span");
        todoText.textContent = todo.text;

        // Create Mark as Done button
        const markDoneBtn = document.createElement("button");
        markDoneBtn.textContent = "Mark as Done";
        markDoneBtn.classList.add("done", "button"); // Add classes for styling
        markDoneBtn.addEventListener("click", () => markAsDone(docSnapshot.id));

        // Create Edit button
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.classList.add("button"); // Add a common button class for consistent height
        editBtn.addEventListener("click", () => {
            const newText = prompt("Edit your todo:", todo.text);
            if (newText) {
                editTodo(docSnapshot.id, newText);
            }
        });

        // Create Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("delete", "button"); // Add classes for styling
        deleteBtn.addEventListener("click", () => deleteTodo(docSnapshot.id));

        li.appendChild(todoText);
        li.appendChild(markDoneBtn);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);

        // Display creation time
        if (todo.createdAt) {
            const createdAt = document.createElement("span");
            createdAt.textContent = `Created at: ${todo.createdAt.toDate().toLocaleString()}`;
            createdAt.classList.add("timestamp");
            li.appendChild(createdAt);
        }

        // Only display the updatedAt timestamp if the todo was edited
        if (todo.updatedAt) {
            const updatedAt = document.createElement("span");
            updatedAt.textContent = `Updated at: ${todo.updatedAt.toDate().toLocaleString()}`;
            updatedAt.classList.add("timestamp");
            li.appendChild(updatedAt);
        }

        // Display completed time if the todo is completed
        if (todo.completedAt) {
            const completedAt = document.createElement("span");
            completedAt.textContent = `Completed at: ${todo.completedAt.toDate().toLocaleString()}`;
            completedAt.classList.add("timestamp");
            li.appendChild(completedAt);
        }

        // Append to the appropriate list based on completion status
        if (!todo.completed) {
            todoList.appendChild(li);
        } else {
            const completedLi = document.createElement("li");
            completedLi.textContent = todo.text;

            // Display completion date for completed todos
            if (todo.completedAt) {
                const completedAt = document.createElement("span");
                completedAt.textContent = ` (Completed at: ${todo.completedAt.toDate().toLocaleString()})`;
                completedAt.classList.add("timestamp");
                completedLi.appendChild(completedAt);
            }

            const deleteCompletedBtn = document.createElement("button");
            deleteCompletedBtn.textContent = "Delete";
            deleteCompletedBtn.classList.add("delete", "button"); // Add classes for styling
            deleteCompletedBtn.addEventListener("click", () => deleteTodo(docSnapshot.id));
            completedLi.appendChild(deleteCompletedBtn);
            completedList.appendChild(completedLi);
        }
    });
}

// Fetch todos initially
fetchTodos();
window.addEventListener("online", syncTodos);

// Event listener for adding a todo
addTodoBtn.addEventListener("click", async () => {
    const todoText = todoInput.value.trim();
    if (todoText) {
        await addTodoToFirestore(todoText); // Call the updated function
        todoInput.value = "";
    }
});

// Function to edit a todo
async function editTodo(id, newText) {
    const todoRef = doc(db, "todos", id);
    await updateDoc(todoRef, {
        text: newText,
        updatedAt: Timestamp.now() // Update the updatedAt field with Firestore Timestamp
    });
    fetchTodos();
}
