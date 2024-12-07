async function fetchLeaderboard() {
    try {
        const users = await window.firebaseAPI.getUsersData(); // Fetch users data from Firestore
        users.sort((a, b) => b.balance - a.balance); // Sort users by balance in ascending order

        const leaderboardBody = document.getElementById("leaderboard-body");
        leaderboardBody.innerHTML = ''; // Clear existing rows

        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.balance} coins</td>
                <td>${user.backgrounds.length}</td>
            `;

            // Add click event to navigate to user profile page
            row.addEventListener('click', () => {
                window.location.href = `profile.html?userId=${user.id}`; // Redirect to profile page with userId
            });

            leaderboardBody.appendChild(row); // Add row to the table
        });
    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
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

// Call fetchLeaderboard when the window is loaded
window.onload = fetchLeaderboard;
