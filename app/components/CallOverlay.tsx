'use client';

import { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  remoteUser: {
    displayName: string;
    avatarUrl?: string;
    username: string;
  };
  onClose: () => void;
  isVideo: boolean;
}

export default function CallOverlay({ remoteUser, onClose, isVideo }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(!isVideo);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true })
      .then(s => {
         if (!mounted) {
           s.getTracks().forEach(t => t.stop());
           return;
         }
         setStream(s);
         if (localVideoRef.current) {
           localVideoRef.current.srcObject = s;
         }
         setTimeout(() => {
            if (mounted) setStatus('Ringing...');
            setTimeout(() => {
              if (mounted) setStatus('00:00'); // Mock answered
            }, 3000);
         }, 1000);
      })
      .catch(err => {
         console.error(err);
         setStatus('Camera/Microphone access denied');
      });

    return () => {
      mounted = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [isVideo]);

  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !isMuted);
      stream.getVideoTracks().forEach(t => t.enabled = !isVideoDisabled);
    }
  }, [isMuted, isVideoDisabled, stream]);

  const handleEndCall = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col pointer-events-auto">
       <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Main Stage: Remote User (mocked with Avatar since no actual WebRTC is set up for demo) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <div className="w-32 h-32 rounded-full overflow-hidden mb-6 relative">
                 <div className="absolute inset-0 bg-blue-500/20 animate-ping rounded-full" />
                 {remoteUser.avatarUrl ? (
                   <img src={remoteUser.avatarUrl} alt="" className="w-full h-full object-cover relative z-10" />
                 ) : (
                   <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${remoteUser.username}`} className="w-full h-full object-cover relative z-10 bg-white" />
                 )}
             </div>
             <h2 className="text-3xl font-bold text-white mb-2">{remoteUser.displayName}</h2>
             <p className="text-zinc-400">{status}</p>
          </div>

          {/* Local Video Picture-in-Picture */}
          {(!isVideoDisabled && isVideo) && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="absolute bottom-6 right-6 w-32 md:w-48 aspect-[3/4] bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-700/50"
            >
               <video 
                 ref={localVideoRef} 
                 autoPlay 
                 playsInline 
                 muted 
                 className="w-full h-full object-cover bg-black" 
               />
            </motion.div>
          )}
       </div>

       {/* Controls */}
       <div className="h-28 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-6 pb-6">
          <button 
             onClick={() => setIsMuted(!isMuted)}
             className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${isMuted ? 'bg-white text-zinc-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
             {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <button 
             onClick={handleEndCall}
             className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-95"
          >
             <PhoneOff className="w-7 h-7" />
          </button>

          {isVideo && (
            <button 
               onClick={() => setIsVideoDisabled(!isVideoDisabled)}
               className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${isVideoDisabled ? 'bg-white text-zinc-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
               {isVideoDisabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}
       </div>
    </div>
  );
}
