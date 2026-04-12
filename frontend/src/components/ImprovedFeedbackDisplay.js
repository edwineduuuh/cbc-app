"use client";

import {
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Book,
  Lightbulb,
} from "lucide-react";

/**
 * IMPROVED FEEDBACK DISPLAY
 *
 * Features:
 * - Large, legible text
 * - Clear color coding
 * - Progress bars
 * - Personalized messages
 * - Study tips
 * - Point-by-point breakdown
 */

export default function ImprovedFeedbackDisplay({ attempt, quiz }) {
  const questions = quiz.questions || [];
  const answers = attempt.answers || {};
  const feedback = attempt.detailed_feedback || {};

  // Calculate stats
  const totalMarks = attempt.total_max_marks || 0;
  const marksAwarded = attempt.total_marks_awarded || 0;
  const percentage =
    totalMarks > 0 ? Math.round((marksAwarded / totalMarks) * 100) : 0;

  const passed = percentage >= (quiz.passing_score || 50);

  // Grade categorization
  const getGrade = (pct) => {
    if (pct >= 90)
      return {
        letter: "A",
        color: "text-green-600",
        bg: "bg-green-50",
        label: "Excellent!",
      };
    if (pct >= 80)
      return {
        letter: "A-",
        color: "text-green-600",
        bg: "bg-green-50",
        label: "Very Good!",
      };
    if (pct >= 70)
      return {
        letter: "B",
        color: "text-blue-600",
        bg: "bg-blue-50",
        label: "Good!",
      };
    if (pct >= 60)
      return {
        letter: "C+",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        label: "Fair",
      };
    if (pct >= 50)
      return {
        letter: "C",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        label: "Pass",
      };
    if (pct >= 40)
      return {
        letter: "D",
        color: "text-orange-600",
        bg: "bg-orange-50",
        label: "Below Average",
      };
    return {
      letter: "E",
      color: "text-red-600",
      bg: "bg-red-50",
      label: "Needs Improvement",
    };
  };

  const grade = getGrade(percentage);

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Overall Score Card */}
      <div
        className={`rounded-2xl border-2 p-8 ${passed ? "border-green-500 bg-green-50" : "border-orange-500 bg-orange-50"}`}
      >
        <div className="text-center">
          <div className="mb-4">
            {passed ? (
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto" />
            ) : (
              <AlertCircle className="w-20 h-20 text-orange-600 mx-auto" />
            )}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {percentage}%
          </h1>

          <div
            className={`inline-block px-6 py-2 rounded-full ${grade.bg} mb-4`}
          >
            <span className={`text-2xl font-bold ${grade.color}`}>
              Grade {grade.letter}
            </span>
          </div>

          <p className="text-xl text-gray-700 mb-2">{grade.label}</p>

          <p className="text-lg text-gray-600">
            You scored{" "}
            <span className="font-bold text-gray-900">{marksAwarded}</span> out
            of <span className="font-bold text-gray-900">{totalMarks}</span>{" "}
            marks
          </p>

          {!passed && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-orange-300">
              <p className="text-sm text-orange-900">
                Pass mark: {quiz.passing_score}% (
                {Math.ceil(totalMarks * (quiz.passing_score / 100))} marks)
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                passed ? "bg-green-600" : "bg-orange-600"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question-by-Question Feedback */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Book className="w-6 h-6" />
          Question-by-Question Breakdown
        </h2>

        {questions.map((question, idx) => {
          const questionFeedback = feedback[question.id] || {};
          const studentAnswer = answers[question.id];
          const marksEarned = questionFeedback.marks_awarded || 0;
          const maxMarks = question.max_marks || 1;
          const isCorrect = marksEarned === maxMarks;
          const isPartial = marksEarned > 0 && marksEarned < maxMarks;

          return (
            <div
              key={question.id}
              className={`rounded-xl border-2 p-6 ${
                isCorrect
                  ? "border-green-300 bg-green-50"
                  : isPartial
                    ? "border-yellow-300 bg-yellow-50"
                    : "border-red-300 bg-red-50"
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    isCorrect
                      ? "bg-green-600"
                      : isPartial
                        ? "bg-yellow-600"
                        : "bg-red-600"
                  }`}
                >
                  {idx + 1}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        isCorrect
                          ? "bg-green-200 text-green-900"
                          : isPartial
                            ? "bg-yellow-200 text-yellow-900"
                            : "bg-red-200 text-red-900"
                      }`}
                    >
                      {marksEarned}/{maxMarks} marks
                    </span>

                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border">
                      {question.question_type.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-lg font-medium text-gray-900 leading-relaxed">
                    {question.question_text}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {isCorrect ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : isPartial ? (
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600" />
                  )}
                </div>
              </div>

              {/* Student Answer */}
              <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Your Answer:
                </p>
                <p className="text-base text-gray-900 leading-relaxed">
                  {studentAnswer || (
                    <span className="italic text-gray-400">
                      No answer provided
                    </span>
                  )}
                </p>
              </div>

              {/* AI Feedback */}
              {questionFeedback.feedback && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    Feedback:
                  </p>
                  <p className="text-base text-gray-700 leading-relaxed">
                    {questionFeedback.feedback}
                  </p>
                </div>
              )}

              {/* Personalized Message */}
              {questionFeedback.personalized_message && (
                <div
                  className={`p-4 rounded-lg border-2 mb-4 ${
                    isCorrect
                      ? "bg-green-100 border-green-300"
                      : "bg-blue-100 border-blue-300"
                  }`}
                >
                  <p className="text-base font-medium text-gray-900 leading-relaxed">
                    💬 {questionFeedback.personalized_message}
                  </p>
                </div>
              )}

              {/* Points Breakdown */}
              {(questionFeedback.points_earned?.length > 0 ||
                questionFeedback.points_missed?.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {questionFeedback.points_earned?.length > 0 && (
                    <div className="p-4 bg-green-100 rounded-lg border border-green-300">
                      <p className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Points You Got Right:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {questionFeedback.points_earned.map((point, i) => (
                          <li key={i} className="text-sm text-green-800">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {questionFeedback.points_missed?.length > 0 && (
                    <div className="p-4 bg-red-100 rounded-lg border border-red-300">
                      <p className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Points You Missed:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {questionFeedback.points_missed.map((point, i) => (
                          <li key={i} className="text-sm text-red-800">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Study Tip */}
              {questionFeedback.study_tip && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-300">
                  <p className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Study Tip:
                  </p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {questionFeedback.study_tip}
                  </p>
                </div>
              )}

              {/* Model Answer (for incorrect answers) */}
              {!isCorrect && question.correct_answer && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    Model Answer:
                  </p>
                  <p className="text-base text-gray-900 leading-relaxed">
                    {question.correct_answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Recommendations */}
      <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Your Next Steps
        </h2>

        <div className="space-y-3">
          {percentage >= 80 ? (
            <>
              <p className="text-lg text-gray-800 leading-relaxed">
                🎉 <strong>Excellent work!</strong> You have a strong
                understanding of this strand.
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                To maintain your performance:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-gray-700 ml-4">
                <li>Review the questions you missed to achieve perfection</li>
                <li>Try more challenging strands to expand your knowledge</li>
                <li>Help others by explaining concepts you understand well</li>
              </ul>
            </>
          ) : percentage >= 60 ? (
            <>
              <p className="text-lg text-gray-800 leading-relaxed">
                👍 <strong>Good effort!</strong> You're on the right track.
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                To improve further:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-gray-700 ml-4">
                <li>Review the feedback on questions you missed</li>
                <li>Practice similar questions on these strands</li>
                <li>Ask your teacher about concepts you find challenging</li>
              </ul>
            </>
          ) : (
            <>
              <p className="text-lg text-gray-800 leading-relaxed">
                💪 <strong>Keep going!</strong> Everyone learns at their own
                pace.
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                Recommended actions:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base text-gray-700 ml-4">
                <li>
                  Carefully review all the feedback and model answers above
                </li>
                <li>
                  Re-read your notes on {quiz.subject?.name || "this strand"}
                </li>
                <li>Practice with easier questions first, then progress</li>
                <li>Don't hesitate to ask your teacher for help</li>
                <li>Try the quiz again after studying</li>
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
        >
          Print Results
        </button>

        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>

        {percentage < 80 && (
          <button
            onClick={() => (window.location.href = `/quiz/${quiz.id}`)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
