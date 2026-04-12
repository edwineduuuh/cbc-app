import africastalking
import logging
import os

logger = logging.getLogger('sms')

def send_sms(phone_number, message):
    """Send SMS via Africa's Talking"""
    try:
        africastalking.initialize(
            username=os.getenv('AT_USERNAME', 'sandbox'),
            api_key=os.getenv('AT_API_KEY'),
        )
        sms = africastalking.SMS
        
        # Format phone number
        if not phone_number.startswith('+'):
            if phone_number.startswith('0'):
                phone_number = '+254' + phone_number[1:]
            elif phone_number.startswith('254'):
                phone_number = '+' + phone_number
        
        response = sms.send(message, [phone_number])
        logger.info("SMS sent to %s: %s", phone_number, response)
        return True
    except Exception as e:
        logger.error("SMS failed to %s: %s", phone_number, e)
        return False


def send_payment_confirmation(phone_number, username, plan_name, days):
    """Send payment confirmation SMS to the student"""
    message = (
        f"Hi {username}! Your StadiSpace {plan_name} plan is now active. "
        f"You have {days} days of unlimited access. "
        f"Start learning at stadispace.co.ke. Good luck!"
    )
    return send_sms(phone_number, message)


def send_payment_confirmation_to_parent(parent_phone, parent_name, child_name, plan_name, amount, mpesa_code):
    """Send payment receipt SMS to the parent"""
    message = (
        f"Hi {parent_name or 'there'}! Payment of KES {amount} confirmed for "
        f"{child_name}'s StadiSpace {plan_name} plan. "
        f"Ref: {mpesa_code}. "
        f"Track their progress at stadispace.co.ke"
    )
    return send_sms(parent_phone, message)