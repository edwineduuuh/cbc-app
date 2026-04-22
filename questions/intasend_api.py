"""
IntaSend M-Pesa STK Push Integration
Replaces Daraja API — works with individual Buy Goods Till via IntaSend.
"""
import os
import re
import logging
import requests

logger = logging.getLogger('mpesa')

SAFARICOM_PREFIXES = re.compile(r'^254(7[0-9]{8}|1[0-9]{8})$')
INTASEND_STK_URL = 'https://api.intasend.com/api/v1/payment/collection/'


class IntaSendAPI:

    def __init__(self):
        self.token = os.getenv('INTASEND_API_TOKEN', '')
        self.publishable_key = os.getenv('INTASEND_PUBLISHABLE_KEY', '')

    @staticmethod
    def normalize_phone(raw_phone):
        """Normalize phone to 2547XXXXXXXX. Returns (phone, error_message)."""
        phone = raw_phone.strip().replace(' ', '').replace('-', '')
        if phone.startswith('+'):
            phone = phone[1:]
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        if not phone.startswith('254'):
            return None, 'Phone number must start with 07, 01, +254, or 254'
        if len(phone) != 12:
            return None, 'Invalid phone number length'
        if not SAFARICOM_PREFIXES.match(phone):
            return None, 'Only Safaricom numbers (07xx / 01xx) are supported for M-Pesa'
        return phone, None

    def stk_push(self, phone_number, amount, api_ref, name='', email=''):
        """Send M-Pesa STK Push via IntaSend.
        Returns {'success': True, 'invoice_id': '...'} or {'success': False, 'error': '...'}.
        """
        headers = {
            'Authorization': f'Token {self.token}',
            'Content-Type': 'application/json',
        }
        payload = {
            'public_key': self.publishable_key,
            'currency': 'KES',
            'method': 'M-PESA',
            'amount': int(amount),
            'phone_number': phone_number,
            'api_ref': api_ref,
        }
        if name:
            payload['name'] = name
        if email:
            payload['email'] = email

        logger.info("IntaSend STK Push → phone=%s amount=%s ref=%s", phone_number, int(amount), api_ref)

        try:
            resp = requests.post(INTASEND_STK_URL, json=payload, headers=headers, timeout=30)
            data = resp.json()
            if resp.status_code in (200, 201) and 'invoice' in data:
                invoice_id = data['invoice']['invoice_id']
                logger.info("IntaSend STK Push accepted: invoice_id=%s", invoice_id)
                return {'success': True, 'invoice_id': invoice_id}
            error = data.get('details') or data.get('message') or str(data)
            logger.warning("IntaSend STK Push failed (HTTP %s): %s", resp.status_code, error)
            return {'success': False, 'error': str(error)}
        except requests.exceptions.Timeout:
            logger.error("IntaSend STK Push timed out")
            return {'success': False, 'error': 'Request timed out — please try again'}
        except Exception as e:
            logger.exception("IntaSend STK Push error: %s", e)
            return {'success': False, 'error': str(e)}
