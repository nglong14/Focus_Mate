// src/index_renderer.js
const roomInput = document.getElementById('roomName');
const createRoomButton = document.getElementById('createRoom');
const showRoomListButton = document.getElementById('showRoomList');
const roomList = document.getElementById('rooms');

// src/renderer.js

document.getElementById('roomType').addEventListener('change', function() {
    const roomType = this.value;
    if (roomType === 'private') {
        document.getElementById('passwordField').style.display = 'block';
    } else {
        document.getElementById('passwordField').style.display = 'none';
    }
});

// Create Room feature
document.getElementById('submitCreateRoom').addEventListener('click', async () => {
    const roomName = document.getElementById('roomNameInput').value;
    const roomType = document.getElementById('roomType').value;
    const roomPassword = document.getElementById('createroomPassword').value;

    const roomData = {
        owner: await window.firebaseAPI.getCurrentUserId(),
        name: roomName,
        type: roomType,
        password: roomType === 'private' ? roomPassword : null,
        createdAt: new Date(),
    };

    try {
        await window.firebaseAPI.createRoom(roomData); // Upload room data to Firebase
        showPopup(`Room "${roomName}" created successfully!`);
        window.location.href = `room.html?id=${encodeURIComponent(roomName)}`;
        document.getElementById('createRoomForm').reset();
    } catch (error) {
        console.error("Error creating room:", error);
        showPopup("Failed to create room. Please try again.");
    }
});

async function joinRoom(roomName) {
    const existornot = await window.firebaseAPI.checkRoomExists(roomName);
    if(!existornot) {
        showPopup(`${roomName} does not exist, please try again.`);
        return;
    }
    const roomData = await window.firebaseAPI.getRoom(roomName);
    const isPrivate = (roomData.type == "private");
    
    if (isPrivate) {
        document.getElementById('passwordModal').style.display = 'block';
        document.getElementById('roomName').value = roomName; // Set the room name in the input
    } else {
        console.log(`Joining public room: ${roomName}`);
        window.location.href = `room.html?id=${encodeURIComponent(roomName)}`;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submitPassword').addEventListener('click', async () => {
        const password = document.getElementById('roomPassword').value.trim();
        const roomName = document.getElementById('roomName').value.trim();
        
        // Fetch room data from Firebase
        const roomData = await window.firebaseAPI.getRoom(roomName);
        
        // Debugging outputs
        console.log("Input password:", password);
        console.log("Room name:", roomName);
        console.log("Room data password:", roomData.password);
        
        if (password === roomData.password) {
            console.log(`Joining private room: ${roomName}`);
            window.location.href = `room.html?id=${encodeURIComponent(roomName)}`;
        } else {
            showPopup(`Incorrect password! Please try again`);
        }
    });
});


// Show Room List feature
showRoomListButton.addEventListener('click', async () => {
    roomList.innerHTML = ''; // Clear previous room list
    try {
        const rooms = await window.firebaseAPI.getRooms(); // Fetch rooms from Firestore
        rooms.forEach(({ id, data }) => {
            const li = document.createElement('li');
            li.innerText = data.name; // You can use data if you need additional information
            li.addEventListener('click', async () => {
                await joinRoom(data.name);
            });
            roomList.appendChild(li);
        });
        document.getElementById('roomList').style.display = 'block'; // Show the room list
    } catch (error) {
        console.error('Error fetching rooms:', error.message);
    }
});

document.getElementById('joinRoom').addEventListener('click', async () => {
    const roomName = document.getElementById('roomName').value.trim();
    joinRoom(roomName);
});

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('passwordModal').style.display = 'none';
});

const showInvitationPopup = (roomName, sender, roomId) => {
    console.log(`Received invitation from ${sender} to join room ${roomName}`);

    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.classList.add('btn', 'btn-success');
    acceptButton.addEventListener('click', () => acceptInvite(roomId));

    const denyButton = document.createElement('button');
    denyButton.textContent = 'Deny';
    denyButton.classList.add('btn', 'btn-danger');
    denyButton.addEventListener('click', hidePopup);

    // Append buttons to the popup
    const popupContent = document.getElementById('popup');
    
    popupContent.appendChild(acceptButton);
    popupContent.appendChild(denyButton);
    // Make sure to check if showPopup is functioning properly
    showPopup(`You have been invited to join ${roomName} by ${sender}.`);
};

window.electronAPI.receive('firestore:docChanged', async (roomName, sender, receiver, roomId) => {
    
    const userId = await window.firebaseAPI.getCurrentUserId();
    console.log(receiver, userId);
    if (receiver == userId) {
        showInvitationPopup(roomName, sender, roomId);
    }
});

const acceptInvite = (roomId) => {
    console.log(`Joining room ${roomId} after accepting invite.`);
    window.location.href = `room.html?id=${roomId}`; // Redirect user to the invited room
};

function showPopup(message) {
    document.getElementById('message').textContent = message;
    document.getElementById('popup').style.display = 'block';
}

function hidePopup(){
    document.getElementById('popup').style.display = 'none';
}

document.getElementById('closePopup').addEventListener('click', () => {
    hidePopup();
});