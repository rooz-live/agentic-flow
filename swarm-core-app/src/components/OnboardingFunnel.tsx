import { useState } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, Hexagon, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OnboardingFunnel = () => {
    const [step, setStep] = useState(1);

    const nextStep = () => setStep(s => Math.min(s + 1, 4));

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #000000, #09090b, #18181b)' }}>
            {/* Background Animations */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10">
                {/* Progress Indicators */}
                <div className="flex justify-center gap-3 mb-12">
                    {[1, 2, 3, 4].map(i => (
                        <div 
                            key={i} 
                            className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-16 bg-gradient-to-r from-emerald-400 to-cyan-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'w-8 bg-white/10'}`} 
                        />
                    ))}
                </div>

                {/* Main Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                                className="flex flex-col items-center text-center space-y-6"
                            >
                                <div className="p-4 bg-emerald-500/20 rounded-full">
                                    <Sparkles size={48} className="text-emerald-400" />
                                </div>
                                <h2 className="text-4xl font-black tracking-tighter">Welcome to the Swarm</h2>
                                <p className="text-zinc-400 text-lg">You are about to enter a sovereign ecosystem. Before we grant you access to the network, we need to calibrate your frequency.</p>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                                className="space-y-6"
                            >
                                <h2 className="text-3xl font-black text-center mb-8">Select Your Domain</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {['Creator', 'Developer', 'Investor', 'Validator'].map(role => (
                                        <button key={role} className="p-6 rounded-2xl border border-white/10 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/20 group-hover:to-transparent transition-all" />
                                            <Hexagon className="mb-4 text-cyan-500 group-hover:scale-110 transition-transform" />
                                            <h3 className="text-xl font-bold text-left">{role}</h3>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                                className="space-y-6 text-center"
                            >
                                <div className="p-4 bg-purple-500/20 rounded-full inline-block">
                                    <Rocket size={48} className="text-purple-400" />
                                </div>
                                <h2 className="text-3xl font-black">Sync Your Web3 Identity</h2>
                                <p className="text-zinc-400">Connect your wallet or traditional OAuth to establish your decentralized identity within the matrix.</p>
                                <div className="space-y-3 mt-6">
                                    <button className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">Connect Wallet</button>
                                    <button className="w-full py-4 bg-[#5865F2] text-white font-bold rounded-xl hover:bg-[#4752C4] transition-colors">Connect Discord</button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div 
                                key="step4"
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-6 py-8"
                            >
                                <motion.div 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                                    className="inline-block p-4 bg-green-500/20 rounded-full"
                                >
                                    <CheckCircle2 size={64} className="text-green-400" />
                                </motion.div>
                                <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">Calibration Complete</h2>
                                <p className="text-zinc-400">Your sovereign identity is verified. The gates are open.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation Controls */}
                    <div className="mt-12 flex justify-between items-center border-t border-white/10 pt-6">
                        {step > 1 ? (
                            <button onClick={() => setStep(s => s - 1)} className="text-zinc-400 hover:text-white font-medium px-4 py-2">
                                Back
                            </button>
                        ) : <div></div>}
                        
                        <button 
                            onClick={nextStep}
                            className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all shadow-lg ${
                                step === 4 
                                ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 hover:scale-105' 
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                        >
                            {step === 4 ? 'Enter the Matrix' : 'Continue'} <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
