const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const loginButton = document.getElementById('loginSubmit');
const signupButton = document.getElementById('signupSubmit');
const logintog = document.getElementById('loginBtn');
const signuptog = document.getElementById('signupBtn');

function showPopup(message) {
    document.getElementById('message').textContent = message;
    document.getElementById('popup').style.display = 'block';
}

document.getElementById('closePopup').addEventListener('click', () => {
    document.getElementById('popup').style.display = 'none';
});

logintog.addEventListener('click', () => {
    loginSection.style.display = 'block';
    signupSection.style.display = 'none';
});

signuptog.addEventListener('click', () => {
    signupSection.style.display = 'block';
    loginSection.style.display = 'none';
});


signupButton.addEventListener('click', async () => {
    const name = document.getElementById('signupName').value; 
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    if(password.length <= 6){
        showPopup("Password must contains more than 6 characters, please try again.");
        return;
    }
    try {
        const user = await window.firebaseAPI.createUserWithEmailAndPassword(email, password);
        await window.firebaseAPI.setDoc('users', user.uid, {
            name: name,
            avatar: '',
            backgrounds: [],
            balance: 0,
            friends: [],
            pendingreq: [],
            sendingreq: []
        });
        // Inform the user to check their email for verification
        showPopup("A verification email has been sent. Please verify your email before logging in.");

        // Optionally, you can redirect or clear the form
        signupSection.style.display = 'none';
        loginSection.style.display = 'block';

    } catch (error) {
        console.error('Sign up error:', error);
        showPopup(error.message);
    }
});

// When the user attempts to log in, check if the email is verified
loginButton.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const user = await window.firebaseAPI.signInWithEmailAndPassword(email, password);

        // Check if the user email is verified
        if (!user.verified) {
            showPopup("Please verify your email before logging in.");
            return;
        }
        // Proceed to the main application
        console.log('Login successful');
        // Your logic for successful login goes here
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Login error:', error);
        showPopup(error.message);
    }
});
