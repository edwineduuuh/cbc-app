"""
questions/parallel_grading.py
SPEED OPTIMIZATION: Grade all questions in parallel
Reduces 20-30 second submission time to 5-10 seconds
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from .ai_grading import grade_answer
import time


def grade_quiz_parallel(questions, answers, max_workers=5, working_images=None):
    working_images = working_images or {}
    print(f"🖼 Working images received: {list(working_images.keys())}")
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
    for i, question in enumerate(questions):
        student_answer = answers.get(str(question.id), "")
        working_image = working_images.get(str(question.id)) or working_images.get(str(i))
        grading_tasks.append((question, student_answer, working_image))
    
    # Grade all questions in parallel
    results = [None] * len(questions)  # Preserve order
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_index = {
            executor.submit(grade_answer, q, ans, working_image): i
            for i, (q, ans, working_image) in enumerate(grading_tasks)
        }

        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                result = future.result(timeout=15)
                results[index] = result
            except Exception as e:
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


def grade_quiz_sequential(questions, answers, working_images=None):
    working_images = working_images or {}
    start_time = time.time()
    results = []
    for i, question in enumerate(questions):
        student_answer = answers.get(str(question.id), "")
        working_image = working_images.get(str(question.id)) or working_images.get(str(i))
        result = grade_answer(question, student_answer, working_image)
        results.append(result)
    
    elapsed = time.time() - start_time
    print(f"⚠️  Graded {len(questions)} questions in {elapsed:.2f}s (sequential - SLOW)")
    
    return results


# Main function to use
def grade_quiz_fast(questions, answers, working_images=None):
    try:
        return grade_quiz_parallel(questions, answers, working_images=working_images)
    except Exception as e:
        print(f"⚠️  Parallel grading failed: {e}. Falling back to sequential.")
        return grade_quiz_sequential(questions, answers, working_images=working_images)