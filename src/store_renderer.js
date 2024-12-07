async function loadStore() {
    const backgroundsList = document.getElementById("backgrounds-store");
    const userBalanceEl = document.getElementById("balance-amount");
    const userId = await window.firebaseAPI.getCurrentUserId();
    const userData = await window.firebaseAPI.getUserData(userId);
    let userBalance = userData.balance;
    
    userBalanceEl.textContent = userBalance;

    const ownedBackgrounds = userData.backgrounds;

    // Fetch and display backgrounds from Firebase Storage
    const allBackgrounds = await window.firebaseAPI.getBackgroundsInfo("all");
    for (const back_data of allBackgrounds) {
        const productDiv = document.createElement("div");
        productDiv.classList.add("store-item");

        const isOwned = ownedBackgrounds.includes(back_data.name);

        productDiv.innerHTML = `
            <img src="${back_data.url}" alt="${back_data.name}">
            <h4>${back_data.name}</h4>
            <button class="${isOwned ? 'purchased' : ''}" 
                    ${isOwned ? 'disabled' : ''}>
                ${isOwned ? 'Purchased' : 'Purchase for 50 coins'}
            </button>
        `;

        productDiv.querySelector('button').addEventListener('click', async function () {
            if (isOwned) return;

            if (userBalance >= 50) {
                // Deduct balance, update user backgrounds, and update Firestore
                userBalance -= 50;
                userBalanceEl.textContent = userBalance;

                await window.firebaseAPI.setDoc('users', userId, {balance: userBalance});
                await window.firebaseAPI.addNewBack(userId, back_data.name);
                // Update button state
                this.textContent = 'Purchased';
                this.classList.add('purchased');
                this.disabled = true;
            } else {
                alert("You don't have enough coins to purchase this background.");
            }
        });

        backgroundsList.appendChild(productDiv);
    }
}

// Call the loadStore function to display the store
loadStore();
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