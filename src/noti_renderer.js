async function initializeApp() {
    try {
        // Wait for currentUserId to be retrieved
        const currentUserId = await window.firebaseAPI.getCurrentUserId();

        if (currentUserId) {
            // Now you can load notifications safely
            await loadNotifications(currentUserId);
        } else {
            console.error("Failed to retrieve current user ID.");
            alert("Error loading user data. Please log in again.");
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Failed to initialize app.');
    }
}

// Modify loadNotifications to accept currentUserId as a parameter
async function loadNotifications(currentUserId) {
    try {
        // Fetch the notifications for the current user
        const notifications = await window.firebaseAPI.getNotifications(currentUserId);
        
        // Get the notification list element and clear any existing notifications
        const notificationList = document.getElementById('notificationList');
        notificationList.innerHTML = '';
        if(notifications.length < 1) return;
        // Iterate over notifications and fetch user data for each notification
        for (const senderId of notifications) {
            const userData = await window.firebaseAPI.getUserData(senderId);

            // Create list item for the notification
            const li = document.createElement('li');
            li.textContent = `From: ${userData.name}`;

            // Create the accept button and add click event
            const acceptButton = document.createElement('button');
            acceptButton.textContent = 'Accept';
            acceptButton.className = 'btn accept'; // Add styling class for consistency
            acceptButton.onclick = async () => {
                await acceptFriendRequest(currentUserId, senderId);
            };

            // Create the deny button and add click event
            const denyButton = document.createElement('button');
            denyButton.textContent = 'Deny';
            denyButton.className = 'btn deny'; // Add styling class for consistency
            denyButton.onclick = async () => {
                await denyFriendRequest(currentUserId, senderId);
            };

            // Append buttons to the list item
            li.appendChild(acceptButton);
            li.appendChild(denyButton);

            // Append the list item to the notification list
            notificationList.appendChild(li);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Accept and deny request logic, passing currentUserId as a parameter
async function acceptFriendRequest(currentUserId, senderId) {
    try {
        await window.firebaseAPI.acceptReq(currentUserId, senderId); // Add friend
        await window.firebaseAPI.removeNotification(currentUserId, senderId); // Remove notification
        loadNotifications(currentUserId); // Refresh notifications
    } catch (error) {
        console.error('Error accepting friend request:', error);
        alert('Failed to accept friend request.');
    }
}

async function denyFriendRequest(currentUserId, senderId) {
    try {
        await window.firebaseAPI.removeNotification(currentUserId, senderId); // Remove notification
        loadNotifications(currentUserId); // Refresh notifications
    } catch (error) {
        console.error('Error denying friend request:', error);
        alert('Failed to deny friend request.');
    }
}

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
// Call the initializeApp function when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);
