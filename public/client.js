const LOCAL_IP_ADDRESS = "localhost";
const BACKEND_URL = "https://your-backend-url.up.railway.app";

const getElement = (id) => document.getElementById(id);

const [
  btnConnect,
  btnToggleVideo,
  btnToggleAudio,
  divRoomConfig,
  roomDiv,
  roomNameInput,
  localVideo,
  remoteVideo,
] = [
  "btnConnect",
  "toggleVideo",
  "toggleAudio",
  "roomConfig",
  "roomDiv",
  "roomName",
  "localVideo",
  "remoteVideo",
].map(getElement);
const roomTag = getElement("roomTag");

let socket = io.connect(BACKEND_URL);
let rtcPeerConnection, localStream, isCaller;
let iceCandidatesBuffer = [];
let remoteDescSet = false;

const streamConstraints = { audio: true, video: true };
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:your-turn-server.com:3478", //Still not Configured a Turn Server 
      username: "your-username",
      credential: "your-password",
    },
  ],
};

btnConnect.onclick = () => {
  const roomName = roomNameInput.value.trim();
  if (!roomName) return alert("Room cannot be empty!");
  socket.emit("joinRoom", roomName);
};

function showRoom(roomName) {
  divRoomConfig.classList.add("d-none");
  roomDiv.classList.remove("d-none");
  roomTag.innerText = `Room: ${roomName}`;
  roomTag.style.display = "block";
}

async function getLocalMedia() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia(streamConstraints);
    localVideo.srcObject = localStream;
  }
}

socket.on("roomFull", (roomName) => alert(`Room "${roomName}" is full.`));

socket.on("created", async (roomName) => {
  showRoom(roomName);
  await getLocalMedia();
  isCaller = true;
});

socket.on("joined", async (roomName) => {
  showRoom(roomName);
  await getLocalMedia();
  socket.emit("ready", roomName);
});

btnToggleVideo.onclick = () => toggleTrack("video");
btnToggleAudio.onclick = () => toggleTrack("audio");

function toggleTrack(type) {
  if (!localStream) return;
  const track = type === "video" ? localStream.getVideoTracks()[0] : localStream.getAudioTracks()[0];
  track.enabled = !track.enabled;
  const toggleBtn = getElement(`toggle${type.charAt(0).toUpperCase() + type.slice(1)}`);
  const icon = getElement(`${type}Icon`);
  toggleBtn.classList.toggle("enabled-style", track.enabled);
  toggleBtn.classList.toggle("disabled-style", !track.enabled);
  icon.classList.toggle(`fa-${type}`, track.enabled);
  icon.classList.toggle(`fa-${type}-slash`, !track.enabled);
}

function createPeerConnection(roomName) {
  rtcPeerConnection = new RTCPeerConnection(rtcConfig);

  rtcPeerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", { candidate: event.candidate, room: roomName });
    }
  };

  rtcPeerConnection.oniceconnectionstatechange = () => {
    console.log("ICE state:", rtcPeerConnection.iceConnectionState);
  };

  rtcPeerConnection.onconnectionstatechange = () => {
    console.log("Peer state:", rtcPeerConnection.connectionState);
  };

  rtcPeerConnection.ontrack = (event) => {
    if (event.streams[0]) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  localStream.getTracks().forEach((track) => rtcPeerConnection.addTrack(track, localStream));
}

socket.on("ready", async (roomName) => {
  if (isCaller) {
    createPeerConnection(roomName);
    const offer = await rtcPeerConnection.createOffer();
    await rtcPeerConnection.setLocalDescription(offer);
    socket.emit("offer", { sdp: offer, room: roomName });
  }
});

socket.on("offer", async ({ sdp, room }) => {
  if (!isCaller) {
    await getLocalMedia();
    createPeerConnection(room);
    await rtcPeerConnection.setRemoteDescription(sdp);
    remoteDescSet = true;
    const answer = await rtcPeerConnection.createAnswer();
    await rtcPeerConnection.setLocalDescription(answer);
    socket.emit("answer", { sdp: answer, room });

    // Apply buffered candidates
    iceCandidatesBuffer.forEach((candidate) => {
      rtcPeerConnection.addIceCandidate(candidate).catch(console.error);
    });
    iceCandidatesBuffer = [];
  }
});

socket.on("answer", async ({ sdp }) => {
  await rtcPeerConnection.setRemoteDescription(sdp);
  remoteDescSet = true;
  iceCandidatesBuffer.forEach((candidate) => {
    rtcPeerConnection.addIceCandidate(candidate).catch(console.error);
  });
  iceCandidatesBuffer = [];
});

socket.on("candidate", ({ candidate }) => {
  if (remoteDescSet && rtcPeerConnection) {
    rtcPeerConnection.addIceCandidate(candidate).catch(console.error);
  } else {
    iceCandidatesBuffer.push(candidate);
  }
});

socket.on("userDisconnected", () => {
  if (rtcPeerConnection) {
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
  remoteVideo.srcObject = null;
});
