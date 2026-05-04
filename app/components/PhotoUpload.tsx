'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { X, Upload, Wand2, Plus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from './ui/use-toast';

interface Props {
  type: 'post' | 'story';
  onClose: () => void;
}

const FILTERS = [
  { name: 'Normal', filter: 'none' },
  { name: 'Clarendon', filter: 'contrast(1.2) saturate(1.35) brightness(1.1)' },
  { name: 'Gingham', filter: 'sepia(0.3) contrast(0.9) brightness(1.05) hue-rotate(-10deg)' },
  { name: 'Moon', filter: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'Lark', filter: 'contrast(0.9) saturate(1.2)' },
  { name: 'Reyes', filter: 'sepia(0.2) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'Juno', filter: 'contrast(1.15) saturate(1.3) sepia(0.15) hue-rotate(-15deg)' },
];

export default function PhotoUpload({ type, onClose }: Props) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0].filter);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const f = acceptedFiles[0];
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreviewURL(url);
    }
  });

  const applyFilterToCanvasAndGetDataUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!previewURL) return resolve('');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return resolve('');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        // Maintain aspect ratio, max width/height processing
        const MAX_DIMENSION = 1080;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }
        
        canvas.width = width;
        canvas.height = height;

        ctx.filter = selectedFilter;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = previewURL;
    });
  };

  const handleSubmit = async () => {
    if (!user || !previewURL || !storage) return;
    setIsUploading(true);

    try {
      const finalImageDataUrl = await applyFilterToCanvasAndGetDataUrl();
      
      const imageRef = ref(storage, `images/${user.uid}/${Date.now()}.jpg`);
      await uploadString(imageRef, finalImageDataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(imageRef);
      
      if (type === 'post') {
        const postId = `post_${Date.now()}`;
        try {
          await setDoc(doc(db, 'posts', postId), {
            authorId: user.uid,
            imageUrl: downloadUrl,
            caption,
            visibility: 'public', // Simple default
            likeCount: 0,
            commentCount: 0,
            createdAt: serverTimestamp(),
          });
          toast({
            title: "Success",
            description: "Your post has been published.",
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `posts/${postId}`);
        }
      } else {
        const storyId = `story_${Date.now()}`;
        try {
           await setDoc(doc(db, 'stories', storyId), {
            authorId: user.uid,
            imageUrl: downloadUrl,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            createdAt: serverTimestamp(),
          });
          toast({
            title: "Success",
            description: "Your story has been shared.",
          });
        } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, `stories/${storyId}`);
        }
      }
      onClose();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Error uploading image to storage. Please try again later.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[80vh] md:h-auto max-h-[800px]">
        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="bg-zinc-100 dark:bg-black/40 flex-1 relative flex items-center justify-center min-h-[50vh] md:min-h-[500px]">
          {!previewURL ? (
            <div {...getRootProps()} className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-8">
              <input {...getInputProps()} />
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 mb-6 font-semibold animate-pulse">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-center text-zinc-900 dark:text-zinc-100">Select a photo to share</h3>
              <p className="text-zinc-500 text-center max-w-[200px]">Drag and drop an image here, or click to browse</p>
            </div>
          ) : (
             <div className="relative w-full h-full p-4 flex items-center justify-center">
                {/* Visual Preview */}
                <img 
                  src={previewURL} 
                  style={{ filter: selectedFilter }}
                  className="max-w-full max-h-full object-contain shadow-lg border border-black/5 rounded-lg"
                  alt="Preview" 
                />
             </div>
          )}
        </div>

        <div className="w-full md:w-80 border-t md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[50vh] md:max-h-none overflow-y-auto bg-white dark:bg-zinc-900">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
            <h3 className="font-bold text-lg">{type === 'post' ? 'New Post' : 'New Story'}</h3>
            <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="p-5 space-y-6 flex-1">
            {previewURL && (
              <div>
                 <div className="flex items-center gap-2 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <Wand2 className="w-4 h-4"/>
                    Filters
                 </div>
                 <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
                    {FILTERS.map(f => (
                      <button 
                        key={f.name}
                        onClick={() => setSelectedFilter(f.filter)}
                        className={`snap-center flex-shrink-0 flex flex-col items-center gap-2 group`}
                      >
                        <div className={`w-16 h-16 rounded-xl overflow-hidden transition-all duration-300 ring-offset-2 dark:ring-offset-zinc-900 ${selectedFilter === f.filter ? 'ring-2 ring-blue-500' : 'opacity-70 group-hover:opacity-100'}`}>
                          <img 
                            src={previewURL} 
                            style={{ filter: f.filter }} 
                            className="w-full h-full object-cover" 
                            alt={f.name} 
                          />
                        </div>
                        <span className={`text-xs font-medium ${selectedFilter === f.filter ? 'text-blue-600' : 'text-zinc-500'}`}>{f.name}</span>
                      </button>
                    ))}
                 </div>
              </div>
            )}

            {type === 'post' && (
              <div>
                <textarea 
                  placeholder="Share your thoughts... (optional)" 
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 min-h-[120px] transition-all"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 mt-auto sticky bottom-0 z-10">
             <button 
                onClick={handleSubmit}
                disabled={!previewURL || isUploading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? 'Publishing...' : 'Publish'}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
