const { contextBridge, ipcRenderer } = require('electron');
const io = require('socket.io-client'); // Default import for socket.io-client

//Expose Firebase authentication and Firestore to the renderer process
contextBridge.exposeInMainWorld('firebaseAPI', {
    getRooms: () => ipcRenderer.invoke('firestore:getRooms'),
    getRoom: (roomname) => ipcRenderer.invoke('firestore:getRoom', roomname),
    createRoom: (room) => ipcRenderer.invoke('firestore:createRoom', room),
    setDoc: (collectionName, docId, data) => ipcRenderer.invoke('firestore:setDoc', collectionName, docId, data),
    getDoc: (collectionName, docId) => ipcRenderer.invoke('firestore:getDoc', collectionName, docId),
    addDoc: (collectionName, data) => ipcRenderer.invoke('firestore:addDoc', collectionName, data),
    signInWithEmailAndPassword: (email, password) => ipcRenderer.invoke('auth:signin', email, password),
    createUserWithEmailAndPassword: (email, password) => ipcRenderer.invoke('auth:signup', email, password),
    getUserData: (userId) => ipcRenderer.invoke('firestore:getuserdata', userId),
    getUsersData: () => ipcRenderer.invoke('firestore:getusersdata'),
    uploadFile: (colname, userId, file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const arrayBuffer = reader.result;
                const buffer = Buffer.from(arrayBuffer); // Convert to Buffer

                ipcRenderer.invoke('storage:uploadavatar', colname, userId, buffer, file.name)
                    .then(resolve)
                    .catch(reject);
            };

            reader.onerror = reject;
            reader.readAsArrayBuffer(file); // Read the file as an ArrayBuffer
        });
    },
    updateUserAvatar: (userId, avatarUrl) => ipcRenderer.invoke('firestore:updateuseravatar', userId, avatarUrl),
    updateUserName: (userId, name) => ipcRenderer.invoke('firestore:updateusername', userId, name),
    signOut: () => ipcRenderer.invoke('auth:signout'),
    getCurrentUserId: () => ipcRenderer.invoke('auth:getcurrentuserid'),
    checkRoomExists: (roomName) => ipcRenderer.invoke('firebase:checkroomexists', roomName),
    getBackgroundsInfo: (backgrounds) => ipcRenderer.invoke('firebase:getbackgroundsinfo', backgrounds),
    addNewBack: (userId, back_name) => ipcRenderer.invoke('firebase:addNewBack', userId, back_name),
    addFriend: (senderId, receiverId) => ipcRenderer.invoke('firebase:addFriend', senderId, receiverId),
    getNotifications: (id) => ipcRenderer.invoke('firebase:getNoti', id),
    acceptReq: (senderId, receiverId) => ipcRenderer.invoke('firebase:acceptReq', senderId, receiverId),
    removeNotification: (senderId, receiverId) => ipcRenderer.invoke('firebase:removeNotification', senderId, receiverId),
    deleteRoom: (roomId) => ipcRenderer.invoke('firebase:deleteRoom', roomId),
    getRoomMessages: (roomId) => ipcRenderer.invoke('firebase:getRoomMessages', roomId),
    addRoomMessage: (roomId, message) => ipcRenderer.invoke('firebase:addRoomMessage', roomId, message),
    unfriend: (userId, friendId) => ipcRenderer.invoke('firebase:unfriend', userId, friendId)
});

// Expose IPC methods
contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

// Socket.IO connection
const socket = io('https://peaceful-lowlands-03981-18d6f1e5d4e3.herokuapp.com/');
// const socket = io('http://localhost:3000');

// Listen for the connect event
socket.on('connect', () => {
    console.log('Successfully connected to the server!');
});

// Optional: Listen for connection errors
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

contextBridge.exposeInMainWorld('socketAPI', {
    emit: (event, data) => socket.emit(event, data), // Explicit emit function
    on: (event, callback) => socket.on(event, callback), // Explicit on function
    once: (event, callback) => socket.once(event, callback), // Add the once function
});


// Listen for authentication state changes
let userIdPromise;

ipcRenderer.on('auth:stateChanged', (event, userId) => {
    console.log("User ID:", userId);
    
    if (!userIdPromise) {
        userIdPromise = Promise.resolve(userId); // Resolve with userId
    }
});

window.dispatchEvent(new CustomEvent('authStateChanged', { detail: userIdPromise }));

console.log("Preload script loaded.");