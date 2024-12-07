// src/main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, getDoc, getDocs, updateDoc, collection, arrayUnion, arrayRemove, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const firebaseConfig = {
    apiKey: "AIzaSyAaFKCGZBvdAEZscUPyFSUQCyr6hEzSYM8",
    authDomain: "focusmate-905a6.firebaseapp.com",
    projectId: "focusmate-905a6",
    storageBucket: "focusmate-905a6.appspot.com",
    messagingSenderId: "420700192010",
    appId: "1:420700192010:web:fb0dd94d43bf5d0acf0ef3",
    measurementId: "G-2CNSSNRB79"
};

// Initialize Firebase
const fapp = initializeApp(firebaseConfig);
const auth = getAuth(fapp);
const db = getFirestore(fapp);
const storage = getStorage(fapp);
const invitesRef = collection(db, 'invites');

setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("Auth persistence set to local.");
    })
    .catch((error) => {
        console.error("Error setting auth persistence:", error);
    }); 

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'), // Adjust if necessary
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: true // Recommended to set to false for security
        },
    });

    // Load your HTML file
    mainWindow.loadFile('src/auth.html'); // Ensure this path is correct

    let blurTimeout;

    mainWindow.on('blur', () => {
        console.log('Window lost focus');

        // Clear any existing timeout to avoid multiple blur signals
        clearTimeout(blurTimeout);

        // Set a timeout to delay sending the blurred signal
        blurTimeout = setTimeout(() => {
            mainWindow.webContents.send('app-blurred');  // Send a message to the renderer process
        }, 300); // Adjust the delay as needed (300ms is just an example)
    });

    mainWindow.on('focus', () => {
        console.log('Window gained focus');
        clearTimeout(blurTimeout); // Clear the blur timeout when gaining focus
        mainWindow.webContents.send('app-focused');
    });

    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
        console.log("main level: ", user.uid);
        mainWindow.webContents.send('auth:stateChanged', user ? user.uid : null);
    
    });
    onSnapshot(invitesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            mainWindow.webContents.send('firestore:docChanged', change.doc.data().roomName, change.doc.data().sender, change.doc.data().receiver, change.doc.data().roomId);
        });
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

// Handle Firebase Authentication
ipcMain.handle('auth:signin', async (event, email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userData = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            verified: userCredential.user.emailVerified,
        };
        return userData;  
    } catch (error) {
        console.error('Signin error:', error);
        throw new Error('Failed to sign in. Please check your credentials and try again.');
    }
});

ipcMain.handle('auth:signup', async (event, email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        const userData = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            verified: userCredential.user.emailVerified,
        };
        return userData;  
    } catch (error) {
        console.error('Signup error:', error);
        throw new Error('Failed to sign up. Please check your details and try again.');
    }
});

// Handle Firestore operations
ipcMain.handle('firestore:setDoc', async (event, collectionName, docId, data) => {
    try {
        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, data, {merge: true});
    } catch (error) {
        console.error('Error setting document:', error);
        throw new Error('Failed to set document. Please try again.');
    }
});

ipcMain.handle('firestore:addDoc', async (event, collectionName, data) => {
    try {
        const docRef = collection(db, collectionName);
        await addDoc(docRef, data);
    } catch (error) {
        console.error('Error adding document:', error);
        throw new Error('Failed to add document. Please try again.');
    }
});

ipcMain.handle('firestore:getDoc', async (event, collectionName, docId) => {
    try {
        const docRef = doc(db, collectionName, docId);
        const data = (await getDoc(docRef)).data();
        return data;
    } catch (error) {
        console.error('Error setting document:', error);
        throw new Error('Failed to set document. Please try again.');
    }
});

ipcMain.handle('firestore:getRooms', async () => {
    try {
        const roomCollection = collection(db, "rooms");
        const querySnapshot = await getDocs(roomCollection);
        return querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    } catch (error) {
        console.error(error);
        throw new Error('Failed to fetch rooms. Please try again.');
    }
});

ipcMain.handle('firestore:getRoom', async (event, roomname) => {
    try {
        
        const userDocRef = doc(db, "rooms", roomname); // Create a DocumentReference for the specific user
        const userDocSnapshot = await getDoc(userDocRef); // Fetch the document snapshot

        // Check if the document exists
        if (userDocSnapshot.exists()) {
            return userDocSnapshot.data(); // Return the user data
        } else {
            throw new Error("No such user document!"); // Handle case where user document does not exist
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw new Error("Failed to fetch user data. Please try again."); // Handle errors
    }
});

ipcMain.handle('firestore:createRoom', async (event, roomdata) => {
    try {
        const roomDocRef = doc(db, "rooms", roomdata.name);
        await setDoc(roomDocRef, roomdata, {merge:true});
    } catch (error) {
        console.error(error);
        throw new Error('Failed to create room. Please try again.');
    }
});

// Handle Firestore get user data
ipcMain.handle('firestore:getuserdata', async (event, userId) => {
    try {
        
        const userDocRef = doc(db, "users", userId); // Create a DocumentReference for the specific user
        const userDocSnapshot = await getDoc(userDocRef); // Fetch the document snapshot

        // Check if the document exists
        if (userDocSnapshot.exists()) {
            return userDocSnapshot.data(); // Return the user data
        } else {
            throw new Error("No such user document!"); // Handle case where user document does not exist
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw new Error("Failed to fetch user data. Please try again."); // Handle errors
    }
});

ipcMain.handle('firestore:getusersdata', async () => {
    try {
        const usersCollection = collection(db, 'users');
        const snapshot = await getDocs(usersCollection);
        
        if (!snapshot.empty) {
            // Map through the documents and return the user data
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
        }
        
        return []; // Return an empty array if no users found
    } catch (error) {
        console.error("Error fetching users data from Firestore:", error);
        throw new Error("Failed to fetch users data"); // Throw an error for the renderer process to handle
    }
});

ipcMain.handle('storage:uploadavatar', async (event, colname, userId, fileBuffer, fileName) => {
    try {
        if (!fileBuffer || !fileName) {
            throw new Error("No file provided for upload.");
        }
        
        const storageRef = ref(storage, `${colname}/${userId}/${fileName}`);
        await uploadBytes(storageRef, fileBuffer);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL; // Return the download URL for the uploaded avatar
    } catch (error) {
        console.error("Error uploading avatar:", error);
        throw new Error("Failed to upload avatar. Please try again."); // Propagate the error
    }
});


ipcMain.handle('firestore:updateuseravatar', async (event, userId, avatarUrl) => {
    try {
        await setDoc(doc(db, "users", userId), { avatar: avatarUrl }, { merge: true });
    } catch (error) {
        console.error(error);
        throw new Error('Failed to update user avatar. Please try again.');
    }
});

ipcMain.handle('firestore:updateusername', async (event, userId, newName) => {
    try {
        await setDoc(doc(db, "users", userId), { name: newName }, { merge: true });
    } catch (error) {
        console.error(error);
        throw new Error('Failed to update username. Please try again.');
    }
});

ipcMain.handle('auth:signout', async () => {
    try {
        return await signOut(auth);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to sign out. Please try again.');
    }
});

ipcMain.handle('auth:getcurrentuserid', async () => {
    try {
        const currentUser = auth.currentUser;
        return currentUser ? currentUser.uid : null;  // Return null if no user is signed in
    } catch (error) {
        console.error(error);
        throw new Error('Failed to get current user ID.');
    }
});

ipcMain.handle('firebase:checkroomexists', async (event, roomName) => {
    try {
        console.log(roomName);
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        const roomExists = roomsSnapshot.docs.some(doc => doc.data().name === roomName);
        console.log(roomExists);
        return roomExists;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to check room exists or not');
    }
});

ipcMain.handle('firebase:getbackgroundsinfo', async (event, backgrounds) => {
    
    try {
        if(backgrounds == "all"){
            const storageRef = ref(storage, `backgrounds/`);
            const result = await listAll(storageRef);
            
            const back_infos = [];
            
            for (const itemRef of result.items) {
                const url = await getDownloadURL(itemRef);
                back_infos.push({
                    name: itemRef.name,
                    url: url
                });
            }
    
            return back_infos; 
        }else{
            let back_infos = await Promise.all(
                backgrounds.map(async (back_name) => {
                    const storageRef = ref(storage, `backgrounds/${back_name}`);
                    const downloadURL = await getDownloadURL(storageRef);
                    return {
                        name: back_name,
                        url: downloadURL
                    };
                })
            );
            return back_infos;   
        }
    } catch (error) {
        console.error(error);
        throw new Error('Failed to get backgrounds');
    }    
});

ipcMain.handle('firebase:addNewBack', async (event, userId, back_name) => {
    try {
        const userDocRef = doc(db, "users", userId); // Reference to the user document
        await updateDoc(userDocRef, {
            backgrounds: arrayUnion(back_name) // Adds "background_name" to the "backgrounds" array
        });
    } catch (error) {
        console.error(error);
        throw new Error('Failed to add new background');
    }
});

ipcMain.handle('firebase:addFriend', async (event, senderId, receiverId) => {
    try {
        await updateDoc(doc(db, "users", senderId), {
            sendingreq: arrayUnion(receiverId) 
        });
        await updateDoc(doc(db, "users", receiverId), {
            pendingreq: arrayUnion(senderId) 
        });
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to send friend request from ${senderId} to ${receiverId}`);
    }
});

ipcMain.handle('firebase:getNoti', async (event, id) => {
    try {
        const userNoti = await getDoc(doc(db, "users", id));
        if(userNoti.exists()){
            return userNoti.data().pendingreq;
        }else{
            console.log(`User ${id} doesn't exist`);
        }
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get notification of user ${id}`);
    }
});

ipcMain.handle('firebase:acceptReq', async (event, senderId, receiverId) => {
    try {
        await updateDoc(doc(db, 'users', senderId), {
            friends: arrayUnion(receiverId)
        });
        await updateDoc(doc(db, 'users', receiverId), {
            friends: arrayUnion(senderId)
        });
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to accept friend request from ${senderId}`);
    }
});

ipcMain.handle('firebase:removeNotification', async (event, receiverId, senderId) => {
    try {
        console.log("main level: ", senderId, receiverId);
        await updateDoc(doc(db, 'users', senderId), {
            sendingreq: arrayRemove(receiverId)
        })
        await updateDoc(doc(db, 'users', receiverId), {
            pendingreq: arrayRemove(senderId)
        })
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to remove notification from ${senderId}`);
    }
});

ipcMain.handle('firebase:deleteRoom', async (event, roomId) => {
    try {
        const docRef = doc(db, "rooms", roomId);
        await deleteDoc(docRef);
        const collectionRef = collection(db, roomId);
        const snapshot = await getDocs(collectionRef);

        // Check if the collection is empty
        if (snapshot.empty) {
            console.log(`Collection ${roomId} is already empty.`);
            return;
        }

        // Delete each document in the collection
        const deletePromises = snapshot.docs.map(async (document) => {
            const docRef = doc(db, roomId, document.id);
            await deleteDoc(docRef);
            console.log(`Deleted document: ${document.id}`);
        });

        // Wait for all delete promises to resolve
        await Promise.all(deletePromises);
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to delete room ${roomId}`);
    }
});

ipcMain.handle('firebase:getRoomMessages', async (event, roomId) => {
    try {
        const roomCollection = collection(db, roomId);
        const querySnapshot = await getDocs(roomCollection);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching messages for room ${roomId}:`, error);
        throw new Error(`Failed to fetch messages for room ${roomId}`);
    }
});

ipcMain.handle('firebase:addRoomMessage', async (event, roomId, message) => {
    try {
        const roomCollection = collection(db, roomId);
        const docRef = await addDoc(roomCollection, message);
        return { id: docRef.id, ...message }; // Return the added message along with its new ID
    } catch (error) {
        console.error(`Error adding message to room ${roomId}:`, error);
        throw new Error(`Failed to add message to room ${roomId}`);
    }
});

ipcMain.handle('firebase:unfriend', async (event, userId, friendId) => {
    try {
        await updateDoc(doc(db, 'users', userId), {
            friends: arrayRemove(friendId)
        });
        await updateDoc(doc(db, 'users', friendId), {
            friends: arrayRemove(userId)
        })
    } catch (error) {
        console.error(`Error unfriending`);
        throw new Error(`Failed to unfriend ${friendId}`);
    }
});