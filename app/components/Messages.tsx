'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Send, ArrowLeft, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Chat {
  id: string;
  participantIds: string[];
  updatedAt: number;
  lastMessage?: string;
  lastMessageTime?: number;
  // UI helpers
  otherUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

interface ChatMessage {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export default function Messages() {
  const { user } = useAuthStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch user's chats
    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const data: Chat[] = [];
      for (const d of snapshot.docs) {
        const chat = { id: d.id, ...d.data() } as Chat;
        
        // Find the other participant's info
        const otherId = chat.participantIds.find(id => id !== user.uid);
        if (otherId) {
          try {
             const userDoc = await getDoc(doc(db, 'users', otherId));
             if (userDoc.exists()) {
               chat.otherUser = { id: otherId, ...userDoc.data() } as any;
             }
          } catch (e) {
             console.error("Error fetching other user:", e);
          }
        }
        data.push(chat);
      }
      // Sort by lastMessageTime descending (client-side simple sort)
      data.sort((a, b) => (b.lastMessageTime || b.updatedAt) - (a.lastMessageTime || a.updatedAt));
      setChats(data);
    }, (error) => {
      console.error(error);
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!activeChat) return;
    
    // Fetch messages for active chat
    const q = query(
      collection(db, `chats/${activeChat.id}/messages`),
      orderBy('createdAt', 'asc') // This requires an index, or since we only fetch a few, we can sort client side if no index. Wait, asc sort on createdAt inside a subcoll should work out of the box mostly, but we'll see.
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach(d => {
        msgs.push({ id: d.id, ...d.data() } as ChatMessage);
      });
      setMessages(msgs);
      setTimeout(() => {
         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeChat.id}/messages`);
    });

    return () => unsub();
  }, [activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || !newMessage.trim()) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
    const now = Date.now();

    try {
      // Create message
      await setDoc(doc(db, `chats/${activeChat.id}/messages`, messageId), {
        authorId: user.uid,
        text: msgText,
        createdAt: serverTimestamp(),
      });
      
      // Update chat last message
      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: msgText,
        lastMessageTime: now,
        updatedAt: serverTimestamp(), // Wait, firestore rules enforce updatedAt == request.time but lastMessageTime we just pass Date.now() which is fine. But wait, `serverTimestamp()` on update matching request.time? Actually, if we use serverTimestamp() it becomes `request.time`. Our rule: `incoming().updatedAt == request.time`.
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `chats/${activeChat.id}/messages`);
    }
  };

  const filteredChats = chats.filter(c => 
    c.otherUser?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
      
      {/* Sidebar - Chat List */}
      <div className={`w-full md:w-[320px] flex flex-col border-r border-zinc-200 dark:border-zinc-800 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
           <h2 className="font-bold text-xl px-1">Messages</h2>
           <div className="relative">
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-zinc-400" />
             </div>
             <input 
               type="text" 
               placeholder="Search chats..."
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-2">
           {chats.length === 0 ? (
             <div className="text-center p-6 text-zinc-500">
                <MessageCircle className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm">No messages yet.</p>
                <p className="text-xs mt-1">Start a conversation from a friend's profile.</p>
             </div>
           ) : (
             filteredChats.map(chat => (
               <button 
                 key={chat.id}
                 onClick={() => setActiveChat(chat)}
                 className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${activeChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
               >
                  <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                    {chat.otherUser?.avatarUrl ? (
                      <img src={chat.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${chat.otherUser?.username}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-center mb-0.5">
                       <span className="font-semibold text-[15px] truncate">{chat.otherUser?.displayName}</span>
                       {chat.lastMessageTime && (
                         <span className="text-[11px] text-zinc-400 flex-shrink-0">
                           {formatDistanceToNow(chat.lastMessageTime, { addSuffix: true }).replace('about ', '')}
                         </span>
                       )}
                     </div>
                     <p className="text-sm text-zinc-500 truncate">
                        {chat.lastMessage || "Start chatting..."}
                     </p>
                  </div>
               </button>
             ))
           )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
         {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
               <MessageCircle className="w-16 h-16 text-zinc-300 dark:text-zinc-800 mb-4" />
               <p>Select a chat to start messaging</p>
            </div>
         ) : (
            <>
               {/* Chat Header */}
               <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center px-4 gap-3 shrink-0">
                 <button 
                   onClick={() => setActiveChat(null)}
                   className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                 >
                   <ArrowLeft className="w-5 h-5" />
                 </button>
                 <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                    {activeChat.otherUser?.avatarUrl ? (
                      <img src={activeChat.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${activeChat.otherUser?.username}`} className="w-full h-full object-cover" />
                    )}
                 </div>
                 <div className="font-semibold">{activeChat.otherUser?.displayName}</div>
               </div>

               {/* Chat Messages */}
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {messages.map(msg => {
                   const isMe = msg.authorId === user?.uid;
                   return (
                     <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-br-sm' 
                            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
                        }`}>
                          {msg.text}
                        </div>
                     </div>
                   );
                 })}
                 <div ref={messagesEndRef} />
               </div>

               {/* Chat Input */}
               <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Message..."
                      className="flex-1 bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-12 h-12 flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <Send className="w-5 h-5 -ml-0.5" />
                    </button>
                  </form>
               </div>
            </>
         )}
      </div>

    </div>
  );
}
