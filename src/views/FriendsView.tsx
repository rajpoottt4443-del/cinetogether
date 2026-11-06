import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Check, Copy, Film, Shield, ArrowRight } from 'lucide-react';
import { Friend } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface FriendsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (user) {
      api.getFriends(user.id).then(res => setFriends(res.friends)).catch(() => {});
    }
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.searchFriends(searchQuery);
      setSearchResults(res.results.filter(r => r.id !== user?.id));
    } catch (e) {
      // quiet catch
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = (id: string) => {
    setAddedIds(prev => new Set(prev).add(id));
  };

  const copyMyUserId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-black py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#B5D5ED]/10 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Friends & User ID Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Find and connect with friends across the world using permanent CineTogether IDs.
            </p>
          </div>

          {/* User's Own ID card */}
          {user && (
            <div className="flex items-center gap-2 p-2 px-3 rounded-xl glass-panel border border-[#B5D5ED]/20 font-mono text-xs">
              <span className="text-slate-400">Your ID:</span>
              <strong className="text-white tracking-wider">{user.userId}</strong>
              <button
                onClick={copyMyUserId}
                className="p-1 hover:text-[#B5D5ED] transition-colors"
                title="Copy ID to clipboard"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-cyan-300" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              </button>
            </div>
          )}
        </div>

        {/* Search by User ID or Name */}
        <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Find Friends by Unique User ID (e.g. CT-8F29A641)
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search exact User ID or display name..."
                className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="glass-button-primary px-6 py-2.5 rounded-xl text-xs font-bold shrink-0"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="pt-4 border-t border-[#B5D5ED]/10 space-y-2">
              <p className="text-xs font-semibold text-slate-300">Search Results ({searchResults.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.map(result => (
                  <div key={result.id} className="p-3 rounded-xl glass-panel-subtle flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={result.avatar} alt={result.displayName} className="w-9 h-9 rounded-full object-cover border border-[#397CB8]" />
                      <div>
                        <p className="text-xs font-bold text-white">{result.displayName}</p>
                        <p className="text-[10px] font-mono text-[#B5D5ED]">{result.userId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFriend(result.id)}
                      disabled={addedIds.has(result.id)}
                      className="glass-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {addedIds.has(result.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-cyan-200" />
                          <span>Request Sent</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* My Friends List */}
        <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-4">
          <div className="flex items-center justify-between border-b border-[#B5D5ED]/10 pb-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Connected Friends ({friends.length})
            </h2>
            <span className="text-xs text-slate-400">All registered users have verified User IDs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map(friend => (
              <div
                key={friend.id}
                className="p-4 rounded-xl glass-panel-subtle border border-[#B5D5ED]/10 flex items-center justify-between hover:border-[#397CB8]/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={friend.avatar} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover border border-[#397CB8]/40" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black"></span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{friend.displayName}</h3>
                    <p className="text-[11px] font-mono text-[#B5D5ED]">{friend.userId}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">3 shared watch parties</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('create-room')}
                    className="glass-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Film className="w-3 h-3" />
                    <span>Watch Party</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
