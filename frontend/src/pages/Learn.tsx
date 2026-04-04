import AppHeader from '../components/AppHeader'

export default function Learn() {
    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
            <AppHeader />

            <main className="mx-auto w-full max-w-7xl px-6 lg:px-20 py-8">
                {/* Hero Dashboard */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    <div className="lg:col-span-2 flex flex-col justify-between rounded-xl bg-gradient-to-br from-primary to-[#f48fb1] p-8 text-white shadow-lg shadow-primary/20">
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-16 w-16 rounded-full border-4 border-white/30 bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl">person</span>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold font-heading">Welcome back, Alex!</h1>
                                    <p className="text-white/80 font-medium">Current Rank: <span className="text-white">Advanced Rookie</span></p>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col gap-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span>Progress to Semi-Pro</span>
                                    <span>65%</span>
                                </div>
                                <div className="h-3 w-full rounded-full bg-white/20">
                                    <div className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: '65%' }}></div>
                                </div>
                                <p className="text-xs text-white/70 mt-1">3,550 XP remaining to level up</p>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-4">
                            <button className="rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-primary shadow-sm hover:bg-slate-50 transition-all">Resume Learning</button>
                            <button className="rounded-lg bg-white/10 border border-white/30 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-all">View Roadmap</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                        <div className="flex flex-col justify-center rounded-xl bg-white dark:bg-slate-900/40 border border-primary/10 p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-primary mb-2">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                <span className="text-sm font-bold uppercase tracking-wider">Daily Streak</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">15 Days</p>
                            <p className="text-xs text-slate-500 mt-1">Keep it up! +50 XP bonus active</p>
                        </div>
                        <div className="flex flex-col justify-center rounded-xl bg-white dark:bg-slate-900/40 border border-primary/10 p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-emerald-500 mb-2">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                                <span className="text-sm font-bold uppercase tracking-wider">Total XP</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">12,450</p>
                            <p className="text-xs text-emerald-600 font-medium mt-1">Top 10% of Rookies this week</p>
                        </div>
                    </div>
                </section>

                {/* Interactive Modules */}
                <section className="mb-12">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Interactive Modules</h3>
                        <a className="text-sm font-bold text-primary hover:underline" href="#">See all modules</a>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Module 1: Completed */}
                        <div className="group relative flex flex-col rounded-2xl border border-primary/10 bg-white dark:bg-slate-900/40 p-5 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <span className="material-symbols-outlined">database</span>
                            </div>
                            <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Basics</span>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-heading">Understanding Data</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Master the fundamentals of data structures, types, and how ML models perceive information.</p>
                            <div className="mt-auto flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    <span className="text-xs font-bold text-slate-400">Completed</span>
                                </div>
                                <button className="rounded-lg bg-primary/5 px-4 py-2 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors">Review</button>
                            </div>
                        </div>

                        {/* Module 2: Current */}
                        <div className="group relative flex flex-col rounded-2xl border border-primary/10 bg-white dark:bg-slate-900/40 p-5 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 ring-2 ring-primary">
                            <div className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white uppercase tracking-tighter shadow-lg">Current Module</div>
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <span className="material-symbols-outlined">auto_fix_high</span>
                            </div>
                            <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Wrangling</span>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-heading">Data Cleaning</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Learn to handle missing values, outliers, and prepare raw data for training.</p>
                            <div className="mt-auto flex flex-col gap-3">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                    <span>Progress</span>
                                    <span>4/12 Lessons</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '33%' }}></div>
                                </div>
                                <button className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20">Continue Module</button>
                            </div>
                        </div>

                        {/* Module 3: Locked */}
                        <div className="group relative flex flex-col rounded-2xl border border-primary/10 bg-white dark:bg-slate-900/40 p-5 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                                <span className="material-symbols-outlined">lock</span>
                            </div>
                            <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Regression</span>
                            <h4 className="text-lg font-bold text-slate-400 mb-2 font-heading">Linear Regression</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">Dive into the most fundamental predictive algorithm and how it works mathematically.</p>
                            <div className="mt-auto flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-slate-300">lock_open</span>
                                    <span className="text-xs font-bold text-slate-400">Unlock at Level 5</span>
                                </div>
                                <button className="cursor-not-allowed rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300" disabled>Locked</button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Sandbox & Badges Row */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Sandbox Entry */}
                    <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white">
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Playground
                            </div>
                            <h3 className="text-2xl font-bold mb-3 font-heading">Practice Sandbox</h3>
                            <p className="text-slate-400 text-sm mb-6 max-w-sm leading-relaxed">Test your scripts in a real-time Python environment. No installation required. Earn bonus XP for bug-free code!</p>
                            <button className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold transition-all hover:scale-105 active:scale-95">
                                <span className="material-symbols-outlined text-lg">terminal</span>
                                Open Sandbox
                            </button>
                        </div>
                        <div className="absolute -bottom-10 -right-10 opacity-20">
                            <span className="material-symbols-outlined text-[160px] text-primary">code</span>
                        </div>
                    </div>

                    {/* Badge Showcase */}
                    <div className="rounded-2xl border border-primary/10 bg-white dark:bg-slate-900/40 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Badge Showcase</h3>
                            <span className="text-xs font-bold text-primary">12 / 48 Earned</span>
                        </div>
                        <div className="flex flex-wrap gap-6">
                            {[
                                { name: 'Early Bird', icon: 'wb_sunny', color: 'amber', earned: true },
                                { name: 'Turbo Learner', icon: 'speed', color: 'blue', earned: true },
                                { name: '10 Day Streak', icon: 'local_fire_department', color: 'emerald', earned: true },
                                { name: 'The Architect', icon: 'architecture', color: 'slate', earned: false },
                                { name: 'Data Guru', icon: 'psychology', color: 'slate', earned: false },
                            ].map((badge) => (
                                <div key={badge.name} className={`flex flex-col items-center gap-2 ${!badge.earned ? 'grayscale opacity-30' : ''}`}>
                                    <div className={`flex h-16 w-16 items-center justify-center rounded-full shadow-inner ${
                                        badge.earned ? `bg-${badge.color}-100 text-${badge.color}-600` : 'bg-slate-100 text-slate-400'
                                    }`} title={badge.name}>
                                        <span className={`material-symbols-outlined text-3xl ${badge.earned ? 'filled-icon' : ''}`}>{badge.icon}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500">{badge.name}</span>
                                </div>
                            ))}
                        </div>
                        <button className="mt-8 w-full rounded-xl border-2 border-dashed border-primary/20 py-3 text-xs font-bold text-primary hover:bg-primary/5 transition-colors">
                            View Achievements Wall
                        </button>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-primary/10 bg-white dark:bg-background-dark py-8 px-6 lg:px-20">
                <div className="mx-auto flex max-w-7xl flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 text-primary/60 grayscale">
                        <span className="material-symbols-outlined font-bold">query_stats</span>
                        <span className="text-sm font-bold">ML Yantra Academy</span>
                    </div>
                    <div className="flex gap-8 text-xs font-medium text-slate-400">
                        <a className="hover:text-primary transition-colors" href="#">Documentation</a>
                        <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                        <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                        <a className="hover:text-primary transition-colors" href="#">Support</a>
                    </div>
                    <p className="text-xs text-slate-400">© 2024 ML Yantra. Keep learning.</p>
                </div>
            </footer>
        </div>
    )
}
