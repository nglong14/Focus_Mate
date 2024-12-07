let userId;
let currentUserId;

const showFriendsButton = document.getElementById('showFriends');
const popupFriendList = document.getElementById('popup-friend-list');
const friendList = document.getElementById('friendList');
const closePopupButton = document.getElementById('closePopup');

document.getElementById('closefriendpopup').addEventListener('click', () => {
    document.getElementById("popup-overlay").style.display = "none";
    document.getElementById("popup-friend-list").style.display = "none";
});

document.getElementById("popup-overlay").addEventListener("click", function () {
    document.getElementById("popup-overlay").style.display = "none";
    document.getElementById("popup-friend-list").style.display = "none";
});

showFriendsButton.addEventListener('click', async () => {
    try {
        // Fetch friend list from Firebase
        const userData = await window.firebaseAPI.getUserData(userId);
        const friends = userData.friends;
        // Clear the previous list
        friendList.innerHTML = '';
        // Populate friend list with "Unfriend" button
        if(friends.length > 0){
            for (const friend of friends){
                const friendData = await window.firebaseAPI.getUserData(friend);
                const li = document.createElement('li');
                li.textContent = friendData.name;
    
                const unfriendButton = document.createElement('button');
                unfriendButton.textContent = 'Unfriend';
                unfriendButton.classList.add('btn', 'btn-danger', 'btn-sm', 'ms-2');
                
                // Unfriend action
                unfriendButton.addEventListener('click', async () => {
                    try {
                        await window.firebaseAPI.unfriend(currentUserId, friend); // Assuming friend.id is the friend's unique identifier
                        li.remove(); // Remove the friend item from the list
                    } catch (error) {
                        console.error('Error unfriending user:', error);
                        alert(`Failed to unfriend ${friendData.name}.`);
                    } 
                });
    
                li.appendChild(unfriendButton);
                friendList.appendChild(li);
            };
        }
        
        // Show the pop-up
        document.getElementById("popup-overlay").style.display = "block";
        document.getElementById("popup-friend-list").style.display = "block";
    } catch (error) {
        console.error('Error loading friend list:', error);
        alert('Failed to load friend list.');
    }
});

function getUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('userId');
}

async function checkUserStatus() {
    try {
        // Get the userId from the URL or the current user's ID
        const urlUserId = getUserIdFromUrl();
        currentUserId = await window.firebaseAPI.getCurrentUserId();
        userId = urlUserId || currentUserId;

        if (userId) {
            console.log(`User is signed in with UID: ${userId}`);
            await fetchUserData(userId); // Fetch user data based on userId

            // Check if the current user is viewing their own profile
            if (urlUserId && urlUserId !== currentUserId) {
                hideEditControls(); // Hide controls if viewing another user's profile
            }else{
                document.getElementById('addFriend').style.display = 'none';
            }
        } else {
            console.log('User is signed out.');
        }
    } catch (error) {
        console.error("Error checking user status:", error);
    }
}

function hideEditControls() {
    // Hide the avatar change button, name input, and save button
    document.getElementById('changeAvatar').style.display = 'none';
    document.getElementById('nameInput').style.display = 'none';
    document.getElementById('saveName').style.display = 'none';
    document.getElementById('logOut').style.display = 'none'; // Optionally hide log out as well
    document.getElementById('avatarInput').style.display = 'none';
    document.getElementById('avatarInput').style.display = 'none';
    showFriendsButton.style.display = 'none';
}

function updOwnedBackgrounds(backgrounds) {
    const backgroundsList = document.getElementById("backgrounds-list");
    backgroundsList.innerHTML = ''; // Clear any existing backgrounds
    backgrounds.forEach(function (background) {
        const backgroundDiv = document.createElement("div");
        backgroundDiv.classList.add("background-item");

        backgroundDiv.innerHTML = `
            <img src="${background.url}" alt="${background.name}">
            <h4>${background.name}</h4>
        `;
        backgroundsList.appendChild(backgroundDiv);
    });
}

// Function to fetch user data from Firestore
async function fetchUserData(userId) {
    try {
        const userData = await window.firebaseAPI.getUserData(userId);  // Fetch user data from Firestore
        if (userData) {
            document.getElementById('userName').innerText = userData.name;
            document.getElementById('nameInput').value = userData.name;
            console.log(userData.avatar);
            document.getElementById('avatar').src = userData.avatar;  // Set the user's avatar
            document.getElementById('balance-amount').innerText = userData.balance;
            const backgrounds = await window.firebaseAPI.getBackgroundsInfo(userData.backgrounds);
            updOwnedBackgrounds(backgrounds);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

// Call checkUserStatus when the window is loaded
window.onload = checkUserStatus;

// Change avatar
document.getElementById('changeAvatar').addEventListener('click', async () => {
    const file = document.getElementById('avatarInput').files[0];
    if (file) {
        console.log(userId, file.name);

        // Send file to preload to handle buffer conversion and upload
        const avatarUrl = await window.firebaseAPI.uploadFile('avartars', userId, file);

        // Update avatar URL in Firestore
        await window.firebaseAPI.updateUserAvatar(userId, avatarUrl);
        document.getElementById('avatar').src = avatarUrl; // Update displayed avatar
    }
});

// Save name
document.getElementById('saveName').addEventListener('click', async () => {
    const newName = document.getElementById('nameInput').value;

    // Update name in Firestore
    await window.firebaseAPI.updateUserName(userId, newName);
    document.getElementById('userName').innerText = newName; // Update displayed name
});

// Log out functionality
document.getElementById('logOut').addEventListener('click', async () => {
    await window.firebaseAPI.signOut(); // Call signOut method from firebaseAPI
    window.location.href = 'auth.html'; // Redirect to authentication page after logging out
});

document.getElementById('addFriend').addEventListener('click', async () => {
    try {
        await window.firebaseAPI.addFriend(currentUserId, userId); // Add friend functionality
    } catch (error) {
        console.error('Error adding friend:', error);
        alert('Failed to send friend request.');
    }
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