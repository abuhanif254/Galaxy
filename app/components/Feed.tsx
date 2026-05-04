'use client';

import { useAuthStore } from '@/lib/auth-store';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, where, getDoc, doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import PostCard from './PostCard';
import { Plus } from 'lucide-react';
import PhotoUpload from './PhotoUpload';
import StoryViewer from './StoryViewer';

interface Post {
  id: string;
  authorId: string;
  imageUrl: string;
  caption?: string;
  visibility: 'public' | 'friends' | 'group';
  groupId?: string;
  likeCount: number;
  commentCount: number;
  createdAt: number;
}

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

export default function Feed() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [showUpload, setShowUpload] = useState<false | 'post' | 'story'>(false);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch stories from self for now to avoid the complex `isFriend` query requirement
    const usq = query(collection(db, 'stories'), where('authorId', '==', user.uid));
    const unsubStories = onSnapshot(usq, async (snapshot) => {
      const data: Story[] = [];
      const userCache: Record<string, any> = {};
      
      for (const d of snapshot.docs) {
        const s = { id: d.id, ...d.data() } as Story;
        if (s.expiresAt > Date.now()) {
          if (!userCache[s.authorId]) {
            const uprof = await getDoc(doc(db, 'users', s.authorId));
            if (uprof.exists()) userCache[s.authorId] = uprof.data();
          }
          s.authorProfile = userCache[s.authorId] || { username: 'unknown' };
          data.push(s);
        }
      }
      data.sort((a, b) => b.createdAt - a.createdAt);
      setStories(data);
    });

    const q = query(
      collection(db, 'posts'),
      where('visibility', '==', 'public'),
      limit(50)
    );

    const unsubPosts = onSnapshot(q, (snapshot) => {
      const data: Post[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Post);
      });
      data.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(data);
    }, (error) => {
      console.error("Error fetching posts:", error);
    });

    return () => {
      unsubPosts();
      unsubStories();
    };
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        <button 
          onClick={() => setShowUpload('story')}
          className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-blue-500 hover:border-blue-500 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
        {stories.map((story, idx) => (
          <button 
            key={story.id} 
            onClick={() => setViewingStoryIndex(idx)}
            className="flex-shrink-0 w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-blue-500 overflow-hidden relative cursor-pointer group p-0 m-0 text-left outline-none"
          >
            <img src={story.imageUrl} alt="Story" className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors pointer-events-none" />
          </button>
        ))}
      </div>

      {viewingStoryIndex !== null && (
        <StoryViewer 
          stories={stories} 
          initialIndex={viewingStoryIndex} 
          onClose={() => setViewingStoryIndex(null)} 
        />
      )}

      {/* Post Creation Prompt */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex gap-3 items-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
           <img src={user?.photoURL || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.uid}`} className="w-full h-full object-cover"/>
        </div>
        <button 
          onClick={() => setShowUpload('post')}
          className="flex-1 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-left px-4 py-2.5 rounded-full text-zinc-500 transition-colors"
        >
          Share a photo...
        </button>
      </div>

      <div className="space-y-6">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No posts yet. Be the first to share!
          </div>
        )}
      </div>

      {showUpload && (
        <PhotoUpload 
          type={showUpload as 'post' | 'story'} 
          onClose={() => setShowUpload(false)} 
        />
      )}
    </div>
  );
}
