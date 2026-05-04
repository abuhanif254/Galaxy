'use client';

import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Story {
  id: string;
  authorId: string;
  imageUrl: string;
  expiresAt: number;
  createdAt: number;
  authorProfile?: {
    username: string;
    avatarUrl?: string;
  };
}

interface Props {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({ stories, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
    accumulatedTimeRef.current = 0;
    setProgress(0);
  }, [currentIndex]);

  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      if (isPaused) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }
      
      const elapsed = Date.now() - startTimeRef.current + accumulatedTimeRef.current;
      const newProgress = (elapsed / STORY_DURATION) * 100;
      
      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handlePointerDown = () => {
    setIsPaused(true);
    pausedAtRef.current = Date.now();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPaused(false);
    accumulatedTimeRef.current += Date.now() - pausedAtRef.current;
    
    // Quick tap check to navigate
    if (Date.now() - pausedAtRef.current < 200) {
      // If tapped on right 30%, next. If left 30%, prev.
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.3) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  const currentStory = stories[currentIndex];

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      {/* Background Image blurred */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110" 
        style={{ backgroundImage: `url(${currentStory.imageUrl})` }}
      />
      
      <div 
        className="relative w-full max-w-[450px] h-full sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col user-select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
         {/* Progress bars */}
         <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3 pt-4 sm:pt-4 bg-gradient-to-b from-black/60 to-transparent">
           {stories.map((s, i) => (
             <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
               {i === currentIndex && (
                 <div className="h-full bg-white" style={{ width: `${progress}%` }} />
               )}
               {i < currentIndex && <div className="h-full bg-white w-full" />}
             </div>
           ))}
         </div>

         {/* Author Header */}
         <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-8 sm:pt-8 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full overflow-hidden border border-white/50 bg-zinc-800">
                  <img src={currentStory.authorProfile?.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${currentStory.authorProfile?.username || 'story'}`} className="w-full h-full object-cover" alt="" />
               </div>
               <span className="text-white font-bold text-sm drop-shadow-md">
                 {currentStory.authorProfile?.username || 'User'}
               </span>
            </div>
         </div>
         
         <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="absolute top-8 sm:top-6 right-4 z-20 text-white/80 hover:text-white p-2"
         >
            <X className="w-6 h-6 drop-shadow-md" />
         </button>

         {/* Content */}
         <div className="flex-1 overflow-hidden flex items-center justify-center">
            <img 
               src={currentStory.imageUrl} 
               alt="Story" 
               className="w-full h-full object-contain"
               draggable={false}
            />
         </div>
         
         {/* Navigation Overlays (visible on desktop hover, mainly just hit areas) */}
         <div className="absolute inset-y-0 left-0 w-[30%] z-0" />
         <div className="absolute inset-y-0 right-0 w-[70%] z-0" />
      </div>
    </div>
  );
}
