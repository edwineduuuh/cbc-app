"""
questions/live_views.py
Live-lesson booking — 1:1 Zoom tuition on admin-published slots.

Flow: student browses OPEN slots → requests one → admin approves (Django admin)
→ student pays KES via IntaSend STK push → shared M-Pesa webhook confirms the
booking → student sees the Zoom link. Kept separate from the subscription
payment path; the webhook only *matches* a booking by its IntaSend invoice id.
"""
import logging

from django.utils import timezone
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import (
    LiveSlot, LiveBooking, LIVE_ACTIVE_STATES, LIVE_PRICING, live_price,
)
from .intasend_api import IntaSendAPI

mpesa_logger = logging.getLogger("mpesa")


def _slot_json(slot):
    # Generic time slot — students choose their own subject/strand at booking.
    return {
        "id": slot.id,
        "starts_at": slot.starts_at.isoformat(),
        "max_duration_minutes": slot.max_duration_minutes,
        "grade": slot.grade,
        "notes": slot.notes,
    }


def _booking_json(b):
    return {
        "id": b.id,
        "status": b.status,
        "status_label": b.get_status_display(),
        "amount_kes": b.amount_kes,
        "duration_minutes": b.duration_minutes,
        "learning_area": b.learning_area or "General",
        "strand": b.strand or "",
        "phone": b.phone,
        "note": b.note,
        "when": b.when.isoformat(),  # effective (possibly rescheduled) time
        # Zoom link only revealed once the lesson is paid & confirmed.
        "zoom_link": b.zoom_link if b.status == "confirmed" else "",
        "rejection_reason": b.rejection_reason,
        "created_at": b.created_at.isoformat(),
        "slot": _slot_json(b.slot),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def live_slots(request):
    """Upcoming, open, not-yet-booked slots the student can request."""
    now = timezone.now()
    booked_ids = LiveBooking.objects.filter(
        status__in=LIVE_ACTIVE_STATES
    ).values_list("slot_id", flat=True)
    slots = (
        LiveSlot.objects.filter(is_open=True, starts_at__gt=now)
        .exclude(id__in=list(booked_ids))
        .order_by("starts_at")
    )
    # pricing keys are strings so they survive JSON cleanly on the client
    pricing = {str(k): v for k, v in LIVE_PRICING.items()}
    return Response({"slots": [_slot_json(s) for s in slots], "pricing": pricing})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_live_bookings(request):
    bookings = request.user.live_bookings.select_related("slot").all()
    return Response({"bookings": [_booking_json(b) for b in bookings]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_live_booking(request):
    """Request a slot.
    Body: { slot_id, phone, duration_minutes, learning_area, strand, note }."""
    slot_id = request.data.get("slot_id")
    phone = (request.data.get("phone") or "").strip()
    note = (request.data.get("note") or "").strip()
    learning_area = (request.data.get("learning_area") or "").strip() or "General"
    strand = (request.data.get("strand") or "").strip()

    try:
        duration = int(request.data.get("duration_minutes") or 60)
    except (ValueError, TypeError):
        duration = 60
    if duration not in LIVE_PRICING:
        return Response({"error": "Please choose a valid session length."},
                        status=status.HTTP_400_BAD_REQUEST)

    if not slot_id or not phone:
        return Response({"error": "slot_id and phone are required"},
                        status=status.HTTP_400_BAD_REQUEST)

    # Book atomically so two students can't grab the same slot.
    with transaction.atomic():
        try:
            slot = LiveSlot.objects.select_for_update().get(pk=slot_id)
        except LiveSlot.DoesNotExist:
            return Response({"error": "Slot not found"}, status=status.HTTP_404_NOT_FOUND)

        if not slot.is_open or slot.starts_at <= timezone.now():
            return Response({"error": "That slot is no longer available."},
                            status=status.HTTP_409_CONFLICT)
        if duration > slot.max_duration_minutes:
            return Response({"error": "That session length isn't available for this time."},
                            status=status.HTTP_400_BAD_REQUEST)
        if LiveBooking.objects.filter(slot=slot, status__in=LIVE_ACTIVE_STATES).exists():
            return Response({"error": "That slot has just been booked. Please pick another."},
                            status=status.HTTP_409_CONFLICT)

        booking = LiveBooking.objects.create(
            student=request.user,
            slot=slot,
            phone=phone,
            note=note,
            duration_minutes=duration,
            learning_area=learning_area,
            strand=strand,
            amount_kes=live_price(duration),
            status="requested",
        )

    return Response({"booking": _booking_json(booking)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pay_live_booking(request, booking_id):
    """Trigger an IntaSend STK push for an APPROVED booking.
    Body: { phone } (optional — defaults to the booking's phone)."""
    try:
        booking = LiveBooking.objects.select_related("slot").get(
            pk=booking_id, student=request.user
        )
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
    subscription PaymentRequest. Returns True if it matched a live booking.
    Only COMPLETE/CLEARING confirms; the booking's Zoom link (set by admin at
    approval) then becomes visible to the student."""
    try:
        booking = (
            LiveBooking.objects.select_for_update()
            .get(checkout_request_id=invoice_id)
        )
    except LiveBooking.DoesNotExist:
        return False

    if booking.status == "confirmed":
        return True  # already handled — idempotent
    if state in ("COMPLETE", "CLEARING"):
        booking.status = "confirmed"
        booking.mpesa_code = payment_reference or "INTASEND_CONFIRMED"
        booking.confirmed_at = timezone.now()
        booking.save(update_fields=["status", "mpesa_code", "confirmed_at", "updated_at"])
        mpesa_logger.info("Live booking %s confirmed via IntaSend callback", booking.id)
    return True
