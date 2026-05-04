'use client';

import { useAuthStore } from '@/lib/auth-store';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Bell, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  actorId: string;
  relatedEntityId: string;
  message: string;
  isRead: boolean;
  createdAt: any;
}

export default function Notifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Notification[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Notification));
      setNotifications(data);
    });
    return () => unsub();
  }, [user]);

  const markRead = async (id: string, isRead: boolean) => {
    if (!user || isRead) return;
    await updateDoc(doc(db, `users/${user.uid}/notifications`, id), { isRead: true });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Notifications</h2>
      
      {notifications.length === 0 && (
        <div className="text-center py-16 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <Bell className="w-12 h-12 text-zinc-400 mx-auto border-4 border-white dark:border-zinc-950 rounded-full bg-zinc-100 dark:bg-zinc-900 p-2 content-box mb-4" />
          <h3 className="text-lg font-semibold mb-2">Up to date!</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">You're all caught up. Check back later for likes and comments.</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map(n => (
          <div 
            key={n.id} 
            onClick={() => markRead(n.id, n.isRead)}
            className={`p-4 rounded-2xl flex items-start gap-4 transition cursor-pointer ${n.isRead ? 'bg-zinc-50 dark:bg-zinc-900/50' : 'bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30'}`}
          >
             <div className={`p-2 rounded-full ${n.type === 'like' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                {n.type === 'like' ? <Heart className="w-5 h-5"/> : <MessageCircle className="w-5 h-5"/>}
             </div>
             <div>
                <p className={`text-[15px] ${n.isRead ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-900 dark:text-zinc-50 font-medium'}`}>{n.message}</p>
                <span className="text-xs text-zinc-500">{n.createdAt?.toMillis ? formatDistanceToNow(n.createdAt.toMillis()) + ' ago' : ''}</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
