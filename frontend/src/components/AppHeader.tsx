import { Link, useLocation, useNavigate } from 'react-router-dom'

interface AppHeaderProps {
    /** Show export button */
    onExport?: () => void
    /** Extra content to show in the right side */
    rightSlot?: React.ReactNode
}

const navItems = [
    { path: '/', label: 'Home', icon: 'home' },
    { path: '/clean', label: 'Dataset', icon: 'table_chart' },
    { path: '/train', label: 'Model', icon: 'model_training' },
    { path: '/results', label: 'Results', icon: 'leaderboard' },
]

export default function AppHeader({ onExport, rightSlot }: AppHeaderProps) {
    const location = useLocation()
    const navigate = useNavigate()

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
            <div className="flex items-center justify-between px-6 py-2.5">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 shrink-0">
                    <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-lg">database</span>
                    </div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">ML Yantra</h2>
                </Link>

                {/* Center Navigation */}
                <nav className="hidden md:flex items-center gap-1 mx-8">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-base">{item.icon}</span>
                                {item.label}
                            </button>
                        )
                    })}
                </nav>

                {/* Right side */}
                <div className="flex items-center gap-3 shrink-0">
                    {rightSlot}
                    {onExport && (
                        <button
                            onClick={onExport}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
                        >
                            <span className="material-symbols-outlined text-sm">export_notes</span>
                            Export
                        </button>
                    )}
                    <button className="flex items-center justify-center rounded-xl size-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-lg">notifications</span>
                    </button>
                    <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        JD
                    </div>
                </div>
            </div>
        </header>
    )
}
