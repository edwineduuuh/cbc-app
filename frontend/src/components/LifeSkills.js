"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Wallet,
  Heart,
  Shield,
  Stethoscope,
  Landmark,
  Rocket,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Users,
  Brain,
  Globe,
  Clock,
  Star,
} from "lucide-react";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  LIFE SKILLS CONTENT DATABASE                            */
/*  Grade-adaptive: "junior" (4-6) vs "senior" (7-9+)      */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const TOPICS = [
  {
    id: "money",
    title: "Money & Financial Literacy",
    icon: Wallet,
    color: "#059669",
    gradient: "from-emerald-500 to-teal-600",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    emoji: "💰",
    description: "Learn to manage money wisely and plan for the future",
    junior: {
      subtitle: "Smart Money Basics",
      tips: [
        {
          text: "Save part of any money you receive — even KES 10 counts",
          type: "do",
        },
        {
          text: "Know the difference between needs (food, school) and wants (toys, sweets)",
          type: "do",
        },
        { text: "Keep a simple record of money in and money out", type: "do" },
        {
          text: "Ask before buying — compare prices at different shops",
          type: "do",
        },
        {
          text: "Don't spend all your money the same day you get it",
          type: "dont",
        },
        { text: "Don't borrow money from friends to buy snacks", type: "dont" },
      ],
      scenarios: [
        {
          question:
            "You receive KES 200 for your birthday. What should you do?",
          good: "Save at least KES 100 and use the rest on something you really need",
          bad: "Spend it all on sweets and chips at break time",
        },
        {
          question:
            "Your friend wants you to buy them lunch every day. What do you do?",
          good: "Kindly explain that you have a budget and can share sometimes, not every day",
          bad: "Keep buying to make them happy, even when your money runs low",
        },
      ],
      keyLesson:
        "Money is a tool — the sooner you learn to manage it, the more freedom you'll have when you grow up.",
    },
    senior: {
      subtitle: "Financial Independence Skills",
      tips: [
        {
          text: "Create a monthly budget — track every shilling that comes in and goes out",
          type: "do",
        },
        {
          text: "Learn about M-Pesa savings options and interest rates",
          type: "do",
        },
        {
          text: "Understand the difference between assets (things that grow in value) and liabilities (things that cost you money)",
          type: "do",
        },
        {
          text: "Start a small income project — selling, tutoring, or a creative skill",
          type: "do",
        },
        {
          text: "Don't take loans or fuliza for non-essential things",
          type: "dont",
        },
        {
          text: "Don't fall for quick money schemes — if it sounds too good, it probably is",
          type: "dont",
        },
        {
          text: "Never share your M-Pesa PIN or bank details with anyone",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "A classmate tells you about a 'business' that doubles your money in a week. What do you do?",
          good: "Research it carefully, ask trusted adults — legitimate investments don't guarantee instant returns",
          bad: "Give them your savings because you trust them and want quick money",
        },
        {
          question:
            "You earn KES 1,000 from weekend work. How do you handle it?",
          good: "Save 50%, use 30% for necessities, and 20% for wants — the 50/30/20 rule",
          bad: "Treat friends to a big meal and figure out the rest later",
        },
      ],
      keyLesson:
        "Financial literacy is the number one skill that schools don't teach well enough. Start building it now and you'll be years ahead of your peers.",
    },
  },
  {
    id: "relationships",
    title: "Relationships & Communication",
    icon: Heart,
    color: "#e11d48",
    gradient: "from-rose-500 to-pink-600",
    bg: "#fff1f2",
    border: "#fecdd3",
    emoji: "🤝",
    description: "Build healthy friendships and communicate with confidence",
    junior: {
      subtitle: "Being a Good Friend",
      tips: [
        {
          text: "Listen when others are talking — don't just wait for your turn to speak",
          type: "do",
        },
        { text: "Say sorry when you make a mistake, and mean it", type: "do" },
        {
          text: "Include others who are alone — everyone deserves a friend",
          type: "do",
        },
        {
          text: "Tell a trusted adult if someone is bullying you or others",
          type: "do",
        },
        {
          text: "Don't spread rumors or talk about friends behind their backs",
          type: "dont",
        },
        {
          text: "Don't force someone to play with you — respect when they need space",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "Your friend is being left out by other kids at break time. What do you do?",
          good: "Invite them to join your group and stand up for them kindly",
          bad: "Ignore it because you don't want the group to target you too",
        },
        {
          question:
            "You accidentally hurt your friend's feelings. What should you do?",
          good: "Apologize sincerely, ask how they feel, and try to make it right",
          bad: "Pretend nothing happened and hope they forget about it",
        },
      ],
      keyLesson:
        "The way you treat people now is building habits you'll carry for life. Kindness and honesty are superpowers.",
    },
    senior: {
      subtitle: "Building Meaningful Relationships",
      tips: [
        {
          text: "Communicate openly — express how you feel without blaming others",
          type: "do",
        },
        {
          text: "Set healthy boundaries — it's OK to say no to things you're uncomfortable with",
          type: "do",
        },
        {
          text: "Choose friends who support your goals, not those who pull you down",
          type: "do",
        },
        {
          text: "Learn to resolve conflicts through calm conversation, not shouting or silence",
          type: "do",
        },
        {
          text: "Respect others' differences — culture, beliefs, and opinions",
          type: "do",
        },
        {
          text: "Don't stay in friendships that make you feel bad about yourself",
          type: "dont",
        },
        {
          text: "Don't use social media to hurt, embarrass, or pressure others",
          type: "dont",
        },
        { text: "Don't let peer pressure override your values", type: "dont" },
      ],
      scenarios: [
        {
          question:
            "Your friends want you to skip school to hang out. What do you do?",
          good: "Politely decline and suggest meeting after school instead — true friends will respect that",
          bad: "Go along because you're afraid they'll think you're boring",
        },
        {
          question:
            "Someone you like is pressuring you to do something you're not ready for. What do you do?",
          good: "Firmly say no — anyone who respects you will respect your boundaries",
          bad: "Give in to keep them happy, even though you're uncomfortable",
        },
      ],
      keyLesson:
        "Healthy relationships are built on mutual respect, honest communication, and the freedom to be yourself.",
    },
  },
  {
    id: "digital",
    title: "Digital Life & Online Safety",
    icon: Shield,
    color: "#7c3aed",
    gradient: "from-violet-500 to-purple-600",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    emoji: "🔒",
    description: "Stay safe, smart, and responsible in the digital world",
    junior: {
      subtitle: "Being Safe Online",
      tips: [
        {
          text: "Never share your password, home address, or school name online",
          type: "do",
        },
        {
          text: "Tell a parent or teacher if someone online makes you uncomfortable",
          type: "do",
        },
        {
          text: "Only accept friend requests from people you know in real life",
          type: "do",
        },
        {
          text: "Take breaks from screens — go outside, play, read a book",
          type: "do",
        },
        {
          text: "Don't click on links from strangers or pop-up ads",
          type: "dont",
        },
        {
          text: "Don't post photos without asking your parents first",
          type: "dont",
        },
        {
          text: "Don't type mean things — if you wouldn't say it face to face, don't type it",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "Someone online asks where you live and what school you go to. What do you do?",
          good: "Don't answer and tell a parent or teacher immediately",
          bad: "Share the info because they seem friendly and want to be your friend",
        },
      ],
      keyLesson:
        "The internet is a tool, not a playground without rules. Protect your information like you'd protect your house keys.",
    },
    senior: {
      subtitle: "Digital Citizenship & Safety",
      tips: [
        {
          text: "Use strong, unique passwords — never the same one across accounts",
          type: "do",
        },
        {
          text: "Think before you post — anything online can be screenshotted and shared forever",
          type: "do",
        },
        {
          text: "Verify information before sharing — fight fake news",
          type: "do",
        },
        {
          text: "Balance screen time with real-life activities and face-to-face connections",
          type: "do",
        },
        {
          text: "Learn basic digital skills — they're as important as reading and writing",
          type: "do",
        },
        {
          text: "Don't share intimate photos — ever — with anyone",
          type: "dont",
        },
        {
          text: "Don't cyberbully — it can have real legal consequences",
          type: "dont",
        },
        {
          text: "Don't believe everything you read online — check multiple sources",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "A viral WhatsApp message claims a scholarship is giving free money. What do you do?",
          good: "Check the official organization's website or call them directly. Most forwarded 'opportunities' are scams.",
          bad: "Forward it to everyone and send your personal details to the link",
        },
        {
          question:
            "Someone creates a group to share mean memes about a classmate. What do you do?",
          good: "Leave the group, don't share the content, and report it if possible. Stand up, not along.",
          bad: "Stay in the group and laugh along because everyone else is doing it",
        },
      ],
      keyLesson:
        "Your digital footprint follows you for life. Every post, comment, and share builds your online reputation — make it one you're proud of.",
    },
  },
  {
    id: "health",
    title: "Health & Wellness",
    icon: Stethoscope,
    color: "#0891b2",
    gradient: "from-cyan-500 to-blue-600",
    bg: "#ecfeff",
    border: "#a5f3fc",
    emoji: "🏃",
    description:
      "Take care of your body and mind — they're the only ones you get",
    junior: {
      subtitle: "Healthy Habits for Life",
      tips: [
        {
          text: "Eat fruits and vegetables every day — aim for different colors",
          type: "do",
        },
        {
          text: "Drink plenty of clean water — at least 6-8 glasses daily",
          type: "do",
        },
        {
          text: "Sleep 9-11 hours every night — your brain grows while you sleep",
          type: "do",
        },
        {
          text: "Play outside for at least 1 hour daily — run, jump, climb",
          type: "do",
        },
        {
          text: "Wash your hands before eating and after using the bathroom",
          type: "do",
        },
        {
          text: "Don't skip breakfast — your brain needs fuel for school",
          type: "dont",
        },
        {
          text: "Don't stay up late watching screens — it hurts your sleep",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "Your friends only want to eat chips and soda at break time. What can you do?",
          good: "Bring your own healthy snack and share — you might inspire others to eat better too",
          bad: "Eat only junk food every day because everyone else does",
        },
      ],
      keyLesson:
        "Your body is like a machine — what you put in determines what comes out. Treat it well and it will carry you far.",
    },
    senior: {
      subtitle: "Physical & Mental Wellness",
      tips: [
        {
          text: "Exercise regularly — even 30 minutes of walking counts",
          type: "do",
        },
        {
          text: "Talk to someone you trust when you feel overwhelmed or sad",
          type: "do",
        },
        {
          text: "Learn about puberty and body changes — it's normal and nothing to be ashamed of",
          type: "do",
        },
        {
          text: "Practice stress management — deep breathing, journaling, or exercise",
          type: "do",
        },
        {
          text: "Get enough sleep — teenagers need 8-10 hours for optimal brain function",
          type: "do",
        },
        {
          text: "Don't use alcohol, drugs, or substances to cope with stress",
          type: "dont",
        },
        {
          text: "Don't ignore mental health — anxiety and depression are real and treatable",
          type: "dont",
        },
        {
          text: "Don't compare your body to social media images — they're usually edited",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "You've been feeling anxious about exams and can't sleep. What should you do?",
          good: "Talk to a parent, teacher, or counselor. Create a study plan to feel more in control. Practice breathing exercises.",
          bad: "Keep it to yourself, stay up all night studying, and pretend everything is fine",
        },
        {
          question:
            "An older student offers you alcohol at a gathering. What do you do?",
          good: "Say no confidently. Leave if you feel pressured. Real respect comes from standing by your choices, not giving in.",
          bad: "Try it because you don't want to look uncool in front of older kids",
        },
      ],
      keyLesson:
        "Mental health is just as important as physical health. Asking for help isn't weakness — it's one of the bravest things you can do.",
    },
  },
  {
    id: "government",
    title: "Government & Civic Life",
    icon: Landmark,
    color: "#ca8a04",
    gradient: "from-amber-500 to-yellow-600",
    bg: "#fefce8",
    border: "#fef08a",
    emoji: "🏛️",
    description:
      "Understand your rights, responsibilities, and how Kenya works",
    junior: {
      subtitle: "My Country, My Rights",
      tips: [
        {
          text: "Kenya has 47 counties — learn about yours and its leaders",
          type: "do",
        },
        {
          text: "Every child has the right to education, food, shelter, and protection",
          type: "do",
        },
        {
          text: "Respect the national flag, anthem, and symbols — they represent all of us",
          type: "do",
        },
        {
          text: "Keep your school and community clean — it's everyone's responsibility",
          type: "do",
        },
        {
          text: "Learn about different communities and cultures in Kenya — we're all one nation",
          type: "do",
        },
      ],
      scenarios: [
        {
          question:
            "Your friend says their tribe is better than others. What's the right response?",
          good: "Explain that all tribes are equal and Kenya's strength is its diversity. We have 40+ communities and each one matters.",
          bad: "Argue back that your own tribe is better, starting a bigger conflict",
        },
      ],
      keyLesson:
        "You are a Kenyan citizen with rights AND responsibilities. Understanding how your country works makes you a better citizen.",
    },
    senior: {
      subtitle: "Civic Awareness & Leadership",
      tips: [
        {
          text: "Understand the Constitution — it protects your rights and defines how government works",
          type: "do",
        },
        {
          text: "Know the three branches: Executive (President), Legislature (Parliament), Judiciary (Courts)",
          type: "do",
        },
        {
          text: "Get involved — join student leadership, community service, or youth organizations",
          type: "do",
        },
        {
          text: "Understand devolution — county governments handle local services like healthcare and roads",
          type: "do",
        },
        {
          text: "Follow current affairs — know what's happening in your country and the world",
          type: "do",
        },
        {
          text: "Don't be tribalistic — judge leaders by their actions, not their ethnic background",
          type: "dont",
        },
        {
          text: "Don't accept bribes or participate in corruption, even 'small' ones",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "During a school election, a candidate offers to buy you lunch if you vote for them. What do you do?",
          good: "Refuse and report it. Vote based on who has the best ideas for the school, not who gives bribes.",
          bad: "Take the lunch and vote for them — it's just a school election, it doesn't matter",
        },
        {
          question:
            "You see a public official doing something wrong. What can you do?",
          good: "Citizens have the right to report corruption through EACC or speak up through proper channels. Silence enables injustice.",
          bad: "Ignore it because nothing ever changes anyway",
        },
      ],
      keyLesson:
        "Democracy isn't something that happens to you — you are part of it. Your voice, your vote (when you're 18), and your actions shape Kenya's future.",
    },
  },
  {
    id: "future",
    title: "Future Planning & Careers",
    icon: Rocket,
    color: "#6366f1",
    gradient: "from-indigo-500 to-blue-600",
    bg: "#eef2ff",
    border: "#c7d2fe",
    emoji: "🚀",
    description: "Dream big, plan smart, and build the skills you'll need",
    junior: {
      subtitle: "Dreaming & Exploring",
      tips: [
        {
          text: "It's OK not to know what you want to be — try many different things!",
          type: "do",
        },
        {
          text: "Read about different careers — ask adults what they do and how they got there",
          type: "do",
        },
        {
          text: "Develop your hobbies — today's hobbies can become tomorrow's career",
          type: "do",
        },
        {
          text: "Work hard in all subjects — you never know which one will open the right door",
          type: "do",
        },
        {
          text: "Don't let anyone tell you what you can't be because of your gender, family, or background",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "Someone tells you that your dream career is impossible. What should you believe?",
          good: "Every successful person was once told they couldn't do it. Keep learning, keep trying, and find people who believe in you.",
          bad: "Give up and choose something 'safe' because they said so",
        },
      ],
      keyLesson:
        "The future belongs to those who prepare for it today. Every page you read, every quiz you take, every skill you learn is a brick in the foundation of your future.",
    },
    senior: {
      subtitle: "Strategic Life Planning",
      tips: [
        {
          text: "Research CBE pathways — STEM, Social Sciences, Arts & Sports — and explore what excites you",
          type: "do",
        },
        {
          text: "Build practical skills alongside academic ones — coding, writing, public speaking, financial literacy",
          type: "do",
        },
        {
          text: "Network — talk to people in careers you admire. LinkedIn, mentors, career days",
          type: "do",
        },
        {
          text: "Set SMART goals — Specific, Measurable, Achievable, Relevant, Time-bound",
          type: "do",
        },
        {
          text: "Develop a growth mindset — ability isn't fixed, it grows with effort and practice",
          type: "do",
        },
        {
          text: "Don't wait for motivation — build discipline and routine instead",
          type: "dont",
        },
        {
          text: "Don't compare your chapter 1 to someone else's chapter 10",
          type: "dont",
        },
        {
          text: "Don't put all your eggs in one basket — develop multiple skills and interests",
          type: "dont",
        },
      ],
      scenarios: [
        {
          question:
            "You love art but everyone says you should focus on 'serious' subjects. What do you do?",
          good: "Creative careers are real careers — graphic design, architecture, animation, fashion. Excel in art AND keep strong academics as a foundation.",
          bad: "Abandon your passion completely because of pressure, then feel unfulfilled later",
        },
        {
          question:
            "You're not sure which career path suits you. How do you decide?",
          good: "Take personality and aptitude tests, try internships or job shadowing, talk to counselors, and explore your StadiSpace pathway predictor.",
          bad: "Pick whatever your parents or friends tell you without doing your own research",
        },
      ],
      keyLesson:
        "Your career will span 40+ years. Invest time NOW in understanding yourself — your strengths, interests, and values. The right path is the one that fits YOU.",
    },
  },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  SUB-COMPONENTS                                          */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ScenarioCard({ scenario, color }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-800 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
          {scenario.question}
        </p>
      </div>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full px-4 py-3 text-xs font-semibold text-center transition-all hover:bg-gray-50"
          style={{ color }}
        >
          Tap to reveal the best response →
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 py-3 space-y-2.5"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Great choice
              </span>
              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                {scenario.good}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                Think again
              </span>
              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                {scenario.bad}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function TipItem({ tip }) {
  const isDo = tip.type === "do";
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span
        className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          isDo
            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
            : "bg-rose-50 text-rose-500 border border-rose-200"
        }`}
      >
        {isDo ? "✓" : "✗"}
      </span>
      <p className="text-sm text-gray-700 leading-relaxed">{tip.text}</p>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  TOPIC DETAIL VIEW                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TopicDetail({ topic, tier, onBack, color }) {
  const content = tier === "junior" ? topic.junior : topic.senior;
  const Icon = topic.icon;
  const dos = content.tips.filter((t) => t.type === "do");
  const donts = content.tips.filter((t) => t.type === "dont");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Back + Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all topics
        </button>
        <div
          className={`bg-linear-to-br ${topic.gradient} rounded-2xl p-6 text-white relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 text-8xl flex items-center justify-center">
            {topic.emoji}
          </div>
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-1">{topic.title}</h2>
            <p className="text-white/80 text-sm">{content.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Do This
          </h3>
          <div className="space-y-1">
            {dos.map((tip, i) => (
              <TipItem key={i} tip={tip} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-rose-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Avoid This
          </h3>
          <div className="space-y-1">
            {donts.map((tip, i) => (
              <TipItem key={i} tip={tip} />
            ))}
          </div>
        </div>
      </div>

      {/* What Would You Do? Scenarios */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5" style={{ color: topic.color }} />
          What Would You Do?
        </h3>
        <div className="space-y-3">
          {content.scenarios.map((s, i) => (
            <ScenarioCard key={i} scenario={s} color={topic.color} />
          ))}
        </div>
      </div>

      {/* Key Takeaway */}
      <div
        className="rounded-2xl p-5 border-2"
        style={{
          background: topic.bg,
          borderColor: topic.border,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${topic.color}15` }}
          >
            <Star className="w-5 h-5" style={{ color: topic.color }} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">
              Key Takeaway
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {content.keyLesson}
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
        <p className="text-sm text-gray-500 mb-3">
          Want more? Explore quizzes related to this topic
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all"
        >
          <BookOpen className="w-4 h-4" /> Browse Quizzes
        </Link>
      </div>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  MAIN COMPONENT                                          */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function LifeSkills() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [completedTopics, setCompletedTopics] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stadispace_lifeskills_read");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const userGrade = user?.grade || 7;
  const tier = userGrade <= 6 ? "junior" : "senior";

  const markRead = (topicId) => {
    if (!completedTopics.includes(topicId)) {
      const updated = [...completedTopics, topicId];
      setCompletedTopics(updated);
      localStorage.setItem(
        "stadispace_lifeskills_read",
        JSON.stringify(updated),
      );
    }
  };

  const progress = Math.round((completedTopics.length / TOPICS.length) * 100);

  if (selectedTopic) {
    const topic = TOPICS.find((t) => t.id === selectedTopic);
    if (topic) {
      markRead(topic.id);
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
            <TopicDetail
              topic={topic}
              tier={tier}
              onBack={() => setSelectedTopic(null)}
              color={topic.color}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-to-br from-slate-800 via-slate-700 to-teal-700 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-teal-300 bg-white/10 px-2.5 py-1 rounded-full">
                {tier === "junior" ? "Grades 4–6" : "Grades 7–9+"} Edition
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Life Skills Academy
            </h1>
            <p className="text-gray-300 text-sm sm:text-base max-w-lg leading-relaxed">
              Real-world knowledge that textbooks don&apos;t cover. Skills for
              money, relationships, safety, health, citizenship, and your
              future.
            </p>

            {/* Progress Ring */}
            {completedTopics.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${progress * 0.942} 100`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                    {completedTopics.length}/{TOPICS.length}
                  </span>
                </div>
                <span className="text-xs text-gray-300">
                  {completedTopics.length === TOPICS.length
                    ? "All topics explored! 🎉"
                    : `${TOPICS.length - completedTopics.length} topics remaining`}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Topic Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOPICS.map((topic, idx) => {
            const Icon = topic.icon;
            const isRead = completedTopics.includes(topic.id);
            const content = tier === "junior" ? topic.junior : topic.senior;
            return (
              <motion.button
                key={topic.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                onClick={() => setSelectedTopic(topic.id)}
                className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all p-5 relative overflow-hidden"
              >
                {/* Read badge */}
                {isRead && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                )}

                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${topic.color}08, transparent 70%)`,
                  }}
                />

                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: topic.bg }}
                  >
                    <Icon className="w-6 h-6" style={{ color: topic.color }} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-gray-800">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    {topic.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: topic.bg,
                        color: topic.color,
                      }}
                    >
                      {content.tips.length} tips · {content.scenarios.length}{" "}
                      scenario
                      {content.scenarios.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Parents Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-linear-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                A Note for Parents
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Life Skills Academy covers topics that matter beyond the
                classroom — financial literacy, online safety, health awareness,
                and civic responsibility. All content is age-appropriate and
                aligned with Kenya&apos;s Competency-Based Education values. We
                encourage you to explore these topics together with your child
                and use the scenarios as conversation starters.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-400 mb-2">
            New topics and scenarios added regularly
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
