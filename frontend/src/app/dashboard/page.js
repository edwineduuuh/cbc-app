"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Trophy,
  Flame,
  ChevronRight,
  Target,
  TrendingUp,
  Award,
  BarChart3,
  Sparkles,
  Crown,
  Heart,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cbc-backend-production-8bc4.up.railway.app/api";
const QUOTES = [
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
  },
  {
    text: "Education is the most powerful weapon you can use to change the world.",
    author: "Nelson Mandela",
  },
  {
    text: "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
  },
  {
    text: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
  },
  {
    text: "Success is not final, failure is not fatal — it is the courage to continue.",
    author: "Winston Churchill",
  },
  {
    text: "The more that you read, the more things you will know.",
    author: "Dr. Seuss",
  },
  {
    text: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
  },
  {
    text: "It always seems impossible until it is done.",
    author: "Nelson Mandela",
  },
  {
    text: "Don't watch the clock — do what it does. Keep going.",
    author: "Sam Levenson",
  },
  {
    text: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
  },
  {
    text: "Discovering the unexpected is more important than confirming the known.",
    author: "George Box",
  },
  {
    text: "There is no elevator to success, you have to take the stairs.",
    author: "Zig Ziglar",
  },
  {
    text: "May you live every day of your life.",
    author: "Jonathan Swift",
  },
  {
    text: "You can't cross the sea merely by standing and staring at the water.",
    author: "Rabindranath Tagore",
  },
  {
    text: "What matters most is how well you walk through the fire.",
    author: "Charles Bukowski",
  },
  {
    text: "Nothing will work unless you do",
    author: "Maya Angelou",
  },
  {
    text: "Failure is the condiment that gives success its flavor.",
    author: "Truman Capote",
  },
  {
    text: "The work of today is the history of tomorrow, and we are its makers.",
    author: "Juliette Gordon Low",
  },
  {
    text: "Knowing is not enough; we must apply. Wishing is not enough; we must do",
    author: "Johann Wolfgang von Goeth",
  },
  {
    text: "Once we accept our limits, we go beyond them",
    author: "Albert Einstein",
  },
  {
    text: "Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time",
    author: "Thomas A. Edison",
  },
  {
    text: "Today's accomplishments were yesterday's impossibilities",
    author: "Robert H. Schuller",
  },
  {
    text: "Everybody has talent, but ability takes hard work",
    author: "Michael Jordan",
  },
  {
    text: "We first make our habits, then our habits make us.",
    author: "John Dryden",
  },
  {
    text: "Failure will never overtake me if my determination to succeed is strong enough",
    author: "Og Mandino",
  },
  {
    text: "The power of imagination makes us infinite",
    author: "John Muir",
  },
  {
    text: "We cannot solve our problems with the same thinking we used when we created them",
    author: "Albert Einstein",
  },
  {
    text: "Don't let yesterday take up too much of today.",
    author: "Will Rogers",
  },
  {
    text: "It is not the strongest of the species that survive, nor the most intelligent, but the one most responsive to change",
    author: "Charles Darwin",
  },
  {
    text: "Life is 10% what happens to you and 90% how you react to it",
    author: "Charles R. Swindoll",
  },
  {
    text: "The most common way people give up their power is by thinking they don't have any",
    author: "Alice Walker",
  },
  {
    text: "Nothing is impossible, the word itself says 'I'm possible'!",
    author: "Audrey Hepburn",
  },
  {
    text: "You can, you should, and if you're brave enough to start, you will",
    author: "Stephen King",
  },
  {
    text: "Those who say it can't be done should not interrupt the ones doing it",
    author: "",
  },
  {
    text: "If people never did silly things, nothing intelligent would ever get done.",
    author: "Ludwig Wittgenstein",
  },
  {
    text: "Be not afraid of greatness. Some are born great, some achieve greatness, and others have greatness thrust upon them",
    author: "William Shakespeare",
  },
  {
    text: "The future is not laid out on a track. It is something that we can decide, and to the extent that we do not violate any known laws of the universe, we can probably make it work the way that we want to",
    author: "Allan Kay",
  },
  {
    text: "The greatest enemy of knowledge is not ignorance, it is the illusion of knowledge",
    author: "Stephen Hawking",
  },
  {
    text: "You can't wait for inspiration. You have to go after it with a club",
    author: "Jack London",
  },
  {
    text: "The two most important days in your life are the day you are born and the day you find out why",
    author: "Mark Twain",
  },
  {
    text: "Sell your cleverness and buy bewilderment",
    author: "Rumi",
  },
  {
    text: "We are all failures. At least the best of us are.",
    author: "J M Barrie",
  },
  {
    text: "The harder I work, the luckier I get.",
    author: "Gary Player",
  },
  {
    text: "I attribute my success to this - I never gave or took any excuse",
    author: "Florence Nightingale",
  },
  {
    text: "If you have everything under control, you're not moving fast enough.",
    author: "Mario Andretti",
  },
  {
    text: "Make everything as simple as possible, but not simpler.",
    author: "Albert Einstein",
  },
  {
    text: "Life is like riding a bicycle. To keep your balance, you must keep moving",
    author: "Albert Einstein",
  },
  {
    text: "Whatever you are, be a good one",
    author: "Abraham Lincoln",
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop",
    author: "Confucius",
  },
  {
    text: "The more you know, the more you realize you know nothing",
    author: "Socrates",
  },
  {
    text: "Well done is better than well said",
    author: "Benjamin Franklin",
  },
  {
    text: "The world breaks everyone, and afterward, many are strong at the broken places",
    author: "Ernest Hemingway",
  },
  {
    text: "Forever is composed of nows",
    author: "Emily Dickinson",
  },
  {
    text: "Impossible is just a big word thrown around by small men who find it easier to live in the world they've been given than to explore the power they have to change it. Impossible is not a fact. It's an opinion. Impossible is not a declaration. It's a dare. Impossible is potential. Impossible is temporary. Impossible is nothing.",
    author: "Mohammed Ali",
  },
  {
    text: "If you're any good at all, you know you can be better.",
    author: "Lindsay Buckingham",
  },
  {
    text: "What you do speaks so loudly that I cannot hear what you say.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "Ever Tried. Ever failed. No matter. Try again. Fail again. Fail better",
    author: "Samuel Beckett",
  },
  {
    text: "Never confuse a single defeat with a final defeat.",
    author: "F. Scott Fitzgerald",
  },
  {
    text: "If you reveal your secrets to the wind, you should not blame the wind for revealing them to the trees.",
    author: "Kahlil Gibram",
  },
  {
    text: "There are far, far better things ahead than any we leave behind.",
    author: "C. S Lewis",
  },
  {
    text: "The best way out is always through.",
    author: "Robert Frost",
  },
  {
    text: "Strength does not come from physical capacity. It comes from an indomitable will.",
    author: "Mahatma Gandhi",
  },
  {
    text: "Do not wait to strike till the iron is hot; but make it hot by striking.",
    author: "William Buttler Yeats",
  },
  {
    text: "Creativity is a wild mind and a disciplined eye.",
    author: "Dorothy Parker",
  },
  {
    text: "Creativity is more than just being different. Anybody can plan weird. That's easy. What's hard is to be as simple as Bach. Making the simple, awesomely simple, that's creativity.",
    author: "Charles Mingus",
  },
  {
    text: "An ant on the move does more than a dozing ox.",
    author: "Lao Tzu",
  },
  {
    text: "With the possible exception of the equator, everything begins somewhere.",
    author: "C.S Lewis",
  },
  {
    text: "What you do makes a difference. And you have to decide what kind of difference you want to make.",
    author: "Jane Goodall",
  },
  {
    text: "With the new day comes new strength and new thoughts.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "The price of anything is the amount of life you exchange for it.",
    author: "Henry David Thoreau",
  },
  {
    text: "A life spent making mistakes is not only more honorable, but more useful than a life spent doing nothing.",
    author: "George Bernard Shaw",
  },
  {
    text: "The most exciting phrase to hear in science, the one that heralds discoveries, is not 'Eureka!' but 'Now that's funny…'",
    author: "Isaac Asimov",
  },
  {
    text: "Opportunity does not knock, it presents itself when you beat down the door.",
    author: "Kyle Chandler",
  },
  {
    text: "You miss 100% of the shots you don't take.",
    author: "Wayne Gretzky",
  },
  {
    text: "Light tomorrow with today.",
    author: "Elizabeth Barret Browning",
  },
  {
    text: "The best revenge is massive success.",
    author: "Frank Sinatra",
  },
  {
    text: "Without hard work, nothing grows but weeds.",
    author: "Gordon B. Hinckley",
  },
  {
    text: "Don't wish it were easier, wish you were better.",
    author: "Jim Rohn",
  },
  {
    text: "The scariest moment is always just before you start.",
    author: "Stephen King",
  },
  {
    text: "There is no glory in practice but without practice, there is no glory",
    author: " Oleg Vishnepolsky",
  },
  {
    text: "Depression hates a moving target",
    author: "Nita Sweeney",
  },
  {
    text: "If you don't risk anything, you risk even more.",
    author: "Erica Jong",
  },
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [expiryWarning, setExpiryWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
  );

  useEffect(() => {
    if (!authLoading && user) {
      // Teachers should never see the student dashboard
      if (user.role === "teacher") {
        router.replace("/teacher");
        return;
      }
      fetchData();
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const [statsRes, creditsRes] = await Promise.all([
        fetch(`${API}/analytics/student/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/credits/status/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [statsData, creditsData] = await Promise.all([
        statsRes.json(),
        creditsRes.json(),
      ]);

      setStats(statsData);
      setIsPremium(
        creditsData.has_subscription === true ||
          creditsData.quiz_credits === "unlimited",
      );
      if (creditsData.expiry_warning) {
        setExpiryWarning(creditsData.expiry_warning);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
      </div>
    );
  }

  const hasQuizzes = stats?.quizzes_completed > 0;
  const timeOfDay =
    new Date().getHours() < 12
      ? "morning"
      : new Date().getHours() < 18
        ? "afternoon"
        : "evening";

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', serif; }
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Subscription expiry warning */}
      {expiryWarning && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-xl">
            <span className="text-lg">⚠️</span>
            <span className="text-sm font-semibold flex-1">{expiryWarning}</span>
            <a href="/subscribe" className="text-xs font-bold text-amber-900 bg-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap">
              Renew Now
            </a>
          </div>
        </div>
      )}

      {/* Header with Quote */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-teal-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-teal-200 text-sm mb-1">Good {timeOfDay} 👋</p>
              <h1 className="font-display text-4xl font-bold text-white mb-3">
                {user?.username}
              </h1>

              {/* Quote integrated in header */}
              <p className="text-white font-semibold italic text-sm leading-relaxed">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="text-xs text-teal-200 mt-1">— {quote.author}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Always show if user has taken quizzes */}
        {hasQuizzes ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Quizzes Attempted"
              value={stats.quizzes_completed || 0}
              icon={BookOpen}
              color="teal"
            />
            <StatCard
              label="Perfect Score"
              value={stats.perfect_scores || 0}
              icon={Trophy}
              color="amber"
            />
            <StreakCard
              current={stats.current_streak || 0}
              longest={stats.longest_streak || 0}
            />
            <StatCard
              label="Average Score"
              value={Math.round(stats.average_score || 0)}
              suffix="%"
              icon={TrendingUp}
              color="emerald"
            />
          </div>
        ) : (
          // Welcome card for first-time users
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-teal-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Ready to start learning? 📚
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Take your first quiz to start tracking your progress and see
              detailed analytics.
            </p>
            <Link href="/explore">
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-slate-700 to-teal-600 hover:from-slate-800 hover:to-teal-700 text-white font-semibold transition-all shadow-lg">
                <BookOpen className="w-5 h-5" />
                Browse Quizzes
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        )}

        {/* Action Cards Grid */}
        <div
          className={`grid grid-cols-1 ${!isPremium ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"} gap-6`}
        >
          {/* Browse Quizzes Card */}
          <Link href="/explore">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-slate-700 to-teal-600 rounded-2xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-bold mb-2">Browse Quizzes</h3>
                <p className="text-teal-100 text-sm">
                  Access CBE quizzes organized by education level, grade, and
                  learning area
                </p>
              </div>
            </motion.div>
          </Link>

          {/* View Progress Card */}
          <Link href="/progress">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-bold mb-2">View Analytics</h3>
                <p className="text-blue-100 text-sm">
                  Track your performance, identify strengths and areas for
                  improvement
                </p>
              </div>
            </motion.div>
          </Link>

          {/* Life Skills Card */}
          <Link href="/life-skills">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-linear-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Heart className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-bold mb-2">Life Skills</h3>
                <p className="text-rose-100 text-sm">
                  Money, relationships, digital safety, health & citizenship
                </p>
              </div>
            </motion.div>
          </Link>

          {/* Subscribe CTA Card — only for non-premium */}
          {!isPremium && (
            <Link href="/subscribe">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all" />
                <div className="absolute top-3 right-3">
                  <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                    From KES 149/wk
                  </span>
                </div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Crown className="w-6 h-6" />
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Go Premium</h3>
                  <p className="text-amber-100 text-sm">
                    Unlimited quizzes, AI feedback, analytics & more
                  </p>
                </div>
              </motion.div>
            </Link>
          )}
        </div>

        {/* Performance Insights (if has quizzes) */}
        {hasQuizzes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Quick Insights</h3>
                <p className="text-xs text-gray-500">Your learning overview</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InsightCard
                label="Quizzes Passed"
                value={stats.quizzes_passed || 0}
                icon={Award}
                color="emerald"
              />
              <InsightCard
                label="Study Time"
                value={
                  (stats.time_studied_hours || 0) >= 1
                    ? `${Math.floor(stats.time_studied_hours)}h ${Math.round((stats.time_studied_hours % 1) * 60)}m`
                    : `${Math.round((stats.time_studied_hours || 0) * 60)}m`
                }
                icon={BookOpen}
                color="blue"
              />
              <InsightCard
                label="Total Sessions"
                value={stats.total_sessions || 0}
                icon={Target}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component (clean version)
function StreakCard({ current, longest }) {
  const streakMsg =
    current === 0
      ? "Take a quiz to start your streak!"
      : current >= 30
        ? "Legendary! 🏆"
        : current >= 14
          ? "On fire! Keep going!"
          : current >= 7
            ? "One week strong! 💪"
            : current >= 3
              ? "Building momentum!"
              : "Keep it up!";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-2xl border border-orange-200 shadow-sm p-5 hover:shadow-md transition-all relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
          <Flame className="w-5 h-5 text-white" />
        </div>
        {current > 0 && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl"
          >
            🔥
          </motion.div>
        )}
      </div>
      <p className="text-gray-500 text-xs font-medium mb-1">Current Streak</p>
      <p className="text-3xl font-bold text-gray-900">
        {current}
        <span className="text-lg text-gray-500"> days</span>
      </p>
      <p className="text-xs text-orange-600 font-medium mt-1">{streakMsg}</p>
      {longest > 0 && (
        <p className="text-xs text-gray-400 mt-0.5">Best: {longest} days</p>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, suffix = "", icon: Icon, color = "teal" }) {
  const colors = {
    teal: "from-teal-500 to-cyan-600",
    amber: "from-amber-500 to-orange-500",
    emerald: "from-emerald-500 to-green-600",
    rose: "from-rose-500 to-pink-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value}
        <span className="text-lg text-gray-500">{suffix}</span>
      </p>
    </motion.div>
  );
}

// Insight Card Component
function InsightCard({
  label,
  value,
  suffix = "",
  icon: Icon,
  color = "teal",
}) {
  const colors = {
    teal: "text-teal-600 bg-teal-50",
    emerald: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
      <div
        className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-900">
          {value}
          {suffix}
        </p>
      </div>
    </div>
  );
}
