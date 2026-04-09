import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  BookOpen, 
  Share2, 
  Play, 
  LogOut, 
  User as UserIcon, 
  BrainCircuit, 
  History,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Loader2,
  Trophy,
  ArrowLeft,
  Clock,
  Upload,
  Camera,
  FileText,
  X,
  RefreshCw,
  Search,
  Globe,
  Filter,
  Heart,
  PlayCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GripVertical,
  Shield,
  UserX,
  UserCheck,
  Star,
  Image as ImageIcon
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import confetti from 'canvas-confetti';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useAuth } from './lib/auth-context';
import { quizService, Quiz, QuizAttempt, QuestionType, UserProfile, handleFirestoreError, OperationType } from './lib/quiz-service';
import { generateQuizFromText, GeneratedQuestion, searchPdfs, SearchResult, identifyTopics } from './lib/gemini';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Components ---

const Navbar = () => {
  const { user, signIn, logout, isAdmin } = useAuth();

  return (
    <nav className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-200">
            <BrainCircuit className="h-6 w-6 text-white" />
          </div>
          <span className="font-heading text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
            QuizShare AI
          </span>
          {isAdmin && (
            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none text-[10px] h-5 px-2">
              <Shield className="h-3 w-3 mr-1" /> Admin Mode
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{user.displayName}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  {isAdmin ? "Administrator" : "Student Explorer"}
                </p>
              </div>
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || ""} 
                  className="h-9 w-9 rounded-full ring-2 ring-indigo-50" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {user.displayName?.[0]}
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                <LogOut className="h-5 w-5 text-slate-500" />
              </Button>
            </div>
          ) : (
            <Button onClick={signIn} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

const QuizCard = ({ quiz, onPlay, onDelete, isOwner }: { quiz: Quiz, onPlay: (q: Quiz) => void, onDelete?: (id: string) => void, isOwner: boolean }) => {
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      quizService.incrementLikes(quiz.id!);
      setIsLiked(true);
      toast.success("Liked!");
    }
  };

  const handlePlay = () => {
    quizService.incrementPlays(quiz.id!);
    onPlay(quiz);
  };

  const difficultyColor = {
    'Easy': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Medium': 'bg-amber-50 text-amber-700 border-amber-100',
    'Hard': 'bg-rose-50 text-rose-700 border-rose-100'
  }[quiz.difficulty || 'Medium'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      className="h-full"
    >
      <Card className={`glass-card group hover:shadow-[0_20px_50px_rgba(79,70,229,0.15)] transition-all duration-500 border overflow-hidden h-full flex flex-col relative ${
        quiz.isFeatured ? 'border-amber-200 shadow-[0_10px_30px_rgba(245,158,11,0.1)]' : 'border-slate-100/50'
      }`}>
        {quiz.isFeatured && (
          <div className="absolute -right-12 top-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 w-40 text-center rotate-45 shadow-lg z-10 select-none">
            Featured
          </div>
        )}
        <div className={`h-1.5 w-full shrink-0 ${
          quiz.difficulty === 'Easy' ? 'bg-emerald-400' : 
          quiz.difficulty === 'Medium' ? 'bg-amber-400' : 'bg-rose-400'
        }`} />
        
        <CardHeader className="pb-3 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${difficultyColor}`}>
                {quiz.difficulty || 'Medium'}
              </Badge>
              {quiz.isFeatured && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-current" /> Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
              <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50">
                <PlayCircle className="h-3 w-3 text-indigo-500" /> {quiz.plays || 0}
              </span>
              <button 
                onClick={handleLike}
                className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all ${
                  isLiked 
                    ? 'text-rose-500 bg-rose-50 border-rose-100' 
                    : 'hover:text-rose-500 hover:bg-rose-50 border-slate-100/50 hover:border-rose-100'
                }`}
              >
                <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} /> {quiz.likes || 0}
              </button>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-start gap-4">
              <CardTitle className="font-heading text-xl line-clamp-1 group-hover:text-indigo-600 transition-colors leading-tight">
                {quiz.title}
              </CardTitle>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-mono shrink-0 px-2">
                {quiz.questions.length} Qs
              </Badge>
            </div>
            <CardDescription className="line-clamp-2 min-h-[40px] text-sm leading-relaxed text-slate-500">
              {quiz.description || "No description provided."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex-grow pb-4">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-slate-500 font-semibold">
            <div className="flex items-center gap-1.5 bg-slate-50/80 px-2.5 py-1 rounded-full border border-slate-100">
              <UserIcon className="h-3 w-3 text-indigo-400" />
              <span className="truncate max-w-[100px]">{quiz.creatorName || "Anonymous"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50/80 px-2.5 py-1 rounded-full border border-slate-100">
              <Clock className="h-3 w-3 text-indigo-400" />
              <span>{quiz.timePerQuestion}s / q</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-4 border-t border-slate-50 flex gap-2 bg-slate-50/30">
          <Button 
            className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 font-bold rounded-xl transition-all active:scale-95" 
            onClick={handlePlay}
          >
            <PlayCircle className="h-4 w-4" /> Practice
          </Button>
          <div className="flex gap-1.5">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-xl border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all active:scale-90"
              onClick={(e) => {
                e.stopPropagation();
                const baseUrl = process.env.APP_URL || window.location.origin;
                const url = `${baseUrl}?quiz=${quiz.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Link copied!");
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {isOwner && onDelete && (
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-90" 
                onClick={() => onDelete(quiz.id!)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const QuizPlayer = ({ quiz, onComplete, onExit }: { quiz: Quiz, onComplete: (score: number) => void, onExit: () => void }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.timePerQuestion || 30);

  const currentQuestion = quiz.questions[currentIdx];
  const selectedOption = userAnswers[currentIdx];
  const isAnswered = selectedOption !== null;

  useEffect(() => {
    if (isAnswered) return;
    
    if (timeLeft <= 0) {
      // Auto-skip or mark as wrong if time runs out
      // For now, we'll just stop the timer
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isAnswered, currentIdx]);

  // Reset timer when moving to a new UNANSWERED question
  useEffect(() => {
    if (userAnswers[currentIdx] === null) {
      setTimeLeft(quiz.timePerQuestion || 30);
    }
  }, [currentIdx]);

  const handleOptionSelect = (idx: number) => {
    if (isAnswered) return;
    
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = idx;
    setUserAnswers(newAnswers);
    
    if (idx === currentQuestion.correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      onComplete(score);
    }
  };

  const handlePrevious = () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const progress = ((currentIdx + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="sm" onClick={onExit} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Exit Quiz
          </Button>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${timeLeft < 10 && !isAnswered ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-bold">{timeLeft}s</span>
            </div>
            <span className="text-sm font-medium text-slate-500">
              Question {currentIdx + 1} of {quiz.questions.length}
            </span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-card border-none shadow-2xl shadow-indigo-100/50 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-bold bg-indigo-50 text-indigo-600 border-indigo-100">
                  {currentQuestion.type || 'MCQ'}
                </Badge>
              </div>
              <CardTitle className="font-heading text-2xl leading-tight text-slate-900">
                {currentQuestion.type === 'Assertion-Reason' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Assertion (A)</p>
                      <p className="text-lg font-medium text-slate-800">{currentQuestion.question}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Reason (R)</p>
                      <p className="text-lg font-medium text-slate-800">{currentQuestion.reason}</p>
                    </div>
                  </div>
                ) : currentQuestion.type === 'Statement-Based' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Statement I</p>
                      <p className="text-lg font-medium text-slate-800">{currentQuestion.question}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Statement II</p>
                      <p className="text-lg font-medium text-slate-800">{currentQuestion.statement2}</p>
                    </div>
                  </div>
                ) : currentQuestion.type === 'Matching' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest px-1">List I</p>
                        <div className="space-y-2">
                          {(currentQuestion.matchingPairs || []).map((pair, idx) => (
                            <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm font-medium">
                              ({String.fromCharCode(65 + idx)}) {pair.left}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest px-1">List II</p>
                        <div className="space-y-2">
                          {(currentQuestion.matchingPairs || []).map((pair, idx) => (
                            <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm font-medium">
                              ({idx + 1}) {pair.right}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 font-medium px-1">Choose the correct answer from the options given below:</p>
                  </div>
                ) : (
                  currentQuestion.question
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
                key={currentIdx}
              >
                {currentQuestion.options.map((option, idx) => {
                  const isCorrect = idx === currentQuestion.correctAnswer;
                  const isSelected = idx === selectedOption;
                  
                  let variant = "outline";
                  if (isAnswered) {
                    if (isCorrect) variant = "success";
                    else if (isSelected) variant = "destructive";
                  } else if (isSelected) {
                    variant = "primary";
                  }

                  return (
                    <motion.button
                      key={idx}
                      variants={itemVariants}
                      whileHover={!isAnswered ? { scale: 1.01, x: 5 } : {}}
                      whileTap={!isAnswered ? { scale: 0.99 } : {}}
                      disabled={isAnswered}
                      onClick={() => handleOptionSelect(idx)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between group
                        ${variant === "outline" ? "border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50" : ""}
                        ${variant === "primary" ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20" : ""}
                        ${variant === "success" ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100" : ""}
                        ${variant === "destructive" ? "border-rose-500 bg-rose-50 text-rose-700 shadow-sm shadow-rose-100" : ""}
                      `}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="flex-grow font-medium">{option}</span>
                        {isAnswered && isCorrect && <Check className="h-5 w-5 text-emerald-600" />}
                        {isAnswered && isSelected && !isCorrect && <X className="h-5 w-5 text-rose-600" />}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </CardContent>
            <CardFooter className="flex-col gap-4 bg-slate-50/50 border-t border-slate-100 p-6">
              <div className="flex gap-3 w-full">
                <Button 
                  variant="outline"
                  className="flex-1 h-12 font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                  onClick={handlePrevious}
                  disabled={currentIdx === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>

                {!isAnswered ? (
                  <Button 
                    variant="secondary"
                    className="flex-1 h-12 font-bold bg-slate-200 text-slate-700 hover:bg-slate-300"
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                ) : (
                  <Button 
                    className="flex-1 h-12 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" 
                    onClick={handleNext}
                  >
                    {currentIdx === quiz.questions.length - 1 ? "Finish" : "Next"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>

              {isAnswered && currentQuestion.explanation && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full p-4 bg-white rounded-xl border border-slate-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <HelpCircle className="h-4 w-4 text-indigo-600" />
                      Explanation
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full px-2"
                      onClick={() => {
                        toast.success("Thank you! We've reported this question for review.");
                        // In a real app, we would save this to Firestore
                      }}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" /> Report Error
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{currentQuestion.explanation}</p>
                </motion.div>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity
    }
  }
};

export default function App() {
  const { user, loading: authLoading, signIn, logout, isAdmin, isBanned } = useAuth();
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [myAttempts, setMyAttempts] = useState<QuizAttempt[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [creationStep, setCreationStep] = useState<number>(1);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(['MCQ', 'Assertion-Reason', 'Statement-Based', 'Matching']);
  const [isIdentifyingTopics, setIsIdentifyingTopics] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  const historyData = [...myAttempts]
    .reverse()
    .map((attempt, index) => ({
      name: `Attempt ${index + 1}`,
      score: Math.round((attempt.score / attempt.totalQuestions) * 100),
      date: attempt.completedAt?.toDate().toLocaleDateString()
    }));

  const averageScore = myAttempts.length > 0 
    ? Math.round(myAttempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / myAttempts.length * 100)
    : 0;

  const totalQuizzesTaken = myAttempts.length;
  const perfectScores = myAttempts.filter(a => a.score === a.totalQuestions).length;
  
  // Create form state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizSource, setQuizSource] = useState('');
  const [quizCount, setQuizCount] = useState(5);
  const [isPublic, setIsPublic] = useState(true);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [createMode, setCreateMode] = useState<'ai' | 'manual'>('ai');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [webSearchResults, setWebSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualQuestions, setManualQuestions] = useState<GeneratedQuestion[]>([
    { id: crypto.randomUUID(), type: 'MCQ', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
  ]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
        // Skip logging for other errors, as this is simply a connection test.
      }
    }
    testConnection();
  }, []);

  const addManualQuestion = () => {
    setManualQuestions([...manualQuestions, { id: crypto.randomUUID(), type: 'MCQ', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(manualQuestions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setManualQuestions(items);
  };

  const removeManualQuestion = (index: number) => {
    if (manualQuestions.length > 1) {
      setManualQuestions(manualQuestions.filter((_, i) => i !== index));
    }
  };

  const updateManualQuestion = (index: number, field: keyof GeneratedQuestion, value: any) => {
    const updated = [...manualQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setManualQuestions(updated);
  };

  const updateManualOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...manualQuestions];
    updated[qIndex].options[oIndex] = value;
    setManualQuestions(updated);
  };

  useEffect(() => {
    if (!user) return;
    const unsubQuizzes = quizService.subscribeToUserQuizzes(user.uid, setMyQuizzes);
    const unsubAttempts = quizService.subscribeToUserAttempts(user.uid, setMyAttempts);
    
    let unsubAllQuizzes = () => {};
    let unsubAllUsers = () => {};

    if (isAdmin) {
      unsubAllQuizzes = quizService.subscribeToAllQuizzes(setAllQuizzes);
      unsubAllUsers = quizService.subscribeToAllUsers(setAllUsers);
    }

    return () => {
      unsubQuizzes();
      unsubAttempts();
      unsubAllQuizzes();
      unsubAllUsers();
    };
  }, [user, isAdmin]);

  useEffect(() => {
    const unsub = quizService.subscribeToPublicQuizzes(setPublicQuizzes);
    return () => unsub();
  }, []);

  // Handle shared quiz link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get('quiz');
    if (quizId) {
      quizService.getQuiz(quizId).then(quiz => {
        if (quiz) {
          setActiveQuiz(quiz);
          // Clean up URL without refreshing
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          toast.error("Quiz not found or is private.");
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!showCreateDialog) {
      setIsSearchingWeb(false);
      setWebSearchQuery('');
      setWebSearchResults([]);
    }
  }, [showCreateDialog]);

  const [showStartScreen, setShowStartScreen] = useState(false);

  useEffect(() => {
    if (activeQuiz) {
      setShowStartScreen(true);
    }
  }, [activeQuiz]);

  const handleSaveManual = async () => {
    if (!quizTitle) {
      setShowValidationErrors(true);
      toast.error("Please provide a title for your quiz.");
      return;
    }

    // Validate questions
    const isValid = manualQuestions.every(q => {
      const basicValid = q.question && q.options.every(o => o);
      if (q.type === 'Assertion-Reason') return basicValid && q.reason;
      if (q.type === 'Statement-Based') return basicValid && q.statement2;
      if (q.type === 'Matching') return basicValid && q.matchingPairs && q.matchingPairs.every(p => p.left && p.right);
      return basicValid;
    });

    if (!isValid) {
      setShowValidationErrors(true);
      toast.error("Please fill in all required fields for all questions.");
      return;
    }

    setIsGenerating(true);
    try {
      const quizId = await quizService.createQuiz({
        title: quizTitle,
        description: quizDescription || "Manually created quiz.",
        creatorId: user!.uid,
        creatorName: user!.displayName || "Anonymous",
        questions: manualQuestions,
        isPublic,
        difficulty,
        timePerQuestion
      });
      
      toast.success("Quiz created successfully!");
      setShowCreateDialog(false);
      resetForm();
      
      const newQuiz = await quizService.getQuiz(quizId!);
      if (newQuiz) setActiveQuiz(newQuiz);
    } catch (error) {
      toast.error("Failed to save quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setQuizTitle('');
    setQuizDescription('');
    setQuizSource('');
    setQuizCount(5);
    setDifficulty('Medium');
    setTimePerQuestion(30);
    setCapturedImage(null);
    setIsCameraOpen(false);
    setShowValidationErrors(false);
    setCreationStep(1);
    setManualQuestions([{ id: crypto.randomUUID(), type: 'MCQ', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleIdentifyTopics = async (text: string) => {
    if (!text || text.length < 50) {
      setCreationStep(2); // Go to parameters step
      return;
    }
    setIsIdentifyingTopics(true);
    try {
      const topics = await identifyTopics(text);
      setAvailableTopics(topics);
      setCreationStep(2);
    } catch (error) {
      console.error("Topic identification error:", error);
      toast.error("Failed to identify topics automatically.");
      setCreationStep(2);
    } finally {
      setIsIdentifyingTopics(false);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessingFile(true);
    try {
      let extractedText = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        extractedText = fullText;
        setQuizSource(fullText);
        toast.success("Text extracted from PDF successfully!");
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setCapturedImage(event.target?.result as string);
          toast.success("Image uploaded successfully!");
          setCreationStep(4);
        };
        reader.readAsDataURL(file);
        return;
      } else {
        extractedText = await file.text();
        setQuizSource(extractedText);
        toast.success("File content loaded successfully!");
      }
      
      if (extractedText) {
        await handleIdentifyTopics(extractedText);
      }
    } catch (err) {
      console.error("Error processing file:", err);
      toast.error("Failed to process file. Please try again.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleWebSearch = async () => {
    if (!webSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchPdfs(webSearchQuery);
      setWebSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for PDFs");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPdf = async (result: SearchResult) => {
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`/api/proxy-pdf?url=${encodeURIComponent(result.url)}`);
      if (!response.ok) throw new Error("Failed to download PDF");
      
      const blob = await response.blob();
      const file = new File([blob], result.title + ".pdf", { type: "application/pdf" });
      await processFile(file);
      setIsSearchingWeb(false);
      setWebSearchQuery('');
      setWebSearchResults([]);
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error("Failed to download and process PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Reuse handleFileUpload logic but for a single file
      const event = { target: { files: [file] } } as any;
      handleFileUpload(event);
    }
  };

  const handleGenerate = async () => {
    if (!quizTitle || (!quizSource && !capturedImage)) {
      setShowValidationErrors(true);
      toast.error("Please provide a title and some text or an image to generate questions from.");
      return;
    }

    setIsGenerating(true);
    try {
      const imageData = capturedImage ? {
        data: capturedImage.split(',')[1],
        mimeType: capturedImage.split(';')[0].split(':')[1]
      } : undefined;

      // Include selected topics in the source text if provided
      let finalSource = quizSource;
      if (selectedTopics.length > 0) {
        finalSource = `Focus on these topics: ${selectedTopics.join(', ')}. \n\nContent: ${quizSource}`;
      }

      const questions = await generateQuizFromText(finalSource, quizCount, difficulty, selectedQuestionTypes, imageData);
      const quizId = await quizService.createQuiz({
        title: quizTitle,
        description: quizSource.substring(0, 150) + "...",
        creatorId: user!.uid,
        creatorName: user!.displayName || "Anonymous",
        questions,
        isPublic,
        difficulty,
        timePerQuestion
      });
      
      toast.success("Quiz generated successfully!");
      setShowCreateDialog(false);
      resetForm();
      
      // Load the new quiz
      const newQuiz = await quizService.getQuiz(quizId!);
      if (newQuiz) setActiveQuiz(newQuiz);

    } catch (error) {
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      try {
        await quizService.deleteQuiz(id);
        toast.success("Quiz deleted.");
      } catch (error) {
        toast.error("Failed to delete quiz.");
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (activeQuiz && showStartScreen) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="border-slate-200 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto bg-indigo-100 p-3 rounded-2xl w-fit mb-4">
                <BrainCircuit className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle className="text-2xl font-bold">{activeQuiz.title}</CardTitle>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="outline">{activeQuiz.difficulty}</Badge>
                <Badge variant="secondary">{activeQuiz.questions.length} Questions</Badge>
              </div>
              <CardDescription className="mt-2">
                {activeQuiz.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <UserIcon className="h-4 w-4" />
                  <span>Created by {activeQuiz.creatorName}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button 
                className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowStartScreen(false)}
              >
                Start Quiz
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setActiveQuiz(null)}>
                Back to Home
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (activeQuiz) {
    return (
      <div className="min-h-screen bg-slate-50">
        <QuizPlayer 
          quiz={activeQuiz} 
          onExit={() => setActiveQuiz(null)}
          onComplete={async (score) => {
            if (user) {
              await quizService.saveAttempt({
                userId: user.uid,
                quizId: activeQuiz.id!,
                quizTitle: activeQuiz.title,
                score,
                totalQuestions: activeQuiz.questions.length
              });
            }
            
            if (score === activeQuiz.questions.length) {
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#4F46E5', '#10B981', '#F59E0B']
              });
            }

            setLastScore(score);
            setShowResultDialog(true);
            setActiveQuiz(null);
          }}
        />
      </div>
    );
  }

  const filteredPublicQuizzes = publicQuizzes
    .filter(quiz => {
      const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           quiz.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = difficultyFilter === 'All' || quiz.difficulty === difficultyFilter;
      return matchesSearch && matchesDifficulty;
    })
    .sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return 0;
    });

  if (isBanned) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 rounded-3xl shadow-2xl border-none">
          <div className="bg-rose-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Account Suspended</h1>
          <p className="text-slate-600 mb-8">
            Your account has been suspended for violating our community guidelines. 
            If you believe this is a mistake, please contact support.
          </p>
          <Button variant="outline" className="w-full rounded-xl" onClick={logout}>
            Sign Out
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-12">
        <header className="text-center mb-16 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl -z-10" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-4 py-1 px-4 rounded-full border-indigo-100 text-indigo-600 bg-indigo-50/50 font-medium">
              ✨ AI-Powered Learning
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-[1.1]">
              Master Any Topic <br />
              <span className="text-indigo-600 italic">Faster.</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload your notes, capture a photo, or paste text. Our AI transforms your study material into interactive quizzes in seconds.
            </p>
            
            {user ? (
              <motion.div
                variants={pulseVariants}
                animate="pulse"
                className="inline-block"
              >
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 h-14 px-10 text-lg rounded-full shadow-xl shadow-indigo-200 transition-all hover:scale-110 active:scale-95" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-5 w-5" /> Create Your Quiz
                </Button>
              </motion.div>
            ) : (
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 h-14 px-10 text-lg rounded-full shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95" onClick={signIn}>
                Start Learning Now
              </Button>
            )}
          </motion.div>
        </header>

        <Tabs defaultValue="public" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
            <TabsList className="bg-white border p-1 rounded-2xl h-14 shadow-sm">
              <TabsTrigger value="public" className="px-8 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all h-full flex items-center hover:scale-105 active:scale-95">
                <BookOpen className="h-4 w-4 mr-2" /> Explore
              </TabsTrigger>
              <TabsTrigger value="my" className="px-8 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all h-full flex items-center hover:scale-105 active:scale-95">
                <Plus className="h-4 w-4 mr-2" /> My Library
              </TabsTrigger>
              <TabsTrigger value="history" className="px-8 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all h-full flex items-center hover:scale-105 active:scale-95">
                <History className="h-4 w-4 mr-2" /> Progress
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="px-8 rounded-xl data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all h-full flex items-center hover:scale-105 active:scale-95">
                  <Shield className="h-4 w-4 mr-2" /> Admin
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-grow md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search quizzes..." 
                  className="pl-10 h-12 rounded-xl bg-white border-slate-200 focus:ring-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select 
                  className="pl-10 pr-4 h-12 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[120px]"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option value="All">All Levels</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          <TabsContent value="public" className="mt-0">
            {filteredPublicQuizzes.length > 0 ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {filteredPublicQuizzes.map(quiz => (
                  <motion.div key={quiz.id} variants={itemVariants}>
                    <QuizCard 
                      quiz={quiz} 
                      onPlay={setActiveQuiz} 
                      isOwner={user?.uid === quiz.creatorId}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-32 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">No quizzes found</h3>
                <p className="text-slate-500">Try adjusting your search or filters to find what you're looking for.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my">
            {!user ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <p className="text-slate-600 mb-4">Sign in to see your quizzes and track your progress.</p>
                <Button variant="outline" onClick={signIn}>Sign In</Button>
              </div>
            ) : myQuizzes.length > 0 ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {myQuizzes.map(quiz => (
                  <motion.div key={quiz.id} variants={itemVariants}>
                    <QuizCard 
                      quiz={quiz} 
                      onPlay={setActiveQuiz} 
                      isOwner={true}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <p className="text-slate-400 mb-4">You haven't created any quizzes yet.</p>
                <Button variant="outline" onClick={() => setShowCreateDialog(true)}>Create Your First Quiz</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {!user ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <p className="text-slate-600 mb-4">Sign in to see your quiz history.</p>
                <Button variant="outline" onClick={signIn}>Sign In</Button>
              </div>
            ) : myAttempts.length > 0 ? (
              <div className="space-y-8">
                {/* Analytics Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="glass-card border-none shadow-xl shadow-indigo-100/50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Average Score</CardDescription>
                      <CardTitle className="text-3xl font-heading font-bold text-indigo-600">{averageScore}%</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="glass-card border-none shadow-xl shadow-indigo-100/50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Quizzes</CardDescription>
                      <CardTitle className="text-3xl font-heading font-bold text-violet-600">{totalQuizzesTaken}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="glass-card border-none shadow-xl shadow-indigo-100/50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Perfect Scores</CardDescription>
                      <CardTitle className="text-3xl font-heading font-bold text-emerald-600">{perfectScores}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Performance Chart */}
                <Card className="glass-card border-none shadow-xl shadow-indigo-100/50 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="font-heading text-xl">Performance Trend</CardTitle>
                    <CardDescription>Your score percentage over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historyData}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#4f46e5" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorScore)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Detailed History List */}
                <div className="space-y-4">
                  <h3 className="font-heading text-xl text-slate-900 px-1">Recent Attempts</h3>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                  >
                    {myAttempts.map(attempt => (
                      <motion.div key={attempt.id} variants={itemVariants}>
                        <Card className="glass-card border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all duration-300">
                          <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl ${
                                (attempt.score / attempt.totalQuestions) >= 0.8 ? 'bg-emerald-50 text-emerald-600' :
                                (attempt.score / attempt.totalQuestions) >= 0.5 ? 'bg-amber-50 text-amber-600' :
                                'bg-rose-50 text-rose-600'
                              }`}>
                                <Trophy className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">{attempt.quizTitle}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                    <Clock className="h-3 w-3" />
                                    {attempt.completedAt?.toDate().toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                    <HelpCircle className="h-3 w-3" />
                                    {attempt.totalQuestions} Questions
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-black ${
                                (attempt.score / attempt.totalQuestions) >= 0.8 ? 'text-emerald-600' :
                                (attempt.score / attempt.totalQuestions) >= 0.5 ? 'text-amber-600' :
                                'text-rose-600'
                              }`}>
                                {attempt.score} / {attempt.totalQuestions}
                              </div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {Math.round((attempt.score / attempt.totalQuestions) * 100)}% Score
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="text-center py-32 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">No history yet</h3>
                <p className="text-slate-500 mb-6">You haven't completed any quizzes yet. Start learning today!</p>
                <Button 
                  onClick={() => document.querySelector('[data-value="public"]')?.dispatchEvent(new MouseEvent('click', {bubbles: true}))}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-12 px-8"
                >
                  Explore Quizzes
                </Button>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Management */}
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
                  <CardHeader className="bg-slate-900 text-white pb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-2 rounded-xl">
                        <UserIcon className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription className="text-slate-400">Manage user access and status</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {allUsers.map(u => (
                        <div key={u.uid} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                              {u.photoURL ? (
                                <img src={u.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <UserIcon className="h-full w-full p-2 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {u.displayName || "Anonymous"}
                                {u.role === 'admin' && <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none text-[10px] h-4">Admin</Badge>}
                              </div>
                              <div className="text-xs text-slate-500">{u.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {u.role !== 'admin' && (
                              <Button 
                                variant={u.isBanned ? "default" : "outline"} 
                                size="sm" 
                                className={`rounded-xl h-8 text-xs ${u.isBanned ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-rose-600 border-rose-100 hover:bg-rose-50'}`}
                                onClick={() => quizService.updateUserStatus(u.uid, !u.isBanned)}
                              >
                                {u.isBanned ? (
                                  <><UserCheck className="h-3 w-3 mr-1" /> Unban</>
                                ) : (
                                  <><UserX className="h-3 w-3 mr-1" /> Ban</>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz Management */}
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
                  <CardHeader className="bg-indigo-900 text-white pb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-2 rounded-xl">
                        <BookOpen className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <CardTitle>Quiz Management</CardTitle>
                        <CardDescription className="text-indigo-200">Feature or remove quizzes</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {allQuizzes.map(q => (
                        <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex-grow min-w-0 mr-4">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-2">
                              {q.title}
                              {q.isFeatured && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px] h-4">Featured</Badge>}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <span>by {q.creatorName || "Anonymous"}</span>
                              <span>•</span>
                              <span>{q.questions.length} Qs</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className={`h-8 w-8 rounded-lg ${q.isFeatured ? 'text-amber-500 border-amber-200 bg-amber-50' : 'text-slate-400'}`}
                              onClick={() => quizService.toggleFeaturedQuiz(q.id!, !q.isFeatured)}
                            >
                              <Star className={`h-4 w-4 ${q.isFeatured ? 'fill-current' : ''}`} />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-200"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this quiz?")) {
                                  quizService.deleteQuiz(q.id!);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-2xl">Create New Quiz</DialogTitle>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div 
                      className={`h-2 w-12 rounded-full transition-all duration-500 ${
                        (creationStep === 1 && step === 1) || 
                        (creationStep === 2 && step === 2) || 
                        ((creationStep === 3 || creationStep === 4) && step === 2) ||
                        (creationStep === 5 && step === 3)
                        ? 'bg-indigo-600' : creationStep > (step === 1 ? 1 : step === 2 ? 4 : 5) ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                    {step < 3 && <div className="w-1 h-0.5 bg-slate-100 mx-0.5" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  creationStep === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {creationStep > 1 ? <Check className="h-3 w-3" /> : '1'}
                </span>
                <span className={`text-sm font-medium ${creationStep === 1 ? 'text-slate-900' : 'text-slate-500'}`}>Setup</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  (creationStep >= 2 && creationStep <= 4) ? 'bg-indigo-600 text-white' : creationStep > 4 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {creationStep > 4 ? <Check className="h-3 w-3" /> : '2'}
                </span>
                <span className={`text-sm font-medium ${(creationStep >= 2 && creationStep <= 4) ? 'text-slate-900' : 'text-slate-500'}`}>
                  {createMode === 'ai' ? 'Parameters' : 'Editor'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  creationStep === 5 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  3
                </span>
                <span className={`text-sm font-medium ${creationStep === 5 ? 'text-slate-900' : 'text-slate-500'}`}>Review</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <AnimatePresence mode="wait">
                {creationStep === 1 ? (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6 py-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="title" className="text-sm font-bold text-slate-700 flex items-center gap-1">
                          Quiz Title <span className="text-rose-500">*</span>
                        </Label>
                        <Input 
                          id="title" 
                          placeholder="e.g., Photosynthesis Basics" 
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                          className={`h-11 rounded-xl border-slate-200 focus:border-indigo-500 transition-all ${
                            showValidationErrors && !quizTitle ? "border-rose-500 ring-rose-500/10" : ""
                          }`}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">Visibility</Label>
                        <div className="flex p-1 bg-slate-100 rounded-xl h-11">
                          <button
                            onClick={() => setIsPublic(true)}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${
                              isPublic ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Public
                          </button>
                          <button
                            onClick={() => setIsPublic(false)}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${
                              !isPublic ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Private
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as any)} className="w-full">
                        <TabsList className="w-full bg-slate-100/50 p-1 h-11 rounded-xl mb-6">
                          <TabsTrigger value="ai" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-xs font-bold">
                            <BrainCircuit className="h-3.5 w-3.5" /> AI Generate
                          </TabsTrigger>
                          <TabsTrigger value="manual" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-xs font-bold">
                            <Plus className="h-3.5 w-3.5" /> Manual Create
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="ai" className="m-0 space-y-6">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".pdf,.txt,.doc,.docx,image/*"
                            onChange={handleFileUpload}
                          />
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                              <Button 
                                variant="outline" 
                                className="h-14 gap-2 rounded-xl border border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessingFile}
                              >
                                <div className="bg-indigo-100 p-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  {isProcessingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-900">Upload</p>
                                  <p className="text-[9px] text-slate-500">PDF/Word</p>
                                </div>
                              </Button>
                              <Button 
                                variant="outline" 
                                className="h-14 gap-2 rounded-xl border border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                onClick={startCamera}
                              >
                                <div className="bg-indigo-100 p-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  <Camera className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-900">Photo</p>
                                  <p className="text-[9px] text-slate-500">Scan notes</p>
                                </div>
                              </Button>
                              <Button 
                                variant="outline" 
                                className="h-14 gap-2 rounded-xl border border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                onClick={() => setIsSearchingWeb(true)}
                              >
                                <div className="bg-indigo-100 p-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  <Search className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-900">Search</p>
                                  <p className="text-[9px] text-slate-500">Find PDFs</p>
                                </div>
                              </Button>
                            </div>

                            {isSearchingWeb && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                                    <Globe className="h-3.5 w-3.5" /> Search Web for PDFs
                                  </h4>
                                  <Button variant="ghost" size="sm" onClick={() => setIsSearchingWeb(false)} className="h-6 w-6 p-0 rounded-full">
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder="Search for topics..." 
                                    value={webSearchQuery}
                                    onChange={(e) => setWebSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
                                    className="h-9 rounded-lg border-indigo-200 text-xs"
                                  />
                                  <Button 
                                    onClick={handleWebSearch} 
                                    disabled={isSearching || !webSearchQuery.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 h-9 px-3 rounded-lg"
                                  >
                                    {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>

                                {webSearchResults.length > 0 && (
                                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {webSearchResults.map((result, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleSelectPdf(result)}
                                        disabled={isDownloadingPdf}
                                        className="w-full text-left p-2 rounded-lg bg-white border border-indigo-100 hover:border-indigo-400 transition-all group flex items-start gap-2"
                                      >
                                        <div className="bg-indigo-50 p-1.5 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                          <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[10px] font-bold text-slate-900 truncate">{result.title}</p>
                                          <p className="text-[9px] text-slate-500 line-clamp-1">{result.snippet}</p>
                                        </div>
                                        {isDownloadingPdf && (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}

                            <div className="space-y-3">
                              <div className="flex justify-between items-end">
                                <Label htmlFor="source" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                  Study Material / Notes <span className="text-rose-500">*</span>
                                </Label>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  {quizSource.length} characters
                                </span>
                              </div>
                              <div className="relative group">
                                <Textarea 
                                  id="source" 
                                  placeholder="Paste your paragraphs, notes, or article text here..." 
                                  className={`min-h-[150px] resize-none rounded-xl border-slate-200 focus:border-indigo-500 transition-all p-3 text-sm leading-relaxed ${
                                    showValidationErrors && !quizSource && !capturedImage ? "border-rose-500 ring-rose-500/10" : ""
                                  }`}
                                  value={quizSource}
                                  onChange={(e) => setQuizSource(e.target.value)}
                                />
                                {quizSource && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                    onClick={() => setQuizSource('')}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="manual" className="m-0">
                          <div className="bg-slate-50 rounded-xl p-6 border border-dashed border-slate-200 text-center">
                            <div className="bg-white h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                              <Plus className="h-6 w-6 text-indigo-600" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mb-1">Manual Creation Mode</h4>
                            <p className="text-xs text-slate-500 max-w-[250px] mx-auto">
                              You'll be able to add questions one by one in the next step.
                            </p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </motion.div>
                ) : (creationStep >= 2 && creationStep <= 4) ? (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    {createMode === 'ai' ? (
                      <div className="space-y-6">
                        {/* AI Parameters - Step 2 */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-700">Select Specific Topics</Label>
                            <Badge variant="outline" className="text-indigo-600 border-indigo-100 bg-indigo-50">
                              {selectedTopics.length} Selected
                            </Badge>
                          </div>
                          
                          {isIdentifyingTopics ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                              <p className="text-xs text-slate-500 animate-pulse">Analyzing content for topics...</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                              {availableTopics.length > 0 ? availableTopics.map(topic => (
                                <button
                                  key={topic}
                                  onClick={() => {
                                    if (selectedTopics.includes(topic)) {
                                      setSelectedTopics(selectedTopics.filter(t => t !== topic));
                                    } else {
                                      setSelectedTopics([...selectedTopics, topic]);
                                    }
                                  }}
                                  className={`p-2 rounded-lg text-[10px] font-bold text-left transition-all border ${
                                    selectedTopics.includes(topic) 
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                      : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                                  }`}
                                >
                                  {topic}
                                </button>
                              )) : (
                                <div className="col-span-2 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  <p className="text-xs text-slate-500">No specific topics identified.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <Label className="text-sm font-bold text-slate-700">Question Types</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {['MCQ', 'Assertion-Reason', 'Statement-Based', 'Matching'].map((type) => (
                              <button
                                key={type}
                                onClick={() => {
                                  if (selectedQuestionTypes.includes(type as QuestionType)) {
                                    if (selectedQuestionTypes.length > 1) {
                                      setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type));
                                    } else {
                                      toast.error("Select at least one question type.");
                                    }
                                  } else {
                                    setSelectedQuestionTypes([...selectedQuestionTypes, type as QuestionType]);
                                  }
                                }}
                                className={`p-2 rounded-lg text-[10px] font-bold text-center transition-all border ${
                                  selectedQuestionTypes.includes(type as QuestionType) 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                    : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="count" className="text-xs font-bold text-slate-700">Number of Questions</Label>
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 h-5 text-[10px]">
                                {quizCount} Questions
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <Input 
                                id="count" 
                                type="range" 
                                min={1} 
                                max={50} 
                                step={1}
                                value={quizCount}
                                onChange={(e) => setQuizCount(parseInt(e.target.value))}
                                className="flex-grow h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                              <Input 
                                type="number" 
                                min={1} 
                                max={50} 
                                value={quizCount}
                                onChange={(e) => setQuizCount(parseInt(e.target.value))}
                                className="w-12 h-8 rounded-lg text-center font-bold text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <Label className="text-xs font-bold text-slate-700">Difficulty Level</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {['Easy', 'Medium', 'Hard'].map((level) => (
                                <button
                                  key={level}
                                  onClick={() => setDifficulty(level as any)}
                                  className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${
                                    difficulty === level 
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                      : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-xs font-bold text-slate-700">Time per Question</Label>
                          <div className="grid grid-cols-4 gap-2">
                            {[15, 30, 45, 60].map((time) => (
                              <button
                                key={time}
                                onClick={() => setTimePerQuestion(time)}
                                className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${
                                  timePerQuestion === time 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                    : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                                }`}
                              >
                                {time}s
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Manual Editor - Step 2 */}
                        <div className="space-y-3">
                          <Label htmlFor="description" className="text-sm font-bold text-slate-700">Quiz Description (Optional)</Label>
                          <Textarea 
                            id="description" 
                            placeholder="Briefly describe what this quiz covers..." 
                            className="h-20 resize-none rounded-xl border-slate-200 focus:border-indigo-500 p-3 text-sm"
                            value={quizDescription}
                            onChange={(e) => setQuizDescription(e.target.value)}
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm pb-4 border-b border-slate-100 mb-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-bold text-slate-900 text-sm">Question Tracker</h3>
                                <p className="text-[10px] text-slate-500">
                                  {manualQuestions.filter(q => q.question && q.options.every(o => o)).length} of {manualQuestions.length} complete
                                </p>
                              </div>
                              <Button variant="outline" size="sm" onClick={addManualQuestion} className="gap-2 rounded-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-8 text-xs">
                                <Plus className="h-3.5 w-3.5" /> Add Question
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {manualQuestions.map((q, idx) => {
                                const isComplete = q.question && q.options.every(o => o);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      const el = document.getElementById(`question-${idx}`);
                                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }}
                                    className={`h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                                      isComplete 
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                                    } hover:scale-110 active:scale-95`}
                                  >
                                    {idx + 1}
                                  </button>
                                );
                              })}
                            </div>
                        </div>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="questions">
                              {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                  {manualQuestions.map((q, qIdx) => {
                                    const isQuestionIncomplete = !q.question || q.options.some(o => !o) || 
                                      (q.type === 'Assertion-Reason' && !q.reason) || 
                                      (q.type === 'Statement-Based' && !q.statement2) || 
                                      (q.type === 'Matching' && (!q.matchingPairs || q.matchingPairs.some(p => !p.left || !p.right)));
                                    
                                    return (
                                      <Draggable key={q.id || qIdx} draggableId={q.id || `q-${qIdx}`} index={qIdx}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="transition-all"
                                            style={{
                                              ...provided.draggableProps.style,
                                              opacity: snapshot.isDragging ? 0.8 : 1
                                            }}
                                          >
                                            <Card id={`question-${qIdx}`} className={`border-slate-200 relative overflow-hidden group transition-all rounded-2xl ${
                                              showValidationErrors && isQuestionIncomplete ? "border-rose-200 shadow-lg shadow-rose-50" : "hover:border-indigo-200"
                                            } ${snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500/20" : ""}`}>
                                              <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                                <div 
                                                  {...provided.dragHandleProps}
                                                  className="p-2 text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing rounded-full hover:bg-indigo-50 transition-colors"
                                                >
                                                  <GripVertical className="h-4 w-4" />
                                                </div>
                                                <Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                                  onClick={() => removeManualQuestion(qIdx)}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                              <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Question {qIdx + 1}</CardTitle>
                                                  {showValidationErrors && isQuestionIncomplete && (
                                                    <Badge variant="destructive" className="text-[8px] h-4 px-1.5 uppercase tracking-tighter">Incomplete</Badge>
                                                  )}
                                                </div>
                                              </CardHeader>
                                              <CardContent className="space-y-5 pt-5">
                                                <div className="space-y-3">
                                                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Type</Label>
                                                  <div className="flex flex-wrap gap-2">
                                                    {['MCQ', 'Assertion-Reason', 'Statement-Based', 'Matching'].map((type) => (
                                                      <Button
                                                        key={type}
                                                        type="button"
                                                        size="sm"
                                                        variant={(q.type || 'MCQ') === type ? "default" : "outline"}
                                                        className={`rounded-full text-[10px] h-7 px-3 transition-all ${
                                                          (q.type || 'MCQ') === type 
                                                            ? 'bg-indigo-600 shadow-md shadow-indigo-100' 
                                                            : 'border-slate-200 text-slate-500 hover:border-indigo-300'
                                                        }`}
                                                        onClick={() => {
                                                          const updated = [...manualQuestions];
                                                          const newType = type as QuestionType;
                                                          updated[qIdx].type = newType;
                                                          
                                                          // Pre-fill options for specific NEET patterns
                                                          if (newType === 'Assertion-Reason') {
                                                            updated[qIdx].options = [
                                                              "Both (A) and (R) are true and (R) is the correct explanation of (A).",
                                                              "Both (A) and (R) are true but (R) is not the correct explanation of (A).",
                                                              "(A) is true but (R) is false.",
                                                              "(A) is false but (R) is true."
                                                            ];
                                                          } else if (newType === 'Statement-Based') {
                                                            updated[qIdx].options = [
                                                              "Both Statement I and Statement II are correct.",
                                                              "Both Statement I and Statement II are incorrect.",
                                                              "Statement I is correct and Statement II is incorrect.",
                                                              "Statement I is incorrect and Statement II is correct."
                                                            ];
                                                          }
                                                          setManualQuestions(updated);
                                                        }}
                                                      >
                                                        {type}
                                                      </Button>
                                                    ))}
                                                  </div>
                                                </div>

                                                <div className="space-y-4">
                                                  <div className="space-y-2">
                                                    <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                                      {(q.type === 'Assertion-Reason') ? "Assertion (A)" : (q.type === 'Statement-Based') ? "Statement I" : "Question Text"} <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input 
                                                      placeholder={q.type === 'Assertion-Reason' ? "Enter Assertion..." : q.type === 'Statement-Based' ? "Enter Statement I..." : "Enter your question..."} 
                                                      value={q.question}
                                                      onChange={(e) => updateManualQuestion(qIdx, 'question', e.target.value)}
                                                      className={`rounded-xl border-slate-200 focus:border-indigo-500 ${
                                                        showValidationErrors && !q.question ? "border-rose-500 ring-rose-500/10" : ""
                                                      }`}
                                                    />
                                                  </div>

                                                  {q.type === 'Assertion-Reason' && (
                                                    <div className="space-y-2">
                                                      <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                                        Reason (R) <span className="text-rose-500">*</span>
                                                      </Label>
                                                      <Input 
                                                        placeholder="Enter Reason..." 
                                                        value={q.reason || ''}
                                                        onChange={(e) => updateManualQuestion(qIdx, 'reason', e.target.value)}
                                                        className="rounded-xl border-slate-200 focus:border-indigo-500"
                                                      />
                                                    </div>
                                                  )}

                                                  {q.type === 'Statement-Based' && (
                                                    <div className="space-y-2">
                                                      <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                                        Statement II <span className="text-rose-500">*</span>
                                                      </Label>
                                                      <Input 
                                                        placeholder="Enter Statement II..." 
                                                        value={q.statement2 || ''}
                                                        onChange={(e) => updateManualQuestion(qIdx, 'statement2', e.target.value)}
                                                        className="rounded-xl border-slate-200 focus:border-indigo-500"
                                                      />
                                                    </div>
                                                  )}

                                                  {q.type === 'Matching' && (
                                                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                      <Label className="text-sm font-bold text-slate-700">Matching Pairs</Label>
                                                      <div className="space-y-2">
                                                        {(q.matchingPairs || [{left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''}]).map((pair, pIdx) => (
                                                          <div key={pIdx} className="grid grid-cols-2 gap-2">
                                                            <Input 
                                                              placeholder={`List I - ${String.fromCharCode(65 + pIdx)}`}
                                                              value={pair.left}
                                                              onChange={(e) => {
                                                                const updated = [...manualQuestions];
                                                                const pairs = [...(q.matchingPairs || [{left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''}])];
                                                                pairs[pIdx].left = e.target.value;
                                                                updated[qIdx].matchingPairs = pairs;
                                                                setManualQuestions(updated);
                                                              }}
                                                              className="h-9 text-xs rounded-lg"
                                                            />
                                                            <Input 
                                                              placeholder={`List II - ${pIdx + 1}`}
                                                              value={pair.right}
                                                              onChange={(e) => {
                                                                const updated = [...manualQuestions];
                                                                const pairs = [...(q.matchingPairs || [{left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''}, {left: '', right: ''}])];
                                                                pairs[pIdx].right = e.target.value;
                                                                updated[qIdx].matchingPairs = pairs;
                                                                setManualQuestions(updated);
                                                              }}
                                                              className="h-9 text-xs rounded-lg"
                                                            />
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="space-y-2">
                                                      <div className="flex items-center justify-between px-1">
                                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                          Option {oIdx + 1} <span className="text-rose-500">*</span>
                                                        </Label>
                                                        <label className="flex items-center gap-1.5 cursor-pointer group/radio">
                                                          <span className="text-[10px] font-bold text-slate-400 group-hover/radio:text-indigo-600 transition-colors">Correct</span>
                                                          <input 
                                                            type="radio" 
                                                            name={`correct-${qIdx}`}
                                                            checked={q.correctAnswer === oIdx}
                                                            onChange={() => updateManualQuestion(qIdx, 'correctAnswer', oIdx)}
                                                            className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                                          />
                                                        </label>
                                                      </div>
                                                      <Input 
                                                        placeholder={`Option ${oIdx + 1}`} 
                                                        value={opt}
                                                        onChange={(e) => updateManualOption(qIdx, oIdx, e.target.value)}
                                                        className={`rounded-xl transition-all ${
                                                          q.correctAnswer === oIdx 
                                                            ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20" 
                                                            : showValidationErrors && !opt 
                                                              ? "border-rose-500 ring-rose-500/10"
                                                              : "border-slate-200"
                                                        }`}
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-bold text-slate-700">Explanation (Optional)</Label>
                                                  <Textarea 
                                                    placeholder="Explain why the correct answer is right..." 
                                                    className="h-20 resize-none rounded-xl border-slate-200 focus:border-indigo-500"
                                                    value={q.explanation}
                                                    onChange={(e) => updateManualQuestion(qIdx, 'explanation', e.target.value)}
                                                  />
                                                </div>
                                              </CardContent>
                                            </Card>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </DragDropContext>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6 py-2"
                  >
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                      <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" /> Quiz Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Title</p>
                          <p className="font-bold text-slate-800">{quizTitle}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Difficulty</p>
                          <Badge className="bg-indigo-600">{difficulty}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Time Limit</p>
                          <p className="font-bold text-slate-800">{timePerQuestion}s / question</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Method</p>
                          <p className="font-bold text-slate-800">{createMode === 'ai' ? 'AI Generated' : 'Manual Entry'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" /> 
                        {createMode === 'ai' ? 'AI Configuration' : 'Question Check'}
                      </h3>
                      {createMode === 'ai' ? (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                          <p className="text-sm text-slate-600">
                            AI will generate <span className="font-bold text-indigo-600">{quizCount}</span> questions based on your provided material.
                          </p>
                          {quizSource ? (
                            <div className="text-xs text-slate-400 line-clamp-2 italic">
                              "{quizSource.substring(0, 100)}..."
                            </div>
                          ) : capturedImage ? (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" /> Image provided for analysis
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-slate-600">
                                You have added <span className="font-bold text-indigo-600">{manualQuestions.length}</span> questions.
                              </p>
                              <Badge variant={manualQuestions.every(q => {
                                const basicValid = q.question && q.options.every(o => o);
                                if (q.type === 'Assertion-Reason') return basicValid && q.reason;
                                if (q.type === 'Statement-Based') return basicValid && q.statement2;
                                if (q.type === 'Matching') return basicValid && q.matchingPairs && q.matchingPairs.every(p => p.left && p.right);
                                return basicValid;
                              }) ? "default" : "destructive"}>
                                {manualQuestions.every(q => {
                                  const basicValid = q.question && q.options.every(o => o);
                                  if (q.type === 'Assertion-Reason') return basicValid && q.reason;
                                  if (q.type === 'Statement-Based') return basicValid && q.statement2;
                                  if (q.type === 'Matching') return basicValid && q.matchingPairs && q.matchingPairs.every(p => p.left && p.right);
                                  return basicValid;
                                }) ? "All Complete" : "Incomplete Questions"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {['MCQ', 'Assertion-Reason', 'Statement-Based', 'Matching'].map(type => {
                              const count = manualQuestions.filter(q => (q.type || 'MCQ') === type).length;
                              if (count === 0) return null;
                              return (
                                <div key={type} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                  <span className="text-xs font-bold text-slate-500">{type}</span>
                                  <Badge variant="outline" className="text-indigo-600 border-indigo-100 bg-indigo-50">{count}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50/50 flex items-center justify-between sm:justify-between">
            {creationStep === 1 ? (
              <>
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="rounded-full">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (!quizTitle) {
                      setShowValidationErrors(true);
                      toast.error("Please enter a quiz title.");
                      return;
                    }
                    if (createMode === 'ai') {
                      if (!quizSource && !capturedImage) {
                        setShowValidationErrors(true);
                        toast.error("Please provide study material.");
                        return;
                      }
                      handleIdentifyTopics(quizSource);
                    } else {
                      setCreationStep(2);
                    }
                  }} 
                  disabled={isIdentifyingTopics}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-8 gap-2"
                >
                  {isIdentifyingTopics ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Next: {createMode === 'ai' ? "Parameters" : "Editor"} <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (creationStep >= 2 && creationStep <= 4) ? (
              <>
                <Button variant="ghost" onClick={() => setCreationStep(1)} className="rounded-full gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={() => {
                    if (createMode === 'manual') {
                      const isValid = manualQuestions.every(q => {
                        const basicValid = q.question && q.options.every(o => o);
                        if (q.type === 'Assertion-Reason') return basicValid && q.reason;
                        if (q.type === 'Statement-Based') return basicValid && q.statement2;
                        if (q.type === 'Matching') return basicValid && q.matchingPairs && q.matchingPairs.every(p => p.left && p.right);
                        return basicValid;
                      });
                      if (!isValid) {
                        setShowValidationErrors(true);
                        toast.error("Please complete all questions.");
                        return;
                      }
                    }
                    setShowValidationErrors(false);
                    setCreationStep(5);
                  }} 
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-8 gap-2"
                >
                  Review Quiz <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setCreationStep(2)} className="rounded-full gap-2" disabled={isGenerating}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <div className="flex gap-2">
                  {createMode === 'ai' ? (
                    <Button 
                      onClick={handleGenerate} 
                      disabled={isGenerating}
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-8"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Quiz"
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSaveManual} 
                      disabled={isGenerating}
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-8"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Quiz"
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">Quiz Complete!</DialogTitle>
          </DialogHeader>
          <div className="py-8">
            <div className="relative inline-block">
              <Trophy className="h-24 w-24 text-yellow-400 mx-auto mb-4" />
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xl font-bold h-12 w-12 rounded-full flex items-center justify-center border-4 border-white"
              >
                {lastScore}
              </motion.div>
            </div>
            <p className="text-slate-600 text-lg mt-4">
              You got <span className="font-bold text-slate-900">{lastScore}</span> questions right!
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowResultDialog(false)} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Back to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="py-8 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© 2026 QuizShare AI. Powered by Gemini.</p>
        </div>
      </footer>
    </div>
  );
}
