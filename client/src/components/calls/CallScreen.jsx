import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import Avatar from '../ui/Avatar';
import api from '../../utils/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CallScreen = ({ callData, socket, currentUser, onEnd }) => {
  const { peer, callType, incoming, offer } = callData;
  const [status, setStatus] = useState(incoming ? 'incoming' : 'calling');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === 'video');
  const [speakerOn, setSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnRef = useRef();
  const localStreamRef = useRef();
  const timerRef = useRef();
  const wasConnectedRef = useRef(false);
  const durationRef = useRef(0);

  useEffect(() => { durationRef.current = duration; }, [duration]);

  const startTimer = () => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const formatDuration = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const saveMissedCall = async (receiverId) => {
    try {
      const res = await api.post('/messages/missed-call', { receiverId, callType });
      const { message, conversationId } = res.data;
      socket?.emit('message:send', { message, receiverId, conversationId });
    } catch (err) {
      console.error('Failed to save missed call:', err);
    }
  };

  const saveEndedCall = async (receiverId, dur) => {
    try {
      const res = await api.post('/messages/ended-call', { receiverId, callType, duration: dur });
      const { message, conversationId } = res.data;
      socket?.emit('message:send', { message, receiverId, conversationId });
    } catch (err) {
      console.error('Failed to save ended call:', err);
    }
  };

  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = audioStream;
      return audioStream;
    }
  };

  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnRef.current = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket?.emit('call:ice-candidate', { receiverId: peer.id, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        wasConnectedRef.current = true;
        setStatus('connected');
        startTimer();
      }
    };
    return pc;
  };

  const initiateCall = async () => {
    try {
      const stream = await getMedia();
      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit('call:initiate', { receiverId: peer.id, callType, offer });
      setStatus('calling');
    } catch (err) {
      console.error('Call initiation failed', err);
      onEnd();
    }
  };

  const answerCall = async () => {
    try {
      setStatus('connecting');
      const stream = await getMedia();
      const pc = createPeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit('call:answer', { callerId: peer.id, answer });
    } catch (err) {
      console.error('Answer failed', err);
      onEnd();
    }
  };

  const rejectCall = () => {
    socket?.emit('call:reject', { callerId: peer.id });
    onEnd();
  };

  const endCall = async () => {
    const wasConnected = wasConnectedRef.current;
    const finalDuration = durationRef.current;
    socket?.emit('call:end', { receiverId: peer.id });
    cleanup();
    if (wasConnected) {
      await saveEndedCall(peer.id, finalDuration);
    } else if (!incoming) {
      await saveMissedCall(peer.id);
    }
    onEnd();
  };

  const cleanup = () => {
    clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnRef.current?.close();
  };

  const toggleMic = () => setMicOn(p => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !p); return !p; });
  const toggleCam = () => setCamOn(p => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !p); return !p; });

  useEffect(() => {
    if (!incoming) initiateCall();

    socket?.on('call:answered', async ({ answer }) => {
      await peerConnRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket?.on('call:ice-candidate', async ({ candidate }) => {
      try { await peerConnRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    socket?.on('call:ended', async () => {
      const wasConnected = wasConnectedRef.current;
      const finalDuration = durationRef.current;
      cleanup();
      // Receiver saves their copy when caller ends
      if (wasConnected && incoming) await saveEndedCall(peer.id, finalDuration);
      onEnd();
    });

    socket?.on('call:rejected', async () => {
      cleanup();
      if (!incoming) await saveMissedCall(peer.id);
      onEnd();
    });

    return () => {
      socket?.off('call:answered');
      socket?.off('call:ice-candidate');
      socket?.off('call:ended');
      socket?.off('call:rejected');
      cleanup();
    };
  }, []);

  const RingingDots = () => (
    <div className="flex gap-1.5 items-center justify-center mt-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(160deg, #1a0533 0%, #0f172a 50%, #0c1a0f 100%)' }}>

      {/* Video streams */}
      {callType === 'video' && (
        <>
          <video ref={remoteVideoRef} autoPlay playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-90" />
          <video ref={localVideoRef} autoPlay playsInline muted
            className="absolute bottom-36 right-4 w-28 h-36 object-cover rounded-2xl z-20
              border-2 border-white/20 shadow-2xl" />
        </>
      )}

      {/* Peer info */}
      <div className="relative z-10 flex flex-col items-center pt-16 pb-6 flex-1">
        <div className="relative mb-5">
          {status === 'connected' && (
            <>
              <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping scale-110" />
              <span className="absolute inset-0 rounded-full bg-green-500/10 scale-125" />
            </>
          )}
          {status === 'incoming' && (
            <>
              <span className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-violet-500/20 scale-110 animate-ping"
                style={{ animationDelay: '0.3s' }} />
            </>
          )}
          <div className={`relative rounded-full p-1
            ${status === 'connected' ? 'ring-2 ring-green-400/50' : 'ring-2 ring-white/10'}`}>
            <Avatar user={peer} size="2xl" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white tracking-tight mb-1 drop-shadow-lg">
          {peer?.username}
        </h2>

        <div className="flex flex-col items-center gap-1">
          {status === 'incoming' && (
            <>
              <p className="text-white/70 text-sm font-medium">
                Incoming {callType === 'video' ? 'video' : 'voice'} call
              </p>
              <RingingDots />
            </>
          )}
          {status === 'calling' && (
            <>
              <p className="text-white/70 text-sm font-medium">Calling...</p>
              <RingingDots />
            </>
          )}
          {status === 'connecting' && <p className="text-white/60 text-sm">Connecting...</p>}
          {status === 'connected' && (
            <p className="text-green-400 text-sm font-semibold tracking-wide">
              {formatDuration(duration)}
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-20 pb-14">
        {status === 'incoming' ? (
          <div className="flex items-center justify-center gap-20">
            <div className="flex flex-col items-center gap-2">
              <button onClick={rejectCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 active:scale-90 rounded-full
                  flex items-center justify-center text-white shadow-xl transition-all ring-4 ring-red-500/30">
                <PhoneOff size={26} />
              </button>
              <span className="text-white/60 text-xs">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={answerCall}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 active:scale-90 rounded-full
                  flex items-center justify-center text-white shadow-xl transition-all
                  ring-4 ring-green-500/30 animate-bounce">
                <Phone size={26} />
              </button>
              <span className="text-white/60 text-xs">Accept</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-5 px-8">
            <div className="flex flex-col items-center gap-1.5">
              <button onClick={toggleMic}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg
                  ${micOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-gray-900'}`}>
                {micOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              <span className="text-white/50 text-[10px]">{micOn ? 'Mute' : 'Unmute'}</span>
            </div>

            {callType === 'video' && (
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={toggleCam}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg
                    ${camOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-gray-900'}`}>
                  {camOn ? <Video size={22} /> : <VideoOff size={22} />}
                </button>
                <span className="text-white/50 text-[10px]">{camOn ? 'Camera' : 'Camera off'}</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-1.5">
              <button onClick={endCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 active:scale-90 rounded-full
                  flex items-center justify-center text-white shadow-2xl transition-all ring-4 ring-red-500/30">
                <PhoneOff size={26} />
              </button>
              <span className="text-white/50 text-[10px]">End</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button onClick={() => setSpeakerOn(p => !p)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg
                  ${speakerOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-gray-900'}`}>
                {speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
              <span className="text-white/50 text-[10px]">Speaker</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallScreen;


