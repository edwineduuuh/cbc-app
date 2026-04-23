import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger('emails')


def send_payment_receipt_email(user, plan_name, amount, mpesa_code, days):
    """Send payment receipt email to user (and parent if available)."""
    if not settings.ANYMAIL.get('RESEND_API_KEY'):
        logger.info("Resend API key not configured, skipping email")
        return False

    recipients = []
    if user.email:
        recipients.append(user.email)
    if getattr(user, 'parent_email', None):
        recipients.append(user.parent_email)

    if not recipients:
        logger.info("No email recipients for user %s", user.username)
        return False

    parent_name = getattr(user, 'parent_name', '') or 'Parent'
    subject = f"StadiSpace Payment Confirmed — {plan_name} Plan"
    message = (
        f"Hi {parent_name},\n\n"
        f"Payment of KES {amount} for {user.first_name or user.username}'s "
        f"StadiSpace {plan_name} plan has been confirmed.\n\n"
        f"M-Pesa Reference: {mpesa_code}\n"
        f"Plan: {plan_name}\n"
        f"Duration: {days} days\n"
        f"Student: {user.first_name} {user.last_name}\n\n"
        f"Your child now has unlimited access to all quizzes, AI-powered "
        f"marking, and detailed performance analytics.\n\n"
        f"Track their progress at https://stadispace.co.ke/dashboard\n\n"
        f"Thank you for investing in your child's education!\n"
        f"— The StadiSpace Team"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@stadispace.co.ke',
            recipient_list=recipients,
            fail_silently=False,
        )
        logger.info("Payment receipt email sent to %s", recipients)
        return True
    except Exception as e:
        logger.error("Failed to send payment receipt email: %s", e)
        return False


def send_welcome_email(user):
    """Send welcome email after registration."""
    if not settings.ANYMAIL.get('RESEND_API_KEY'):
        logger.info("Resend API key not configured, skipping email")
        return False

    parent_email = getattr(user, 'parent_email', None)
    parent_name = getattr(user, 'parent_name', '') or ''
    child_name = user.first_name or user.username

    if parent_email:
        # Email goes to parent — greet parent
        recipient = parent_email
        greeting = f"Hi {parent_name or 'there'},"
        subject = f"Welcome to StadiSpace — {child_name}'s learning journey starts now!"
        intro = f"Welcome to StadiSpace! {child_name}'s account is ready with 2 free quizzes to explore."
        body_name = child_name
    elif user.email:
        # No parent email — email goes to student, greet student
        recipient = user.email
        greeting = f"Hi {child_name},"
        subject = "Welcome to StadiSpace — your learning journey starts now!"
        intro = "Your StadiSpace account is ready with 2 free quizzes to explore."
        body_name = "You"
    else:
        return False

    message = (
        f"{greeting}\n\n"
        f"{intro}\n\n"
        f"What {body_name} get{'s' if body_name != 'You' else ''}:\n"
        f"  - 2 free quizzes with full AI-powered feedback\n"
        f"  - All CBE learning areas, Grades 4–10\n"
        f"  - Instant marking with detailed explanations\n"
        f"  - Progress tracking and performance analytics\n\n"
        f"Start learning: https://stadispace.co.ke/explore\n\n"
        f"When ready for unlimited access, subscribe from KES 149/week "
        f"via M-Pesa.\n\n"
        f"— The StadiSpace Team"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@stadispace.co.ke',
            recipient_list=[recipient],
            fail_silently=False,
        )
        logger.info("Welcome email sent to %s", recipient)
        return True
    except Exception as e:
        logger.error("Failed to send welcome email: %s", e)
        return False
