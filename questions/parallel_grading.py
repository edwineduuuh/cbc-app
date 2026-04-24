"""
questions/parallel_grading.py
SPEED OPTIMIZATION: Grade all questions in parallel
Reduces 20-30 second submission time to 5-10 seconds
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from .ai_grading import grade_answer
import time


class _PartProxy:
    """Wraps a QuestionPart to look like a Question for grade_answer."""
    def __init__(self, part, parent_question):
        self.id            = part.id
        self.question_text = part.question_text
        self.question_type = part.question_type or 'structured'
        self.correct_answer = part.correct_answer
        self.max_marks     = part.max_marks
        self.explanation   = part.explanation or ''
        self.topic         = parent_question.topic   # needed for _is_kiswahili
        self.option_a      = getattr(part, 'option_a', '') or ''
        self.option_b      = getattr(part, 'option_b', '') or ''
        self.option_c      = getattr(part, 'option_c', '') or ''
        self.option_d      = getattr(part, 'option_d', '') or ''
        self.table_data    = None
        self.worked_solution = ''
        self.marking_scheme  = getattr(part, 'marking_scheme', None)


def _grade_multipart(question, answer_dict):
    """
    Grade a multipart question by grading each part independently.
    Returns a combined result dict with 'part_results' key.
    """
    parts = list(question.parts.all())
    if not parts:
        return {
            'marks_awarded': 0,
            'max_marks': question.max_marks,
            'is_correct': False,
            'feedback': 'No parts configured for this multipart question.',
            'part_results': [],
            'points_earned': [],
            'points_missed': [],
            'personalized_message': '',
            'study_tip': '',
        }

    if not isinstance(answer_dict, dict):
        answer_dict = {}

    part_results = []
    for part in parts:
        part_answer = str(answer_dict.get(str(part.id), '')).strip()
        proxy = _PartProxy(part, question)
        try:
            result = grade_answer(proxy, part_answer)
        except Exception as e:
            print(f"❌ Part grading failed for part {part.id}: {e}")
            result = {
                'marks_awarded': 0,
                'max_marks': part.max_marks,
                'is_correct': False,
                'feedback': 'Grading error.',
                'points_earned': [],
                'points_missed': [],
                'personalized_message': '',
                'study_tip': '',
            }
        part_results.append({
            'part_id':       part.id,
            'part_label':    part.part_label,
            'question_text': part.question_text,
            'correct_answer': part.correct_answer,
            'student_answer': part_answer,
            'marks_awarded':  result['marks_awarded'],
            'max_marks':      result['max_marks'],
            'is_correct':     result['is_correct'],
            'feedback':       result.get('feedback', ''),
            'study_tip':      result.get('study_tip', ''),
        })

    total_marks = sum(r['marks_awarded'] for r in part_results)
    total_max   = sum(r['max_marks']     for r in part_results)

    return {
        'marks_awarded':       total_marks,
        'max_marks':           total_max,
        'is_correct':          total_marks >= total_max and total_max > 0,
        'feedback':            '',  # per-part feedback lives in part_results
        'part_results':        part_results,
        'points_earned':       [],
        'points_missed':       [],
        'personalized_message': '',
        'study_tip':           '',
    }


def _grade_one(question, student_answer, working_image):
    """Grade a single question, routing multipart to _grade_multipart."""
    if question.question_type == 'multipart':
        return _grade_multipart(question, student_answer)
    return grade_answer(question, student_answer, working_image)


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
            executor.submit(_grade_one, q, ans, working_image): i
            for i, (q, ans, working_image) in enumerate(grading_tasks)
        }

        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                result = future.result(timeout=60)  # multipart needs more time
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
        result = _grade_one(question, student_answer, working_image)
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
