'use client';

import { useAuthStore } from '@/lib/auth-store';
import { db } from '@/lib/firebase';
import { collection, doc, query, onSnapshot, setDoc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Heart, Share, MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  authorId: string;
  imageUrl: string;
  caption?: string;
  likeCount: number;
  commentCount: number;
  createdAt: number;
}

interface UserProfile {
  displayName: string;
  username: string;
  avatarUrl?: string;
}

interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuthStore();
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Fetch Author Info
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', post.authorId), (docSnap) => {
      if (docSnap.exists()) {
        setAuthor(docSnap.data() as UserProfile);
      }
    });
    return () => unsub();
  }, [post.authorId]);

  // Check if liked
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, `posts/${post.id}/likes`, user.uid), (docSnap) => {
      setHasLiked(docSnap.exists());
    }, (err) => console.error(err));
    return () => unsub();
  }, [post.id, user]);

  // Fetch comments
  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, `posts/${post.id}/comments`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Comment[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Comment));
      setComments(data);
    });
    return () => unsub();
  }, [post.id, showComments]);

  const toggleLike = async () => {
    if (!user) return;
    const likeRef = doc(db, `posts/${post.id}/likes`, user.uid);
    if (hasLiked) {
      await deleteDoc(likeRef);
    } else {
      await setDoc(likeRef, { createdAt: serverTimestamp() });
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    const commentId = `cmt_${Date.now()}`;
    await setDoc(doc(db, `posts/${post.id}/comments`, commentId), {
      authorId: user.uid,
      text: newComment.trim(),
      createdAt: serverTimestamp()
    });
    setNewComment('');
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            {author?.avatarUrl ? (
              <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${author?.username || post.authorId}`} className="w-full h-full object-cover" />
            )}
          </div>
          <div>
             <div className="font-bold text-[15px] leading-tight">{author?.displayName || 'Loading...'}</div>
             <div className="text-zinc-500 text-[13px]">@{author?.username || 'user'} • {post.createdAt ? formatDistanceToNow((post.createdAt as any).toMillis ? (post.createdAt as any).toMillis() : post.createdAt) + ' ago' : ''}</div>
          </div>
        </div>
        <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition">
          <MoreHorizontal className="w-5 h-5"/>
        </button>
      </div>

      {/* Image */}
      <div className="w-full bg-black flex items-center justify-center max-h-[600px] overflow-hidden" onDoubleClick={toggleLike}>
        <img 
          src={post.imageUrl} 
          alt="Post content" 
          className="w-full object-contain"
        />
      </div>

      {/* Actions */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-6">
          <button onClick={toggleLike} className="flex items-center gap-2 group">
            <Heart className={`w-7 h-7 sm:w-8 sm:h-8 transition ${hasLiked ? 'fill-red-500 text-red-500 transform scale-110' : 'text-zinc-600 dark:text-zinc-300 group-hover:text-red-500'}`} />
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 group text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition">
            <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 transform group-hover:-scale-x-100 transition" />
          </button>
          <button className="flex items-center gap-2 group text-zinc-600 dark:text-zinc-300 hover:text-green-500 transition ml-auto">
             <Share className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Caption */}
        <div className="text-[15px] leading-snug">
          {post.caption && (
             <p>
               <span className="font-bold mr-2">{author?.displayName}</span>
               {post.caption}
             </p>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {comments.map(c => (
                  <CommentItem key={c.id} comment={c} />
                ))}
                {comments.length === 0 && <p className="text-sm text-zinc-500 text-center py-2">No comments yet.</p>}
             </div>
             
             <form onSubmit={submitComment} className="flex gap-3 pt-2">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-500"
                />
                <button 
                  type="submit" 
                  disabled={!newComment.trim()}
                  className="text-blue-500 font-semibold px-2 disabled:opacity-50"
                >
                  Post
                </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const [author, setAuthor] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', comment.authorId), (docSnap) => {
      if (docSnap.exists()) setAuthor(docSnap.data() as UserProfile);
    });
    return () => unsub();
  }, [comment.authorId]);

  return (
    <div className="flex gap-2">
       <span className="font-bold text-[14px] whitespace-nowrap">{author?.displayName || 'User'}</span>
       <span className="text-[14px] text-zinc-800 dark:text-zinc-200">{comment.text}</span>
    </div>
  )
}
