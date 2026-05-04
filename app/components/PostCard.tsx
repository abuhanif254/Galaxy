'use client';

import { useAuthStore } from '@/lib/auth-store';
import { db } from '@/lib/firebase';
import { collection, doc, query, onSnapshot, setDoc, deleteDoc, orderBy, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { MessageCircle, Heart, Share, MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from './ui/use-toast';
import { motion, AnimatePresence } from 'motion/react';

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
  parentId?: string;
  createdAt: number;
}

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string, username: string } | null>(null);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);

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

  const handleDoubleClickLike = async () => {
    if (!user) return;
    setShowHeartOverlay(true);
    setTimeout(() => setShowHeartOverlay(false), 1000); // hide after 1s
    
    if (!hasLiked) {
      const likeRef = doc(db, `posts/${post.id}/likes`, user.uid);
      await setDoc(likeRef, { createdAt: serverTimestamp() });
    }
  };

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
    const commentText = newComment.trim();
    
    // Save locally to clear fast
    setNewComment('');
    const currentReplyTo = replyingTo;
    setReplyingTo(null);

    const payload: any = {
      authorId: user.uid,
      text: commentText,
      createdAt: serverTimestamp()
    };
    
    if (currentReplyTo) {
       payload.parentId = currentReplyTo.id;
    }

    try {
      await setDoc(doc(db, `posts/${post.id}/comments`, commentId), payload);

      // Process mentions
      const mentions = Array.from(new Set(commentText.match(/@([\w_]+)/g)?.map(m => m.substring(1)) || []));
      for (const username of mentions) {
        const usersQ = query(collection(db, 'users'), where('username', '==', username));
        const userSnapshot = await getDocs(usersQ);
        if (!userSnapshot.empty) {
          const mentionedUser = userSnapshot.docs[0];
          if (mentionedUser.id !== user.uid) { // Don't notify self
             await setDoc(doc(db, `users/${mentionedUser.id}/notifications/mention_${Date.now()}_${Math.random().toString(36).substring(2,7)}`), {
               type: 'mention',
               actorId: user.uid,
               relatedEntityId: post.id,
               message: `mentioned you in a comment.`,
               isRead: false,
               createdAt: serverTimestamp()
             });
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`https://circled.app/post/${post.id}`);
    toast({
      title: "Link copied!",
      description: "Post link has been copied to your clipboard.",
    });
  };

  // Organize comments into threads
  const topLevelComments = comments.filter(c => !c.parentId);
  const repliesByParentId = comments.reduce((acc, c) => {
    if (c.parentId) {
      acc[c.parentId] = acc[c.parentId] || [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  return (
    <div className="bg-white dark:bg-zinc-900 border-y md:border md:border-zinc-200 dark:border-zinc-800 md:rounded-3xl overflow-hidden shadow-sm">
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
      <div className="w-full bg-black flex items-center justify-center max-h-[600px] overflow-hidden relative" onDoubleClick={handleDoubleClickLike}>
        <img 
          src={post.imageUrl} 
          alt="Post content" 
          className="w-full object-contain"
        />
        <AnimatePresence>
          {showHeartOverlay && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
               <Heart className="w-32 h-32 fill-white text-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-6">
          <motion.button 
            whileTap={{ scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={toggleLike} 
            className="flex items-center gap-2 group"
          >
            <Heart className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${hasLiked ? 'fill-red-500 text-red-500' : 'text-zinc-600 dark:text-zinc-300 group-hover:text-red-500'}`} />
          </motion.button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 group text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition">
            <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 transform group-hover:-scale-x-100 transition" />
          </button>
          <button onClick={handleShare} className="flex items-center gap-2 group text-zinc-600 dark:text-zinc-300 hover:text-green-500 transition ml-auto">
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
             <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 overflow-x-hidden">
                {topLevelComments.map(c => (
                  <div key={c.id} className="space-y-1">
                    <CommentItem 
                      comment={c} 
                      onReply={(username) => {
                        setReplyingTo({ id: c.id, username });
                        setNewComment(`@${username} `);
                      }} 
                    />
                    {repliesByParentId[c.id] && (
                       <div className="pl-8 space-y-2 mt-2 border-l-2 border-zinc-100 dark:border-zinc-800 ml-2">
                         {repliesByParentId[c.id].map(reply => (
                            <CommentItem 
                              key={reply.id} 
                              comment={reply} 
                              onReply={(username) => {
                                setReplyingTo({ id: c.id, username }); // Map to parent thread
                                setNewComment(`@${username} `);
                              }} 
                            />
                         ))}
                       </div>
                    )}
                  </div>
                ))}
                {comments.length === 0 && <p className="text-sm text-zinc-500 text-center py-2">No comments yet.</p>}
             </div>
             
             <form onSubmit={submitComment} className="flex flex-col gap-2 pt-2">
                {replyingTo && (
                  <div className="flex items-center justify-between text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg w-fit ml-3">
                    <span>Replying to <strong>@{replyingTo.username}</strong></span>
                    <button type="button" onClick={() => { setReplyingTo(null); setNewComment(''); }} className="ml-2 hover:text-blue-700 dark:hover:text-blue-400 font-bold">×</button>
                  </div>
                )}
                <div className="flex gap-3">
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
                </div>
             </form>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply }: { comment: Comment, onReply: (username: string) => void }) {
  const [author, setAuthor] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', comment.authorId), (docSnap) => {
      if (docSnap.exists()) setAuthor(docSnap.data() as UserProfile);
    });
    return () => unsub();
  }, [comment.authorId]);

  // Simple rendering of mentions
  const renderText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-blue-500 dark:text-blue-400 hover:underline cursor-pointer">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col gap-0.5">
       <div className="flex items-start gap-2 break-words text-[14px]">
         <span className="font-bold whitespace-nowrap">{author?.displayName || 'User'}</span>
         <span className="text-zinc-800 dark:text-zinc-200">{renderText(comment.text)}</span>
       </div>
       <div className="flex items-center gap-3 pl-0 text-xs text-zinc-500 font-medium">
         <span>{comment.createdAt ? formatDistanceToNow((comment.createdAt as any).toMillis ? (comment.createdAt as any).toMillis() : comment.createdAt) : 'just now'}</span>
         <button onClick={() => onReply(author?.username || 'user')} className="hover:text-zinc-800 dark:hover:text-zinc-200 transition">Reply</button>
       </div>
    </div>
  )
}

