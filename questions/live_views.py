"""
questions/live_views.py
Live group lessons — fixed daily Zoom windows.

Admin sets availability (date range + which windows are open + price). Students
pick a date + window on a calendar, choose subject/strand, and request. Any
number of students may join a session (group Zoom). Admin approves (or
reschedules by editing the date/window) → student pays via IntaSend STK push →
the shared M-Pesa webhook confirms and reveals the Zoom link.
"""
import logging
from datetime import date as _date, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import (
    LiveBooking, LiveAvailability, live_availability_for,
    LIVE_WINDOW_LABEL, LIVE_WINDOW_HOUR, LIVE_SESSION_PRICE,
)
from .intasend_api import IntaSendAPI

mpesa_logger = logging.getLogger("mpesa")
EAT = ZoneInfo("Africa/Nairobi")
HORIZON_DAYS = 60


def _booking_json(b):
    return {
        "id": b.id,
        "status": b.status,
        "status_label": b.get_status_display(),
        "amount_kes": b.amount_kes,
        "learning_area": b.learning_area or "General",
        "strand": b.strand or "",
        "note": b.note,
        "session_date": b.session_date.isoformat(),
        "window_key": b.window_key,
        "window_label": b.window_label,
        "phone": b.phone,
        "zoom_link": b.zoom_link if b.status == "confirmed" else "",
        "rejection_reason": b.rejection_reason,
        "created_at": b.created_at.isoformat(),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def live_availability(request):
    """Upcoming open group sessions for the next HORIZON_DAYS, from the admin's
    availability rules. Today's already-started windows are skipped."""
    now_eat = timezone.now().astimezone(EAT)
    today = now_eat.date()
    horizon = today + timedelta(days=HORIZON_DAYS)

    sessions = []
    cur = today
    while cur <= horizon:
        rule = live_availability_for(cur)
        if rule:
            for key in rule.open_window_keys():
                if cur == today and LIVE_WINDOW_HOUR.get(key, 0) <= now_eat.hour:
                    continue  # window already started/passed today
                sessions.append({
                    "date": cur.isoformat(),
                    "window_key": key,
                    "window_label": LIVE_WINDOW_LABEL[key],
                    "price_kes": rule.price_kes,
                })
        cur += timedelta(days=1)

    return Response({"sessions": sessions, "default_price": LIVE_SESSION_PRICE})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_live_bookings(request):
    bookings = request.user.live_bookings.all()
    return Response({"bookings": [_booking_json(b) for b in bookings]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_live_booking(request):
    """Request a session.
    Body: { session_date (YYYY-MM-DD), window_key, learning_area, strand, note, phone }."""
    raw_date = request.data.get("session_date")
    window_key = (request.data.get("window_key") or "").strip()
    phone = (request.data.get("phone") or "").strip()
    note = (request.data.get("note") or "").strip()
    learning_area = (request.data.get("learning_area") or "").strip() or "General"
    strand = (request.data.get("strand") or "").strip()

    if not raw_date or not window_key or not phone:
        return Response({"error": "session_date, window_key and phone are required"},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        session_date = _date.fromisoformat(raw_date)
    except ValueError:
        return Response({"error": "Invalid date"}, status=status.HTTP_400_BAD_REQUEST)

    today = timezone.now().astimezone(EAT).date()
    if session_date < today:
        return Response({"error": "That date has passed."}, status=status.HTTP_400_BAD_REQUEST)

    rule = live_availability_for(session_date)
    if not rule or window_key not in rule.open_window_keys():
        return Response({"error": "That session isn't available. Please pick another."},
                        status=status.HTTP_409_CONFLICT)

    booking = LiveBooking.objects.create(
        student=request.user,
        session_date=session_date,
        window_key=window_key,
        learning_area=learning_area,
        strand=strand,
        note=note,
        phone=phone,
        amount_kes=rule.price_kes,
        status="requested",
    )
    return Response({"booking": _booking_json(booking)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pay_live_booking(request, booking_id):
    """Trigger an IntaSend STK push for an APPROVED booking."""
    try:
        booking = LiveBooking.objects.get(pk=booking_id, student=request.user)
    except LiveBooking.DoesNotExist:
        return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

    if booking.status not in ("approved", "payment_submitted"):
        return Response(
            {"error": "This booking isn't ready for payment yet. "
                      "You'll be able to pay once it's approved."},
            status=status.HTTP_409_CONFLICT,
        )

    raw_phone = (request.data.get("phone") or booking.phone or "").strip()
    phone_number, phone_err = IntaSendAPI.normalize_phone(raw_phone)
    if phone_err:
        return Response({"error": phone_err}, status=status.HTTP_400_BAD_REQUEST)

    api_ref = f"StadiSpace-live-{booking.id}-{int(timezone.now().timestamp())}"
    result = IntaSendAPI().stk_push(
        phone_number=phone_number,
        amount=booking.amount_kes,
        api_ref=api_ref,
        name=request.user.get_full_name() or request.user.username,
        email=request.user.email or "",
    )

    if not result.get("success"):
        mpesa_logger.warning("Live booking STK push failed: %s", result)
        return Response({"error": result.get("error", "Failed to start payment")},
                        status=status.HTTP_400_BAD_REQUEST)

    booking.checkout_request_id = result["invoice_id"]
    booking.phone = phone_number
    booking.status = "payment_submitted"
    booking.save(update_fields=["checkout_request_id", "phone", "status", "updated_at"])
    mpesa_logger.info(
        "Live booking STK push: booking=%s amount=%s invoice_id=%s",
        booking.id, booking.amount_kes, result["invoice_id"],
    )
    return Response({
        "success": True,
        "message": "STK Push sent. Enter your M-Pesa PIN to confirm.",
        "booking": _booking_json(booking),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_live_booking(request, booking_id):
    try:
        booking = LiveBooking.objects.get(pk=booking_id, student=request.user)
    except LiveBooking.DoesNotExist:
        return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
    if booking.status == "confirmed":
        return Response({"error": "This lesson is already confirmed — contact support to change it."},
                        status=status.HTTP_409_CONFLICT)
    booking.status = "cancelled"
    booking.save(update_fields=["status", "updated_at"])
    return Response({"booking": _booking_json(booking)})


def confirm_booking_from_callback(invoice_id, state, payment_reference):
    """Called by the shared IntaSend webhook when an invoice_id isn't a
    subscription PaymentRequest. Returns True if it matched a live booking."""
    try:
        booking = (
            LiveBooking.objects.select_for_update()
            .get(checkout_request_id=invoice_id)
        )
    except LiveBooking.DoesNotExist:
        return False

    if booking.status == "confirmed":
        return True  # idempotent
    if state in ("COMPLETE", "CLEARING"):
        booking.status = "confirmed"
        booking.mpesa_code = payment_reference or "INTASEND_CONFIRMED"
        booking.confirmed_at = timezone.now()
        booking.save(update_fields=["status", "mpesa_code", "confirmed_at", "updated_at"])
        mpesa_logger.info("Live booking %s confirmed via IntaSend callback", booking.id)
    return True
