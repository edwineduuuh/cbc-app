import africastalking
import os

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
        print(f"✅ SMS sent to {phone_number}: {response}")
        return True
    except Exception as e:
        print(f"❌ SMS failed: {e}")
        return False


def send_payment_confirmation(phone_number, username, plan_name, days):
    """Send payment confirmation SMS"""
    message = (
        f"Hi {username}! Your NurtureUp {plan_name} plan is now active. "
        f"You have {days} days of unlimited access. "
        f"Start learning at nurturekup.com. Good luck! 🎓"
    )
    return send_sms(phone_number, message)