"""Unfinished-quiz drafts: GET / PUT / DELETE /api/quizzes/<id>/draft/."""
import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Quiz, QuizDraft

MAX_DRAFT_BYTES = 256 * 1024   # answers + feedback text; photos are never sent


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def quiz_draft(request, quiz_id):
    if request.method == 'GET':
        d = QuizDraft.objects.filter(user=request.user, quiz_id=quiz_id).first()
        return Response({'draft': d.data if d else None,
                         'updated_at': d.updated_at.isoformat() if d else None})

    if request.method == 'DELETE':
        QuizDraft.objects.filter(user=request.user, quiz_id=quiz_id).delete()
        return Response(status=204)

    data = request.data.get('draft')
    if not isinstance(data, dict):
        return Response({'error': 'draft must be an object'}, status=400)
    if len(json.dumps(data, ensure_ascii=False).encode()) > MAX_DRAFT_BYTES:
        return Response({'error': 'draft too large'}, status=413)
    if not Quiz.objects.filter(pk=quiz_id).exists():
        return Response({'error': 'Quiz not found'}, status=404)
    QuizDraft.objects.update_or_create(user=request.user, quiz_id=quiz_id, defaults={'data': data})
    return Response(status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_quiz_drafts(request):
    """GET /api/quizzes/drafts/ - the learner's unfinished quizzes, for the
    "Continue" badges on quiz lists. Drafts older than 30 days are ignored
    (the quiz page ignores them too)."""
    from datetime import timedelta
    from django.utils import timezone

    since = timezone.now() - timedelta(days=30)
    out = []
    for d in QuizDraft.objects.filter(user=request.user, updated_at__gte=since).only('quiz_id', 'data', 'updated_at'):
        data = d.data or {}
        answered = len(data.get('answers') or {})
        if not answered:
            continue
        out.append({
            'quiz_id': d.quiz_id,
            'answered': answered,
            'total': len(data.get('qids') or []),
            'current': int(data.get('currentIdx') or 0) + 1,
            'updated_at': d.updated_at.isoformat(),
        })
    return Response(out)
