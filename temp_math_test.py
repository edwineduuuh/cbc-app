import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from questions.models import Question
import questions.ai_grading as ag
q = Question.objects.get(id=909)
print('qtype', q.question_type)
# monkey patch to avoid actual API call
ag._grade_with_ai = lambda question, student_answer, working_image=None: {'marker': student_answer, 'has_image': bool(working_image)}
res = ag._grade_math(q, '', working_image='dummybase64')
print(res)
