import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import toast from 'react-hot-toast'
import apiClient from '../services/api'
import type { ProblemType } from '../types/training'

type TrainingStep = 'config' | 'validating' | 'training' | 'results'

type ValidationIssue = {
    level: string
    column?: string
    message: string
}

export default function Train() {
    const navigate = useNavigate()
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [currentStep, setCurrentStep] = useState<TrainingStep>('config')

    // Config state
    const [columns, setColumns] = useState<string[]>([])
    const [columnTypes, setColumnTypes] = useState<Record<string, string>>({})
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
    const [targetColumn, setTargetColumn] = useState<string>('')
    const [problemType, setProblemType] = useState<ProblemType>('classification')
    const [trainTestSplit, setTrainTestSplit] = useState(80)

    // Validation state
    const [validationWarnings, setValidationWarnings] = useState<ValidationIssue[]>([])
    const [validationErrors, setValidationErrors] = useState<ValidationIssue[]>([])
    const [showValidationModal, setShowValidationModal] = useState(false)

    // Training state
    const [trainingProgress, setTrainingProgress] = useState(0)
    const [trainingLogs, setTrainingLogs] = useState<string[]>([])

    // Results state
    const [trainingResults, setTrainingResults] = useState<any>(null)

    useEffect(() => {
        const storedSessionId = localStorage.getItem('ml_yantra_session_id')
        if (!storedSessionId) {
            toast.error('Please upload and clean your dataset first')
            navigate('/clean')
            return
        }
        setSessionId(storedSessionId)

        // Load columns
        apiClient.getStatistics(storedSessionId).then((stats) => {
            if (stats?.column_types) {
                const cols = Object.keys(stats.column_types)
                setColumns(cols)
                setColumnTypes(stats.column_types)
                setSelectedFeatures(cols.slice(0, -1))
                setTargetColumn(cols[cols.length - 1])
            }
        }).catch(console.error)
    }, [navigate])

    const handleStartTraining = async () => {
        if (!sessionId || !targetColumn || selectedFeatures.length === 0) {
            toast.error('Configure features and target before training')
            return
        }

        if (!problemType) {
            toast.error('Please select a problem type (Classification or Regression)')
            return
        }

        // Step 1: Validate features
        setCurrentStep('validating')
        setTrainingLogs([
            `[${new Date().toLocaleTimeString()}] INFO: Validating features and target...`,
        ])

        try {
            const validation = await apiClient.validateFeatures(sessionId, {
                features: selectedFeatures,
                target: targetColumn,
                problemType: problemType,
            })

            setValidationWarnings(validation.warnings)
            setValidationErrors(validation.errors)

            if (!validation.valid) {
                // Has errors — show modal and stop
                setShowValidationModal(true)
                setCurrentStep('config')
                setTrainingLogs(prev => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] ERROR: Feature validation failed. Please fix errors before training.`,
                ])
                return
            }

            if (validation.warnings.length > 0) {
                // Has warnings but no errors — show modal, let user proceed
                setShowValidationModal(true)
                setTrainingLogs(prev => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] WARNING: ${validation.warnings.length} warning(s) found. Review and proceed.`,
                ])
                return // User will click "Proceed Anyway" to continue
            }

            // No issues — proceed directly
            setTrainingLogs(prev => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] SUCCESS: All features validated`,
            ])
            await runTraining()
        } catch (error: any) {
            toast.error(`Validation failed: ${error.message}`)
            setCurrentStep('config')
        }
    }

    const runTraining = async () => {
        if (!sessionId) return

        setCurrentStep('training')
        setTrainingProgress(0)
        setShowValidationModal(false)

        const algoLabel = problemType === 'regression'
            ? '5 regression algorithms'
            : '4 classification algorithms'

        setTrainingLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] SUCCESS: Dataset loaded`,
            `[${new Date().toLocaleTimeString()}] INFO: Features selected: ${selectedFeatures.length}`,
            `[${new Date().toLocaleTimeString()}] INFO: Target: ${targetColumn}`,
            `[${new Date().toLocaleTimeString()}] INFO: Problem type: ${problemType}`,
            `[${new Date().toLocaleTimeString()}] INFO: Training ${algoLabel}...`,
        ])

        // Simulate progress
        const progressInterval = setInterval(() => {
            setTrainingProgress(prev => {
                if (prev >= 90) return prev
                return prev + Math.random() * 10
            })
        }, 800)

        try {
            const result = await apiClient.startTraining(sessionId, {
                features: selectedFeatures,
                target: targetColumn,
                problemType: problemType,
                algorithms: [], // Empty = train ALL algorithms for the problem type
                trainTestSplit: trainTestSplit / 100,
                scaling: true,
            })

            clearInterval(progressInterval)
            setTrainingProgress(100)
            setTrainingLogs(prev => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] SUCCESS: Training complete — ${result.models?.length || 0} models trained`,
                `[${new Date().toLocaleTimeString()}] INFO: Best model: ${result.models?.find((m: any) => m.isBest)?.name || 'N/A'}`,
            ])
            setTrainingResults(result)
            setProblemType((result.problemType || problemType) as ProblemType)
            // Store training results for Results page
            localStorage.setItem('ml_yantra_training_id', result.trainingId)
            localStorage.setItem('ml_yantra_training_results', JSON.stringify(result))
            toast.success(`Successfully trained ${result.models?.length || 0} models!`)

            setTimeout(() => setCurrentStep('results'), 1000)
        } catch (error: any) {
            clearInterval(progressInterval)
            toast.error(`Training failed: ${error.message}`)
            setCurrentStep('config')
        }
    }

    const toggleFeature = (col: string) => {
        setSelectedFeatures(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        )
    }

    const bestModel = trainingResults?.models?.find((m: any) => m.isBest) || trainingResults?.models?.[0]
    const metrics = bestModel?.metrics || {}

    if (!sessionId) return null

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
            <AppHeader />

            <main className="flex flex-1 overflow-hidden">
                {/* Left Sidebar: Configuration */}
                <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Import Dataset & Back to Cleaning */}
                    <div className="flex flex-col gap-2">
                        <input
                            type="file"
                            id="dataset-import"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                try {
                                    toast.loading('Importing dataset...', { id: 'import' })
                                    const result = await apiClient.uploadFile(file)
                                    localStorage.setItem('ml_yantra_session_id', result.session_id)
                                    setSessionId(result.session_id)
                                    const cols = result.column_names
                                    setColumns(cols)
                                    setColumnTypes(result.column_types)
                                    setSelectedFeatures(cols.slice(0, -1))
                                    setTargetColumn(cols[cols.length - 1])
                                    setCurrentStep('config')
                                    setTrainingResults(null)
                                    setTrainingProgress(0)
                                    setTrainingLogs([])
                                    toast.success(`Imported "${result.filename}" — ${result.rows} rows, ${result.columns} columns`, { id: 'import' })
                                } catch (error: any) {
                                    toast.error(`Import failed: ${error.message}`, { id: 'import' })
                                }
                                e.target.value = ''
                            }}
                        />
                        <button
                            onClick={() => document.getElementById('dataset-import')?.click()}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">upload_file</span>
                            Import Dataset
                        </button>
                        <button
                            onClick={() => navigate('/clean')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-sm transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Back to Cleaning
                        </button>
                    </div>

                    {/* Feature Selection */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-heading">
                            <span className="material-symbols-outlined text-primary">list_alt</span>
                            Feature Selection
                        </h3>
                        <div className="space-y-1">
                            {columns.filter(c => c !== targetColumn).map((col) => (
                                <label key={col} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                    <input
                                        checked={selectedFeatures.includes(col)}
                                        onChange={() => toggleFeature(col)}
                                        className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-5 w-5 bg-transparent"
                                        type="checkbox"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm">{col}</span>
                                        <span className="text-[10px] text-slate-400">{columnTypes[col] || ''}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Target Variable */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-heading">
                            <span className="material-symbols-outlined text-primary">target</span>
                            Target Variable
                        </h3>
                        <select
                            value={targetColumn}
                            onChange={(e) => setTargetColumn(e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary"
                        >
                            {columns.map((col) => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>

                    {/* Problem Type Selector */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-heading">
                            <span className="material-symbols-outlined text-primary">category</span>
                            Problem Type
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <div
                                onClick={() => setProblemType('classification')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                    problemType === 'classification'
                                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                        : 'border-slate-100 dark:border-slate-800 hover:border-primary/50 bg-white dark:bg-slate-800'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-lg ${problemType === 'classification' ? 'text-primary' : 'text-slate-400'}`}>category</span>
                                        <span className="font-bold text-sm">Classification</span>
                                    </div>
                                    {problemType === 'classification' && (
                                        <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Predict categories or classes. Trains Logistic Regression, Random Forest, Decision Tree, and SVM.
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {['Logistic Reg.', 'Random Forest', 'Decision Tree', 'SVM'].map(a => (
                                        <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{a}</span>
                                    ))}
                                </div>
                            </div>

                            <div
                                onClick={() => setProblemType('regression')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                    problemType === 'regression'
                                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                        : 'border-slate-100 dark:border-slate-800 hover:border-primary/50 bg-white dark:bg-slate-800'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-lg ${problemType === 'regression' ? 'text-primary' : 'text-slate-400'}`}>trending_up</span>
                                        <span className="font-bold text-sm">Regression</span>
                                    </div>
                                    {problemType === 'regression' && (
                                        <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Predict continuous values. Trains Linear Regression, Random Forest, Decision Tree, SVR, and XGBoost.
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {['Linear Reg.', 'Random Forest', 'Decision Tree', 'SVR', 'XGBoost'].map(a => (
                                        <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{a}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Train/Test Split Slider */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-heading">
                            <span className="material-symbols-outlined text-primary">tune</span>
                            Train / Test Split
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-primary">Train: {trainTestSplit}%</span>
                                <span className="text-slate-500">Test: {100 - trainTestSplit}%</span>
                            </div>
                            <input
                                type="range"
                                min={50}
                                max={95}
                                step={5}
                                value={trainTestSplit}
                                onChange={(e) => setTrainTestSplit(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>50%</span>
                                <span>95%</span>
                            </div>
                            {/* Visual bar */}
                            <div className="flex h-3 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                <div className="bg-primary/80 transition-all" style={{ width: `${trainTestSplit}%` }}></div>
                                <div className="bg-orange-400/60 transition-all" style={{ width: `${100 - trainTestSplit}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-primary font-bold">Training Data</span>
                                <span className="text-orange-500 font-bold">Test Data</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Center: Main Content Area */}
                <div className="flex-1 flex flex-col p-8 bg-background-light dark:bg-background-dark overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight mb-2 font-heading">Train Model</h1>
                            <p className="text-slate-500">
                                Pipeline: <span className="text-primary font-medium capitalize">{problemType}</span>
                                <span className="text-slate-400 mx-2">•</span>
                                <span className="text-slate-400">
                                    {problemType === 'regression' ? '5 algorithms' : '4 algorithms'}
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={handleStartTraining}
                            disabled={currentStep === 'training' || currentStep === 'validating'}
                            className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined">play_arrow</span>
                            {currentStep === 'training' ? 'Training...' : currentStep === 'validating' ? 'Validating...' : 'Start Training Pipeline'}
                        </button>
                    </div>

                    {/* Layout for Progress and Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Progress Section (2/3) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Training Progress Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 font-heading">
                                    <span className="material-symbols-outlined text-primary">sync</span>
                                    Training Progress
                                </h3>
                                <div className="space-y-8">
                                    {/* Step 1: Feature Validation */}
                                    <div className="relative">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium">Feature Validation</span>
                                            <span className="text-primary font-bold">
                                                {currentStep !== 'config' ? '100%' : '0%'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-1000 ${currentStep !== 'config' ? 'bg-green-500 w-full' : 'bg-slate-300 w-0'}`}></div>
                                        </div>
                                        {currentStep !== 'config' && (
                                            <span className="material-symbols-outlined absolute -right-8 top-6 text-green-500">check_circle</span>
                                        )}
                                    </div>
                                    {/* Step 2: Multi-Model Training */}
                                    <div className="relative">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium">
                                                Training All {problemType === 'regression' ? '5' : '4'} Models
                                            </span>
                                            <span className="text-primary font-bold">{currentStep === 'training' ? `${Math.min(Math.round(trainingProgress), 100)}%` : currentStep === 'results' ? '100%' : '0%'}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${currentStep === 'results' ? 'bg-green-500 w-full' : currentStep === 'training' ? 'bg-primary' : 'bg-slate-300 w-0'}`}
                                                style={currentStep === 'training' ? { width: `${Math.min(trainingProgress, 100)}%` } : {}}
                                            ></div>
                                        </div>
                                        {currentStep === 'training' && (
                                            <div className="mt-4 flex gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-xs">timer</span>
                                                    Training all models in parallel...
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Step 3: Model Comparison */}
                                    <div className={`relative ${currentStep !== 'results' ? 'opacity-40' : ''}`}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium">Model Comparison & Ranking</span>
                                            <span className="font-bold">{currentStep === 'results' ? '100%' : '0%'}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div className={`h-full ${currentStep === 'results' ? 'bg-green-500 w-full' : 'bg-slate-300 w-0'}`}></div>
                                        </div>
                                        {currentStep === 'results' && (
                                            <span className="material-symbols-outlined absolute -right-8 top-6 text-green-500">check_circle</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Real-time System Log */}
                            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 shadow-inner overflow-hidden border border-slate-800">
                                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                    <span className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">System Log</span>
                                    <span className={`size-2 rounded-full ${currentStep === 'training' || currentStep === 'validating' ? 'bg-primary animate-pulse' : currentStep === 'results' ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {trainingLogs.length > 0 ? trainingLogs.map((log, i) => (
                                        <p key={i}>
                                            <span className="text-slate-500">{log.split(']')[0]}]</span>
                                            <span className={log.includes('SUCCESS') ? 'text-green-400' : log.includes('ERROR') ? 'text-red-400' : log.includes('WARNING') ? 'text-yellow-400' : 'text-blue-400'}>
                                                {log.split(']').slice(1).join(']')}
                                            </span>
                                        </p>
                                    )) : (
                                        <p className="text-slate-600 italic">Click "Start Training Pipeline" to begin...</p>
                                    )}
                                </div>
                            </div>

                            {/* Results: Models Comparison Table */}
                            {currentStep === 'results' && trainingResults?.models && (
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold mb-1 font-heading">Model Comparison</h3>
                                        <p className="text-sm text-slate-500">
                                            {trainingResults.models.length} models trained and ranked by {problemType === 'classification' ? 'accuracy' : 'R² score'}
                                        </p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Rank</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Model</th>
                                                    {problemType === 'classification' ? (
                                                        <>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Accuracy</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Precision</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Recall</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">F1 Score</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">ROC AUC</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Log Loss</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">R² Score</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Adj. R²</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">MAE</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">MSE</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">RMSE</th>
                                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">MAPE</th>
                                                        </>
                                                    )}
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Time</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {[...trainingResults.models]
                                                    .sort((a: any, b: any) => {
                                                        if (problemType === 'classification') {
                                                            return (b.metrics.accuracy || 0) - (a.metrics.accuracy || 0)
                                                        }
                                                        return (b.metrics.r2Score || 0) - (a.metrics.r2Score || 0)
                                                    })
                                                    .map((model: any, index: number) => (
                                                    <tr key={model.modelId} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${model.isBest ? 'bg-primary/5' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center justify-center size-7 rounded-full text-xs font-black ${
                                                                index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                index === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                                                                index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                            }`}>
                                                                {index + 1}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{model.name}</span>
                                                        </td>
                                                        {problemType === 'classification' ? (
                                                            <>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.accuracy?.toFixed(4) ?? 'N/A'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.precision?.toFixed(4) ?? 'N/A'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.recall?.toFixed(4) ?? 'N/A'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.f1Score?.toFixed(4) ?? 'N/A'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.rocAuc?.toFixed(4) ?? '—'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.logLoss?.toFixed(4) ?? '—'}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.r2Score?.toFixed(4) ?? 'N/A'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.adjR2?.toFixed(4) ?? '—'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.mae?.toFixed(4) ?? 'N/A'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.mse?.toFixed(4) ?? '—'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.rmse?.toFixed(4) ?? 'N/A'}</td>
                                                                <td className="px-4 py-3 font-mono font-medium">{model.metrics.mape?.toFixed(4) ?? 'N/A'}</td>
                                                            </>
                                                        )}
                                                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{model.trainingTime?.toFixed(2)}s</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                                model.isBest ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                            }`}>
                                                                {model.isBest ? '🏆 Champion' : 'Candidate'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Metrics Summary (1/3) */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 font-heading">
                                    <span className="material-symbols-outlined text-primary">query_stats</span>
                                    Best Model Metrics
                                </h3>
                                <div className="space-y-4">
                                    {problemType === 'classification' ? (
                                        <>
                                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                                                <div className="text-sm font-medium">Accuracy</div>
                                                <div className="text-xl font-bold text-primary">{metrics.accuracy?.toFixed(3) || '—'}</div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                                                <div className="text-sm font-medium">Precision</div>
                                                <div className="text-xl font-bold text-primary">{metrics.precision?.toFixed(3) || '—'}</div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                                                <div className="text-sm font-medium">Recall</div>
                                                <div className="text-xl font-bold text-primary">{metrics.recall?.toFixed(3) || '—'}</div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium">F1 Score</div>
                                                <div className="text-xl font-bold text-primary">{metrics.f1Score?.toFixed(3) || '—'}</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                                                <div className="text-sm font-medium">R² Score</div>
                                                <div className="text-xl font-bold text-primary">{metrics.r2Score?.toFixed(3) || '—'}</div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                                                <div className="text-sm font-medium">MAE</div>
                                                <div className="text-xl font-bold text-primary">{metrics.mae?.toFixed(3) || '—'}</div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                                                <div className="text-sm font-medium">RMSE</div>
                                                <div className="text-xl font-bold text-primary">{metrics.rmse?.toFixed(3) || '—'}</div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium">MAPE</div>
                                                <div className="text-xl font-bold text-primary">{metrics.mape?.toFixed(3) || '—'}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Insight Card */}
                            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
                                <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">lightbulb</span>
                                    Insight
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {currentStep === 'results' && bestModel
                                        ? `${bestModel.name} achieved the best performance among ${trainingResults.models.length} models. ${selectedFeatures.length} features were used in training.`
                                        : `${selectedFeatures.length} features selected for ${problemType} training. All ${problemType === 'regression' ? '5' : '4'} algorithms will be compared. Split ratio: ${trainTestSplit}/${100 - trainTestSplit}.`
                                    }
                                </p>
                            </div>

                            {/* Training Summary Card */}
                            {currentStep === 'results' && trainingResults?.models && (
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-4 font-heading">Training Summary</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Models Trained</span>
                                            <span className="font-bold">{trainingResults.models.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Problem Type</span>
                                            <span className="font-bold capitalize">{problemType}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Features Used</span>
                                            <span className="font-bold">{selectedFeatures.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Best Model</span>
                                            <span className="font-bold text-primary">{bestModel?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Total Training Time</span>
                                            <span className="font-bold">
                                                {trainingResults.models.reduce((sum: number, m: any) => sum + (m.trainingTime || 0), 0).toFixed(2)}s
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action buttons when results are ready */}
                            {currentStep === 'results' && trainingResults && (
                                <div className="space-y-3">
                                    <button
                                        onClick={async () => {
                                            if (!bestModel) return
                                            try {
                                                const blob = await apiClient.downloadModel(trainingResults.trainingId, bestModel.modelId)
                                                const url = window.URL.createObjectURL(blob)
                                                const a = document.createElement('a')
                                                a.href = url
                                                a.download = `${bestModel.name.replace(/\s+/g, '_')}_${Date.now()}.pkl`
                                                document.body.appendChild(a)
                                                a.click()
                                                window.URL.revokeObjectURL(url)
                                                document.body.removeChild(a)
                                                toast.success(`Downloaded ${bestModel.name}`)
                                            } catch (error: any) {
                                                toast.error(`Download failed: ${error.message}`)
                                            }
                                        }}
                                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                        <span className="material-symbols-outlined">download</span>
                                        Download Best Model
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentStep('config')
                                            setTrainingResults(null)
                                            setTrainingProgress(0)
                                            setTrainingLogs([])
                                        }}
                                        className="w-full border border-slate-200 dark:border-slate-800 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                                    >
                                        Train New Model
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Feature Validation Modal */}
            {showValidationModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-xl font-bold font-heading flex items-center gap-2">
                                <span className={`material-symbols-outlined ${validationErrors.length > 0 ? 'text-red-500' : 'text-yellow-500'}`}>
                                    {validationErrors.length > 0 ? 'error' : 'warning'}
                                </span>
                                Feature Validation Report
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {validationErrors.length > 0
                                    ? 'Fix the errors below before training.'
                                    : 'Review the warnings below. You can still proceed with training.'}
                            </p>
                        </div>
                        <div className="p-6 max-h-80 overflow-y-auto space-y-3">
                            {validationErrors.map((issue, i) => (
                                <div key={`err-${i}`} className="flex gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">cancel</span>
                                    <div>
                                        {issue.column && (
                                            <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">{issue.column}</span>
                                        )}
                                        <p className="text-sm text-red-800 dark:text-red-300">{issue.message}</p>
                                    </div>
                                </div>
                            ))}
                            {validationWarnings.map((issue, i) => (
                                <div key={`warn-${i}`} className="flex gap-3 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                    <span className="material-symbols-outlined text-yellow-500 text-lg mt-0.5">warning</span>
                                    <div>
                                        {issue.column && (
                                            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">{issue.column}</span>
                                        )}
                                        <p className="text-sm text-yellow-800 dark:text-yellow-300">{issue.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowValidationModal(false)
                                    setCurrentStep('config')
                                }}
                                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Go Back & Fix
                            </button>
                            {validationErrors.length === 0 && (
                                <button
                                    onClick={() => runTraining()}
                                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all"
                                >
                                    Proceed Anyway
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
