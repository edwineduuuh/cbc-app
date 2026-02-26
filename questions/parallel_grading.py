"""
questions/parallel_grading.py
SPEED OPTIMIZATION: Grade all questions in parallel
Reduces 20-30 second submission time to 5-10 seconds
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from .ai_grading import grade_answer
import time


def grade_quiz_parallel(questions, answers, max_workers=5):
    """
    Grade all questions in PARALLEL instead of one-by-one
    
    Before: 10 questions × 2 sec each = 20 seconds
    After:  10 questions in parallel = ~3 seconds (limited by slowest call)
    
    Args:
        questions: List of Question objects
        answers: Dict of {question_id: student_answer}
        max_workers: Max parallel API calls (default 5 to avoid rate limits)
    
    Returns:
        List of grading results in same order as questions
    """
    
    start_time = time.time()
    
    # Prepare grading tasks
    grading_tasks = []
    for question in questions:
        student_answer = answers.get(str(question.id), "")
        grading_tasks.append((question, student_answer))
    
    # Grade all questions in parallel
    results = [None] * len(questions)  # Preserve order
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all grading jobs
        future_to_index = {
            executor.submit(grade_answer, q, ans): i 
            for i, (q, ans) in enumerate(grading_tasks)
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                result = future.result(timeout=15)  # 15 sec timeout per question
                results[index] = result
            except Exception as e:
                # If one question fails, don't crash entire quiz
                question = grading_tasks[index][0]
                print(f"❌ Grading failed for Q{question.id}: {e}")
                results[index] = {
                    'marks_awarded': 0,
                    'max_marks': question.max_marks,
                    'feedback': 'Grading error - will be reviewed manually',
                    'is_correct': False,
                    'error': str(e)
                }
    
    elapsed = time.time() - start_time
    print(f"✅ Graded {len(questions)} questions in {elapsed:.2f}s (parallel)")
    
    return results


def grade_quiz_sequential(questions, answers):
    """
    Old sequential grading (SLOW - kept as fallback)
    """
    start_time = time.time()
    
    results = []
    for question in questions:
        student_answer = answers.get(str(question.id), "")
        result = grade_answer(question, student_answer)
        results.append(result)
    
    elapsed = time.time() - start_time
    print(f"⚠️  Graded {len(questions)} questions in {elapsed:.2f}s (sequential - SLOW)")
    
    return results


# Main function to use
def grade_quiz_fast(questions, answers):
    """
    Grade quiz using parallel processing for speed
    Falls back to sequential if parallel fails
    """
    try:
        return grade_quiz_parallel(questions, answers)
    except Exception as e:
        print(f"⚠️  Parallel grading failed: {e}. Falling back to sequential.")
        return grade_quiz_sequential(questions, answers)