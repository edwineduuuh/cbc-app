// "use client";

// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   CheckCircle,
//   XCircle,
//   Lightbulb,
//   MapPin,
//   Brain,
//   BookOpen,
//   ArrowRight,
//   Sparkles,
//   GraduationCap,
//   TrendingUp,
// } from "lucide-react";

// export default function PremiumMCQExplanation({
//   question,
//   feedback,
//   isCorrect,
//   onClose,
//   onNext,
// }) {
//   const [showDeepDive, setShowDeepDive] = useState(false);

//   // Extract premium data if available
//   const premiumData = feedback.premium_data || {};

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       exit={{ opacity: 0, y: -20 }}
//       className="rounded-2xl border-2 overflow-hidden shadow-xl"
//       style={{
//         borderColor: isCorrect ? "#22c55e" : "#ef4444",
//         background: "white",
//       }}
//     >
//       {/* Header */}
//       <div
//         className={`p-6 ${isCorrect ? "bg-green-50" : "bg-red-50"} border-b-2`}
//         style={{ borderColor: isCorrect ? "#22c55e" : "#ef4444" }}
//       >
//         <div className="flex items-start gap-4">
//           <div
//             className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
//               isCorrect ? "bg-green-500" : "bg-red-500"
//             }`}
//           >
//             {isCorrect ? (
//               <CheckCircle className="w-6 h-6 text-white" />
//             ) : (
//               <XCircle className="w-6 h-6 text-white" />
//             )}
//           </div>

//           <div className="flex-1">
//             <h3 className="text-xl font-bold text-gray-900 mb-2">
//               {isCorrect ? "✓ Perfect!" : "✗ Let's Learn From This"}
//             </h3>
//             <p className="text-gray-700 leading-relaxed">{feedback.feedback}</p>
//           </div>
//         </div>
//       </div>

//       {/* Premium Content */}
//       <div className="p-6 space-y-4">
//         {/* Personalized Message */}
//         <div
//           className={`p-4 rounded-xl ${
//             isCorrect ? "bg-blue-50" : "bg-amber-50"
//           }`}
//         >
//           <div className="flex items-start gap-3">
//             <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
//             <p className="text-gray-800 font-medium">
//               {feedback.personalized_message}
//             </p>
//           </div>
//         </div>

//         {/* Premium Data Sections */}
//         {premiumData.kenyan_example && (
//           <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
//             <div className="flex items-start gap-3">
//               <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
//               <div>
//                 <p className="text-sm font-bold text-green-800 mb-1">
//                   🇰🇪 Kenyan Connection
//                 </p>
//                 <p className="text-sm text-green-900">
//                   {premiumData.kenyan_example}
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}

//         {premiumData.misconception_diagnosis && (
//           <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
//             <div className="flex items-start gap-3">
//               <Brain className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
//               <div>
//                 <p className="text-sm font-bold text-purple-800 mb-1">
//                   🔍 Why This Mistake Happens
//                 </p>
//                 <p className="text-sm text-purple-900">
//                   {premiumData.misconception_diagnosis}
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}

//         {premiumData.memory_trick && (
//           <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
//             <div className="flex items-start gap-3">
//               <Lightbulb className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
//               <div>
//                 <p className="text-sm font-bold text-indigo-800 mb-1">
//                   🧠 Memory Trick
//                 </p>
//                 <p className="text-sm text-indigo-900">
//                   {premiumData.memory_trick}
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Deep Dive Toggle */}
//         {premiumData.deepening_challenge && (
//           <div>
//             <button
//               onClick={() => setShowDeepDive(!showDeepDive)}
//               className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
//             >
//               <TrendingUp className="w-4 h-4" />
//               {showDeepDive ? "Hide" : "Show"} Deep Dive Challenge
//             </button>

//             <AnimatePresence>
//               {showDeepDive && (
//                 <motion.div
//                   initial={{ opacity: 0, height: 0 }}
//                   animate={{ opacity: 1, height: "auto" }}
//                   exit={{ opacity: 0, height: 0 }}
//                   className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
//                 >
//                   <p className="text-sm font-bold text-gray-800 mb-2">
//                     💡 Challenge Yourself
//                   </p>
//                   <p className="text-sm text-gray-700">
//                     {premiumData.deepening_challenge}
//                   </p>
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>
//         )}

//         {/* CBC Connection */}
//         {premiumData.cbc_connection && (
//           <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
//             <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 mb-1">
//               <GraduationCap className="w-4 h-4" />
//               CBC Learning Outcome
//             </div>
//             <p className="text-xs text-blue-900">
//               {premiumData.cbc_connection}
//             </p>
//           </div>
//         )}

//         {/* Study Tip */}
//         {feedback.study_tip && (
//           <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
//             <div className="flex items-start gap-3">
//               <BookOpen className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
//               <div>
//                 <p className="text-sm font-bold text-amber-800 mb-1">
//                   📚 Study Tip
//                 </p>
//                 <p className="text-sm text-amber-900">{feedback.study_tip}</p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Next Steps */}
//         <div className="flex gap-3 justify-end pt-2">
//           {onNext && (
//             <button
//               onClick={onNext}
//               className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2"
//             >
//               Next Question
//               <ArrowRight className="w-4 h-4" />
//             </button>
//           )}
//         </div>
//       </div>
//     </motion.div>
//   );
// }
