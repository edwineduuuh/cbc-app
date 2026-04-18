from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Count, Avg, Sum, Q
from django.db.models.functions import ExtractHour, TruncDate, TruncMonth
from django.utils import timezone
from datetime import timedelta, datetime
import calendar

from .models import Attempt, Quiz, Subscription, PaymentRequest
from .permissions import IsAdminUser

User = get_user_model()


class AdminUserStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        today = now.date()

        users = User.objects.all()
        students = users.filter(role='student')

        role_breakdown = {
            r['role']: r['count']
            for r in users.values('role').annotate(count=Count('id'))
        }

        grade_breakdown = list(
            students.exclude(grade=None)
            .values('grade')
            .annotate(count=Count('id'))
            .order_by('grade')
        )

        active_sub_user_ids = set(
            Subscription.objects.filter(is_active=True, end_date__gte=now)
            .values_list('user_id', flat=True)
        )

        recent_signups = list(
            users.order_by('-date_joined')[:10].values(
                'id', 'username', 'email', 'role', 'grade', 'date_joined', 'quiz_credits'
            )
        )
        for u in recent_signups:
            u['has_subscription'] = u['id'] in active_sub_user_ids
            if u['date_joined']:
                u['date_joined'] = u['date_joined'].isoformat()

        return Response({
            'total': users.count(),
            'by_role': role_breakdown,
            'by_grade': grade_breakdown,
            'subscribed': len(active_sub_user_ids),
            'free_trial_active': students.filter(quiz_credits__gt=0).count(),
            'new_this_week': users.filter(date_joined__gte=week_ago).count(),
            'new_this_month': users.filter(date_joined__gte=month_ago).count(),
            'active_today': students.filter(last_activity_date=today).count(),
            'active_this_week': students.filter(last_activity_date__gte=week_ago.date()).count(),
            'recent_signups': recent_signups,
        })


class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        role = request.query_params.get('role', '')
        grade = request.query_params.get('grade', '')
        search = request.query_params.get('search', '')

        qs = User.objects.all()
        if role:
            qs = qs.filter(role=role)
        if grade:
            qs = qs.filter(grade=grade)
        if search:
            qs = qs.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )

        total = qs.count()

        active_sub_ids = set(
            Subscription.objects.filter(is_active=True, end_date__gte=now)
            .values_list('user_id', flat=True)
        )

        results = []
        for u in qs.order_by('-date_joined')[:100]:
            results.append({
                'id': u.id,
                'username': u.username,
                'email': u.email or '',
                'role': u.role,
                'grade': u.grade,
                'date_joined': u.date_joined.isoformat() if u.date_joined else None,
                'last_login': u.last_login.isoformat() if u.last_login else None,
                'has_subscription': u.id in active_sub_ids,
                'quiz_credits': u.quiz_credits,
                'total_quizzes_taken': u.total_quizzes_taken,
                'current_streak': u.current_streak,
            })

        return Response({'count': total, 'results': results})


class AdminRevenueStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()

        # Month boundaries
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_end = month_start - timedelta(seconds=1)
        prev_month_start = prev_month_end.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )

        verified = PaymentRequest.objects.filter(status='verified')

        total_revenue = verified.aggregate(t=Sum('amount_paid'))['t'] or 0
        this_month = verified.filter(verified_at__gte=month_start).aggregate(
            t=Sum('amount_paid'))['t'] or 0
        last_month = verified.filter(
            verified_at__gte=prev_month_start, verified_at__lt=month_start
        ).aggregate(t=Sum('amount_paid'))['t'] or 0

        by_plan = list(
            verified.values('plan__name')
            .annotate(count=Count('id'), revenue=Sum('amount_paid'))
            .order_by('-revenue')
        )

        # Monthly trend — last 6 months
        monthly_trend = []
        for i in range(5, -1, -1):
            m = now.month - i
            y = now.year
            while m <= 0:
                m += 12
                y -= 1
            _, last_day = calendar.monthrange(y, m)
            m_start = timezone.make_aware(datetime(y, m, 1))
            m_end = timezone.make_aware(datetime(y, m, last_day, 23, 59, 59))
            rev = verified.filter(
                verified_at__gte=m_start, verified_at__lte=m_end
            ).aggregate(t=Sum('amount_paid'))['t'] or 0
            count = verified.filter(
                verified_at__gte=m_start, verified_at__lte=m_end
            ).count()
            monthly_trend.append({
                'month': f"{y}-{m:02d}",
                'label': datetime(y, m, 1).strftime('%b'),
                'revenue': rev,
                'new_subs': count,
            })

        active_subs = Subscription.objects.filter(
            is_active=True, end_date__gte=now
        ).count()
        pending = PaymentRequest.objects.filter(status='pending').count()

        recent_payments = list(
            PaymentRequest.objects.order_by('-submitted_at')[:10].values(
                'id', 'user__username', 'plan__name', 'amount_paid',
                'status', 'submitted_at', 'mpesa_code', 'phone_number'
            )
        )
        for p in recent_payments:
            if p['submitted_at']:
                p['submitted_at'] = p['submitted_at'].isoformat()

        return Response({
            'total_revenue': total_revenue,
            'this_month': this_month,
            'last_month': last_month,
            'active_subscriptions': active_subs,
            'pending_payments': pending,
            'by_plan': by_plan,
            'monthly_trend': monthly_trend,
            'recent_payments': recent_payments,
        })


class AdminQuizPerformanceView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_attempts = Attempt.objects.count()
        completed = Attempt.objects.filter(status='completed')
        completed_count = completed.count()
        avg_score = completed.aggregate(avg=Avg('score'))['avg'] or 0
        completion_rate = round(completed_count / total_attempts * 100, 1) if total_attempts else 0

        # Most attempted quizzes
        quiz_data = list(
            Attempt.objects.values(
                'quiz__id', 'quiz__title', 'quiz__grade', 'quiz__subject__name'
            )
            .annotate(
                total=Count('id'),
                completed_count=Count('id', filter=Q(status='completed')),
                avg_score=Avg('score', filter=Q(status='completed')),
            )
            .order_by('-total')[:10]
        )
        for q in quiz_data:
            q['completion_rate'] = round(
                q['completed_count'] / q['total'] * 100, 1
            ) if q['total'] else 0
            q['avg_score'] = round(q['avg_score'] or 0, 1)

        # By subject
        by_subject = list(
            completed.values('quiz__subject__name')
            .annotate(attempts=Count('id'), avg_score=Avg('score'))
            .order_by('-attempts')
        )
        for s in by_subject:
            s['avg_score'] = round(s['avg_score'] or 0, 1)

        # By grade
        by_grade = list(
            completed.values('quiz__grade')
            .annotate(attempts=Count('id'), avg_score=Avg('score'))
            .order_by('quiz__grade')
        )
        for g in by_grade:
            g['avg_score'] = round(g['avg_score'] or 0, 1)

        return Response({
            'total_attempts': total_attempts,
            'completed_attempts': completed_count,
            'completion_rate': completion_rate,
            'avg_score': round(avg_score, 1),
            'most_attempted': quiz_data,
            'by_subject': by_subject,
            'by_grade': by_grade,
        })


class AdminEngagementView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        two_weeks_ago = now - timedelta(days=13)

        students = User.objects.filter(role='student')

        # DAU — last 14 days (fill zeros for missing days)
        raw_dau = {
            str(row['date']): row['count']
            for row in students
            .filter(last_activity_date__gte=two_weeks_ago.date())
            .values('last_activity_date')
            .annotate(date=TruncDate('last_activity_date'), count=Count('id'))
            .values('date', 'count')
        }
        dau = []
        for i in range(13, -1, -1):
            d = str((now - timedelta(days=i)).date())
            dau.append({'date': d, 'count': raw_dau.get(d, 0)})

        # Signups trend — last 14 days
        raw_signups = {
            str(row['date']): row['count']
            for row in User.objects
            .filter(date_joined__gte=two_weeks_ago)
            .annotate(date=TruncDate('date_joined'))
            .values('date')
            .annotate(count=Count('id'))
        }
        signups_trend = []
        for i in range(13, -1, -1):
            d = str((now - timedelta(days=i)).date())
            signups_trend.append({'date': d, 'count': raw_signups.get(d, 0)})

        wau = students.filter(last_activity_date__gte=week_ago.date()).count()
        mau = students.filter(last_activity_date__gte=month_ago.date()).count()
        total_students = students.count()

        # Trial → paid conversion
        ever_had_trial = students.filter(
            Q(has_used_trial=True) | Q(quiz_credits__lt=2)
        ).count()
        paid = Subscription.objects.filter(
            is_active=True, user__role='student'
        ).values('user').distinct().count()
        trial_to_paid = round(paid / ever_had_trial * 100, 1) if ever_had_trial else 0

        # Peak hours
        peak_hours_raw = list(
            Attempt.objects
            .annotate(hour=ExtractHour('started_at'))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('hour')
        )
        # Fill all 24 hours
        hour_map = {row['hour']: row['count'] for row in peak_hours_raw}
        peak_hours = [{'hour': h, 'count': hour_map.get(h, 0)} for h in range(24)]

        return Response({
            'dau': dau,
            'wau': wau,
            'mau': mau,
            'total_students': total_students,
            'trial_to_paid_rate': trial_to_paid,
            'paid_subscribers': paid,
            'peak_hours': peak_hours,
            'signups_trend': signups_trend,
        })
