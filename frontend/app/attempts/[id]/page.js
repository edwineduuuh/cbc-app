"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  CheckCircle,
  XCircle,
  Award,
  ArrowLeft,
  Download,
  Trophy,
  Star,
  Sparkles,
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";

export default function AttemptResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [results, setResults] = useState(null);
  const [quizGrade, setQuizGrade] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchResults();
  }, [params.id, user]);

  const fetchResults = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/attempts/${params.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);

        // Fetch quiz details to get grade
        const quizRes = await fetch(
          `${API}/quizzes/${data.quiz?.id || data.quiz_id}/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (quizRes.ok) {
          const quizData = await quizRes.json();
          setQuizGrade(quizData.grade);
        }
      }
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate grade band
  const getGradeBand = (score, grade) => {
    if (!grade) return null;

    // Primary (Grades 4-6)
    if (grade >= 4 && grade <= 6) {
      if (score >= 75)
        return {
          grade: "EE",
          label: "Exceeds Expectations",
          color: "from-green-500 to-emerald-600",
        };
      if (score >= 50)
        return {
          grade: "ME",
          label: "Meets Expectations",
          color: "from-blue-500 to-indigo-600",
        };
      if (score >= 25)
        return {
          grade: "AE",
          label: "Approaches Expectations",
          color: "from-yellow-500 to-orange-500",
        };
      return {
        grade: "BE",
        label: "Below Expectations",
        color: "from-red-500 to-pink-600",
      };
    }

    // Junior/Senior (Grades 7-12)
    if (score >= 90)
      return {
        grade: "EE1",
        label: "Exceeds Expectations",
        color: "from-green-500 to-emerald-600",
      };
    if (score >= 75)
      return {
        grade: "EE2",
        label: "Exceeds Expectations",
        color: "from-green-400 to-emerald-500",
      };
    if (score >= 58)
      return {
        grade: "ME1",
        label: "Meets Expectations",
        color: "from-blue-500 to-indigo-600",
      };
    if (score >= 41)
      return {
        grade: "ME2",
        label: "Meets Expectations",
        color: "from-blue-400 to-indigo-500",
      };
    if (score >= 31)
      return {
        grade: "AE1",
        label: "Approaches Expectations",
        color: "from-yellow-500 to-orange-500",
      };
    if (score >= 21)
      return {
        grade: "AE2",
        label: "Approaches Expectations",
        color: "from-yellow-400 to-orange-400",
      };
    if (score >= 11)
      return {
        grade: "BE1",
        label: "Below Expectations",
        color: "from-red-500 to-pink-600",
      };
    return {
      grade: "BE2",
      label: "Below Expectations",
      color: "from-red-400 to-pink-500",
    };
  };

  // Get encouraging message based on performance
  // Get dynamic encouraging message based on performance
  const getEncouragingMessage = (score, gradeBand) => {
    const messages = {
      excellent: [
        {
          emoji: "🎉",
          title: "Outstanding Performance!",
          message:
            "You've absolutely crushed this! Your understanding is crystal clear. You're not just learning—you're mastering. This is the kind of performance that opens doors. Keep this momentum going!",
        },
        {
          emoji: "🏆",
          title: "Phenomenal Work!",
          message:
            "Wow! You didn't just pass—you dominated this quiz. Your grasp of the concepts is exceptional. You're setting the standard here. This level of excellence will take you far!",
        },
        {
          emoji: "⚡",
          title: "Absolutely Brilliant!",
          message:
            "You're on fire! This performance shows true mastery. You're not just answering questions—you're demonstrating real understanding. Keep pushing these boundaries!",
        },
      ],
      great: [
        {
          emoji: "⭐",
          title: "Excellent Work!",
          message:
            "You're performing at a really high level! Your hard work is clearly paying off. With just a bit more focus on the tricky areas, you'll be hitting perfect scores regularly. You're so close to excellence!",
        },
        {
          emoji: "🌟",
          title: "Really Strong Performance!",
          message:
            "This is impressive! You've got a solid grasp on the material. A few small improvements and you'll be unstoppable. Your dedication is showing—keep it up!",
        },
        {
          emoji: "💫",
          title: "Great Job!",
          message:
            "You're doing really well! Your understanding is strong and you're making great progress. Focus on those few areas you missed and you'll reach the top tier. You've got this!",
        },
      ],
      good: [
        {
          emoji: "👏",
          title: "Good Progress!",
          message:
            "You're building solid foundations here! You understand the core concepts. Now it's about refining and practicing the parts that challenged you. Every question you missed is a learning opportunity. Stay focused!",
        },
        {
          emoji: "💪",
          title: "You're On Track!",
          message:
            "Nice work! You're meeting the standards and showing understanding. Review the questions you found tricky, practice a bit more, and you'll see real improvement. You're heading in the right direction!",
        },
        {
          emoji: "🎯",
          title: "Solid Effort!",
          message:
            "You're doing well! The fundamentals are there. Spend some extra time on the concepts that were challenging and you'll level up quickly. Consistency is key—keep practicing!",
        },
      ],
      developing: [
        {
          emoji: "🌱",
          title: "Keep Building!",
          message:
            "You're making progress, and that's what counts! Learning takes time. Go back through the material, take notes on what you missed, and try again. Each attempt makes you stronger. Don't give up—you're getting there!",
        },
        {
          emoji: "📚",
          title: "Time to Strengthen Your Foundation",
          message:
            "This is your signal to slow down and really understand the basics. There's no rush! Review the concepts, ask questions, and practice more. Every expert started exactly where you are now. Keep going!",
        },
        {
          emoji: "💡",
          title: "Learning Opportunity Ahead!",
          message:
            "This quiz showed you exactly what to work on—that's valuable! Take it as a roadmap. Focus on understanding, not just memorizing. Break it down, study bit by bit, and come back stronger. You've got potential!",
        },
      ],
      struggling: [
        {
          emoji: "🌟",
          title: "Every Journey Starts Somewhere",
          message:
            "Right now might feel tough, but here's the truth: struggle means you're learning. Take this as a clear guide on what needs attention. Start with one concept at a time. Ask for help. Practice daily. Small steps lead to big wins. Don't quit!",
        },
        {
          emoji: "🎯",
          title: "Let's Build From Here",
          message:
            "This score isn't where you want to be, and that's okay—it's where you START. Review the basics carefully. Find someone to explain what's confusing. Practice every single day, even just 15 minutes. Growth happens when you refuse to give up. Start today!",
        },
        {
          emoji: "💪",
          title: "Time For A Fresh Start",
          message:
            "This is tough, but you can turn it around! Go back to the fundamentals. Watch videos, read notes, ask teachers for help. Then practice, practice, practice. Everyone learns at their own pace. What matters is that you keep trying. You CAN do this!",
        },
      ],
    };

    let category;
    if (score >= 90) category = "excellent";
    else if (score >= 75) category = "great";
    else if (score >= 50) category = "good";
    else if (score >= 30) category = "developing";
    else category = "struggling";

    const options = messages[category];
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Results not found</h2>
          <Button onClick={() => router.push("/quizzes")}>
            Back to Quizzes
          </Button>
        </Card>
      </div>
    );
  }

  const feedback = results.detailed_feedback || {};
  const questionIds = Object.keys(feedback);
  const score = Math.round(results.score);
  const gradeBand = getGradeBand(score, quizGrade);
  const encouragement = getEncouragingMessage(score, gradeBand);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => router.push("/quizzes")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes
        </button>

        {/* Score Card */}
        <Card
          className={`p-8 text-center bg-gradient-to-br ${gradeBand?.color || "from-blue-500 to-indigo-600"} text-white relative overflow-hidden`}
        >
          {/* Decorative elements */}
          {score >= 75 && (
            <>
              <Sparkles className="absolute top-4 left-4 w-8 h-8 opacity-30 animate-pulse" />
              <Sparkles className="absolute bottom-4 right-4 w-8 h-8 opacity-30 animate-pulse" />
              <Star className="absolute top-4 right-4 w-6 h-6 opacity-20" />
              <Star className="absolute bottom-4 left-4 w-6 h-6 opacity-20" />
            </>
          )}

          {score >= 90 ? (
            <Trophy className="w-16 h-16 mx-auto mb-4 animate-bounce" />
          ) : (
            <Award className="w-16 h-16 mx-auto mb-4" />
          )}

          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {results.quiz_title}
          </h1>

          {/* Grade Band */}
          {gradeBand && (
            <div className="mb-4">
              <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-3 rounded-2xl">
                <div className="text-5xl md:text-6xl font-black mb-1">
                  {gradeBand.grade}
                </div>
                <div className="text-sm md:text-base font-semibold opacity-90">
                  {gradeBand.label}
                </div>
              </div>
            </div>
          )}

          {/* Score */}
          <div className="text-5xl md:text-6xl font-bold my-6">{score}%</div>

          {/* Raw Marks */}
          <div className="text-xl md:text-2xl font-semibold text-white/90 mb-6">
            <span className="text-3xl md:text-4xl font-bold">
              {results.total_marks_awarded || 0}
            </span>
            <span className="text-2xl mx-2">/</span>
            <span className="text-3xl md:text-4xl font-bold">
              {results.total_max_marks || 0}
            </span>
            <div className="text-base mt-1 opacity-75">marks</div>
          </div>

          {/* Stats */}
          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-base md:text-lg mb-6">
            <div>
              <span className="font-semibold">{results.correct_answers}</span>
              <span className="opacity-80"> / {results.total_questions}</span>
              <p className="text-xs md:text-sm opacity-75">Questions Correct</p>
            </div>
          </div>
          <div
            className={`inline-block px-6 py-3 rounded-full text-base md:text-lg font-bold ${
              results.passed
                ? "bg-white/30 backdrop-blur-sm text-white border-2 border-white/50"
                : "bg-white/20 backdrop-blur-sm text-white"
            }`}
          >
            {results.passed ? "✓ PASSED" : "Keep Practicing!"}
          </div>
        </Card>

        {/* Encouraging Message */}
        <Card className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{encouragement.emoji}</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-purple-900 mb-2">
                {encouragement.title}
              </h3>
              <p className="text-purple-800 leading-relaxed">
                {encouragement.message}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Question by Question Feedback */}
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Detailed Feedback
        </h2>

        {questionIds.map((qId, index) => {
          const item = feedback[qId];
          return (
            <Card key={qId} className="p-4 md:p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.is_correct ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {item.is_correct ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="font-semibold text-gray-900">
                      Question {index + 1}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap ${
                        item.is_correct
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.marks_awarded} / {item.max_marks} marks
                    </span>
                  </div>

                  <p className="text-gray-700 mb-4">{item.question_text}</p>

                  {/* Student Answer */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      Your Answer:
                    </p>
                    <div className="text-blue-800 whitespace-pre-line">
                      {item.student_answer
                        ? item.student_answer.split("\n").map((line, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 mb-1"
                            >
                              {line.trim() && <span>•</span>}
                              <span>{line.trim()}</span>
                            </div>
                          ))
                        : "(No answer provided)"}
                    </div>
                  </div>

                  {/* AI Feedback */}
                  <div
                    className={`p-4 rounded-lg mb-4 ${
                      item.is_correct
                        ? "bg-green-50 border border-green-200"
                        : "bg-yellow-50 border border-yellow-200"
                    }`}
                  >
                    <p className="text-sm font-semibold mb-1">
                      {item.is_correct ? "✓ Correct!" : "Feedback:"}
                    </p>
                    <p className="text-sm">{item.feedback}</p>

                    {/* Personalized Message */}
                    {item.personalized_message && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                          💡 <strong>For you:</strong>{" "}
                          {item.personalized_message}
                        </p>
                      </div>
                    )}

                    {/* Study Tip */}
                    {item.study_tip && (
                      <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-900">
                          📚 <strong>Study tip:</strong> {item.study_tip}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Points Earned/Missed */}
                  {item.points_earned && item.points_earned.length > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg mb-2">
                      <p className="text-sm font-semibold text-green-900 mb-1">
                        ✓ Points you got:
                      </p>
                      <ul className="text-sm text-green-800 list-disc list-inside">
                        {item.points_earned.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.points_missed && item.points_missed.length > 0 && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm font-semibold text-orange-900 mb-1">
                        ⚠ Points you missed:
                      </p>
                      <ul className="text-sm text-orange-800 list-disc list-inside">
                        {item.points_missed.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Correct Answer */}
                  {!item.is_correct && item.correct_answer && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-4">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        Correct Answer:
                      </p>
                      <p className="text-gray-700">{item.correct_answer}</p>
                      {item.explanation && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            {item.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="max-w-4xl mx-auto mt-8 flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/quizzes")}
          className="flex-1"
        >
          Back to Quizzes
        </Button>
        <Button
          variant="primary"
          onClick={() => window.print()}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Results
        </Button>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
