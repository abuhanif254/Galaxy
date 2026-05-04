'use client';

import { useAuthStore } from '@/lib/auth-store';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, where, doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Search, UserPlus, Clock } from 'lucide-react';

interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

export default function Discover() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<Record<string, string>>({}); // id -> status

  useEffect(() => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }
    // We do a simple prefix search on username. 
    // Firestore allows: where('username', '>=', query), where('username', '<=', query + '\uf8ff')
    const q = query(
      collection(db, 'users'),
      where('username', '>=', searchQuery.toLowerCase()),
      where('username', '<=', searchQuery.toLowerCase() + '\uf8ff')
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
       const u: UserProfile[] = [];
       snapshot.forEach(doc => {
         if (doc.id !== user?.uid) {
           u.push({ id: doc.id, ...doc.data() } as UserProfile);
         }
       });
       setUsers(u);
    });
    return () => unsub();
  }, [searchQuery, user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/friends`));
    const unsub = onSnapshot(q, (snap) => {
      const f: Record<string, string> = {};
      snap.forEach(d => {
        f[d.id] = d.data().status;
      });
      setFriends(f);
    });
    return () => unsub();
  }, [user]);

  const handleSendRequest = async (targetId: string) => {
    if (!user) return;
    // According to our rules: we can create a friend doc in our own subcollection, 
    // and let's assume we also create a notification for them. (Wait, creating a notification requires validating user exist etc).
    // Let's just create the friend record locally as "pending".
    await setDoc(doc(db, `users/${user.uid}/friends`, targetId), {
      status: 'pending',
      createdAt: Date.now()
    });
    // Send them a notification
    const notificationId = `notif_${Date.now()}`;
    await setDoc(doc(db, `users/${targetId}/notifications`, notificationId), {
       type: 'friend_request',
       actorId: user.uid,
       relatedEntityId: user.uid,
       message: 'sent you a friend request',
       isRead: false,
       createdAt: Date.now()
    });
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-400" />
        </div>
        <input 
          type="text" 
          placeholder="Search by username..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      <div>
        {searchQuery && users.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
             No users found matching "{searchQuery}"
          </div>
        ) : (
          <div className="space-y-3">
             {users.map(u => (
               <div key={u.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                      {u.avatarUrl ? (
                         <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                         <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${u.username}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                       <div className="font-bold text-[15px]">{u.displayName}</div>
                       <div className="text-zinc-500 text-[13px]">@{u.username}</div>
                    </div>
                 </div>
                 
                 <button 
                   onClick={() => handleSendRequest(u.id)}
                   disabled={!!friends[u.id]}
                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                     friends[u.id] === 'accepted' ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 cursor-not-allowed' :
                     friends[u.id] === 'pending' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 cursor-not-allowed' :
                     'bg-blue-600 text-white hover:bg-blue-700'
                   }`}
                 >
                   {friends[u.id] === 'accepted' ? 'Friends' :
                    friends[u.id] === 'pending' ? <><Clock className="w-4 h-4"/> Pending</> : 
                    <><UserPlus className="w-4 h-4"/> Add</>}
                 </button>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
