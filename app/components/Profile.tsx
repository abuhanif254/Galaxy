'use client';

import { useAuthStore } from '@/lib/auth-store';
import { db, storage, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useEffect, useState, useRef } from 'react';
import { Settings, Image as ImageIcon, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import PostCard from './PostCard';

interface Post {
  id: string;
  authorId: string;
  imageUrl: string;
  caption?: string;
  likeCount: number;
  commentCount: number;
  createdAt: number;
}

export default function Profile() {
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingOp, setIsUploadingOp] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Post[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Post);
      });
      data.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(data);
    }, (error) => {
      console.error(error);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (profile && !isEditing) {
      setEditBio(profile.bio || '');
      setEditName(profile.displayName || '');
    }
  }, [profile, isEditing]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName,
        bio: editBio
      });
      setIsEditing(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingOp(true);
    
    try {
      const url = URL.createObjectURL(file);
      // Wait, we need to upload to storage
      // To compress, let's use a simple canvas approach like photo upload, or just upload directly for simplicity
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const imageRef = ref(storage, `avatars/${user.uid}/${Date.now()}.jpg`);
        await uploadString(imageRef, dataUrl, 'data_url');
        const downloadUrl = await getDownloadURL(imageRef);
        await updateDoc(doc(db, 'users', user.uid), {
          avatarUrl: downloadUrl
        });
        setIsUploadingOp(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploadingOp(false);
    }
  };

  if (!profile) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Profile Header */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-zinc-900 shadow-lg bg-zinc-200 dark:bg-zinc-800">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${profile.username}`} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="text-white w-8 h-8" />
          </div>
          {isUploadingOp && (
             <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white rounded-full border-t-transparent animate-spin"/>
             </div>
          )}
          <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleAvatarSelect} />
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
            <div>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  className="font-bold text-2xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center md:text-left"
                />
              ) : (
                <h1 className="font-bold text-3xl">{profile.displayName}</h1>
              )}
              <p className="text-zinc-500">@{profile.username}</p>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-semibold text-zinc-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 rounded-xl">Cancel</button>
                <button onClick={handleSaveProfile} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">Save</button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition">
                <Settings className="w-4 h-4"/>
                Edit Profile
              </button>
            )}
          </div>
          
          <div className="flex gap-6 justify-center md:justify-start">
            <div className="text-center md:text-left">
              <span className="font-bold block text-lg">{posts.length}</span>
              <span className="text-zinc-500 text-sm">Posts</span>
            </div>
            {/* Friends Count could go here if we fetch it, for now static visual */}
            <div className="text-center md:text-left">
              <span className="font-bold block text-lg">50</span>
              <span className="text-zinc-500 text-sm">Friends Limit</span>
            </div>
          </div>
          
          <div className="max-w-md mx-auto md:mx-0">
             {isEditing ? (
               <textarea 
                 value={editBio}
                 onChange={e => setEditBio(e.target.value)}
                 className="w-full bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px]"
                 placeholder="Bio..."
               />
             ) : (
               <p className="text-[15px] leading-relaxed">{profile.bio || "No bio yet."}</p>
             )}
          </div>
        </div>
      </motion.div>

      {/* Grid of Posts */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="font-bold text-xl px-2">Your Posts</h2>
        {posts.length === 0 ? (
           <div className="text-center py-16 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
             <ImageIcon className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
             <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
             <p className="text-zinc-500">Capture and share your first memory.</p>
           </div>
        ) : (
           <motion.div 
             variants={containerVariants}
             initial="hidden"
             animate="show"
             className="columns-2 md:columns-3 gap-1 md:gap-4"
           >
             {posts.map(post => (
               <motion.div variants={itemVariants} key={post.id} className="break-inside-avoid mb-1 md:mb-4 bg-zinc-200 dark:bg-zinc-800 relative group overflow-hidden md:rounded-2xl cursor-pointer">
                 <img src={post.imageUrl} alt="" className="w-full h-auto object-cover group-hover:scale-105 transition duration-500" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1 text-white font-semibold">
                      <span className="text-lg">❤️</span> {post.likeCount}
                    </div>
                 </div>
               </motion.div>
             ))}
           </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
