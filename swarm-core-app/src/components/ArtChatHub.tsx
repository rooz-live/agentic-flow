import { useState } from 'react';
import { MessageSquare, Heart, Share2, Sparkles, Flame } from 'lucide-react';

export const ArtChatHub = () => {
    const [activeTab, setActiveTab] = useState('feed');

    const artDrops = [
        { id: 1, author: '@neon_dreams', title: 'Cyberpunk Genesis', likes: 243, comments: 45, image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop' },
        { id: 2, author: '@void_walker', title: 'Abstract Geometry 04', likes: 189, comments: 22, image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop' },
        { id: 3, author: '@pixel_prophet', title: 'Neural Landscape', likes: 512, comments: 89, image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop' },
    ];

    return (
        <div className="min-h-[80vh] w-full p-8 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)' }}>
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 drop-shadow-lg">
                            ArtChat Community
                        </h1>
                        <p className="text-zinc-400 mt-2 text-lg font-medium tracking-wide">Where Sovereign Creators Collide.</p>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full backdrop-blur-md transition-all duration-300 font-bold shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)]">
                        <Sparkles size={20} className="text-pink-400" />
                        Drop New Art
                    </button>
                </header>

                {/* Navigation Tabs */}
                <div className="flex gap-4 mb-8">
                    {['feed', 'trending', 'collabs', 'bounties'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-full font-bold uppercase tracking-wider text-sm transition-all duration-300 ${
                                activeTab === tab 
                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105' 
                                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Art Feed */}
                    <div className="lg:col-span-2 space-y-8">
                        {artDrops.map((drop) => (
                            <div key={drop.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl group hover:border-purple-500/50 transition-colors duration-500">
                                <div className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 p-1">
                                            <div className="w-full h-full bg-zinc-900 rounded-full border-2 border-transparent" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{drop.author}</h3>
                                            <p className="text-zinc-400 text-sm">{drop.title}</p>
                                        </div>
                                    </div>
                                    <button className="text-zinc-500 hover:text-white transition-colors">
                                        <MessageSquare size={24} />
                                    </button>
                                </div>
                                
                                <div className="w-full h-[400px] overflow-hidden relative">
                                    <img 
                                        src={drop.image} 
                                        alt={drop.title} 
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                        <div className="flex gap-6">
                                            <span className="flex items-center gap-2 font-bold"><Heart size={20} className="text-pink-500" /> {drop.likes}</span>
                                            <span className="flex items-center gap-2 font-bold"><MessageSquare size={20} className="text-purple-400" /> {drop.comments}</span>
                                            <span className="flex items-center gap-2 font-bold"><Share2 size={20} className="text-blue-400" /> Share</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar / Leaderboard */}
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-[50px] pointer-events-none" />
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                                <Flame className="text-orange-500" /> Trending Creators
                            </h2>
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-bold text-zinc-500 w-6">{i}</span>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600" />
                                            <div className="font-bold">Creator_{i}X</div>
                                        </div>
                                        <div className="text-pink-400 font-bold text-sm">+{i * 100 + 50} PWR</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-pink-500/30 rounded-3xl p-6 backdrop-blur-xl text-center shadow-[0_0_30px_rgba(236,72,153,0.15)]">
                            <h3 className="text-xl font-black mb-2 text-pink-300">Unlock Pro Features</h3>
                            <p className="text-zinc-300 text-sm mb-6">Gain access to exclusive galleries, HD minting, and the private Alpha chat.</p>
                            <button className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-black uppercase tracking-wider transition-colors shadow-lg">
                                Upgrade to ArtChat Pro
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
