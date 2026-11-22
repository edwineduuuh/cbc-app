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
