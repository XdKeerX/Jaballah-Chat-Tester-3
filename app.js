// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3botisS2RJAp-tXzuiSXBN6IsPF1VqqU",
  authDomain: "jaballahchat2.firebaseapp.com",
  projectId: "jaballahchat2",
  storageBucket: "jaballahchat2.firebasestorage.app",
  messagingSenderId: "522188993010",
  appId: "1:522188993010:web:9494cd2f625ee08a33fb6b",
  measurementId: "G-HF7RLY6BZJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- CHAT LOGIC ---
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesList = document.getElementById('messages');

// A unique ID for the user session (can be replaced with actual user auth)
const userSessionId = Math.random().toString(36).substr(2, 9);

// Listen for new messages
db.collection('messages').orderBy('timestamp').onSnapshot(snapshot => {
    messagesList.innerHTML = ''; // Clear old messages
    snapshot.forEach(doc => {
        const msg = doc.data();
        const li = document.createElement('li');
        li.textContent = msg.text;
        // Check if the message was sent by the current user
        li.className = msg.sender === userSessionId ? 'sent' : 'received';
        messagesList.appendChild(li);
    });
    // Scroll to the bottom
    messagesList.scrollTop = messagesList.scrollHeight;
});

// Send a message
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const messageText = messageInput.value;
    if (messageText.trim() === '') return;

    db.collection('messages').add({
        text: messageText,
        sender: userSessionId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    messageInput.value = '';
});


// --- VIDEO CALL LOGIC ---
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const createCallBtn = document.getElementById('createCallBtn');
const joinCallBtn = document.getElementById('joinCallBtn');
const hangupBtn = document.getElementById('hangupBtn');
const callIdInput = document.getElementById('callIdInput');
const currentCallIdDiv = document.getElementById('currentCallId');

// Get user media
async function setupStreams() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();

    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    };

    localVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;

    createCallBtn.disabled = false;
    joinCallBtn.disabled = false;
}

setupStreams();

// 1. Create a new call
createCallBtn.onclick = async () => {
    const callDoc = db.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    callIdInput.value = callDoc.id;
    currentCallIdDiv.innerText = `Your Call ID: ${callDoc.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(callDoc.id).then(() => {
        alert('Call ID copied to clipboard!');
    });

    pc.onicecandidate = (event) => {
        event.candidate && offerCandidates.add(event.candidate.toJSON());
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    };

    await callDoc.set({ offer });

    callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
        }
    });

    answerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
            }
        });
    });

    hangupBtn.disabled = false;
};

// 2. Join a call
joinCallBtn.onclick = async () => {
    const callId = callIdInput.value;
    if (!callId) {
        return alert('Please enter a call ID');
    }
    const callDoc = db.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    pc.onicecandidate = (event) => {
        event.candidate && answerCandidates.add(event.candidate.toJSON());
    };

    const callData = (await callDoc.get()).data();
    const offerDescription = new RTCSessionDescription(callData.offer);
    await pc.setRemoteDescription(offerDescription);

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                let data = change.doc.data();
                pc.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });

    hangupBtn.disabled = false;
};

// 3. Hang up
hangupBtn.onclick = () => {
    // Stop all tracks
    localStream.getTracks().forEach(track => track.stop());
    remoteStream.getTracks().forEach(track => track.stop());

    // Close the connection
    pc.close();

    // Reset UI
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    createCallBtn.disabled = false;
    joinCallBtn.disabled = false;
    hangupBtn.disabled = true;
    callIdInput.value = '';
    currentCallIdDiv.innerText = '';
    
    // Reload the page to reset the state for a new call
    window.location.reload();
};
