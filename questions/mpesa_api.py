"""
M-Pesa Daraja API Integration
"""
import os
import re
import logging
import base64
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

# Valid Safaricom prefixes (07xx, 01xx → 2547xx, 2541xx)
SAFARICOM_PREFIXES = re.compile(r'^254(7[0-9]{8}|1[0-9]{8})$')

REQUESTS_TIMEOUT = 30  # seconds


class MpesaAPI:
    """M-Pesa Daraja API Client"""
    
    def __init__(self):
        self.environment = os.getenv('MPESA_ENVIRONMENT', 'sandbox')
        self.consumer_key = os.getenv('MPESA_CONSUMER_KEY')
        self.consumer_secret = os.getenv('MPESA_CONSUMER_SECRET')
        self.shortcode = os.getenv('MPESA_SHORTCODE')
        self.passkey = os.getenv('MPESA_PASSKEY')
        self.callback_url = os.getenv('MPESA_CALLBACK_URL')
        self.transaction_type = os.getenv('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline')
        
        if self.environment == 'sandbox':
            self.base_url = 'https://sandbox.safaricom.co.ke'
        else:
            self.base_url = 'https://api.safaricom.co.ke'
    
    def get_access_token(self):
        """Get OAuth access token"""
        url = f'{self.base_url}/oauth/v1/generate?grant_type=client_credentials'
        
        auth_string = f'{self.consumer_key}:{self.consumer_secret}'
        auth_bytes = auth_string.encode('ascii')
        auth_base64 = base64.b64encode(auth_bytes).decode('ascii')
        
        headers = {'Authorization': f'Basic {auth_base64}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=REQUESTS_TIMEOUT)
            response.raise_for_status()
            return response.json().get('access_token')
        except Exception as e:
            logger.error("M-Pesa OAuth token error: %s", e)
            return None
    
    def generate_password(self):
        """Generate password for STK Push"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        data_to_encode = f'{self.shortcode}{self.passkey}{timestamp}'
        encoded = base64.b64encode(data_to_encode.encode())
        return encoded.decode('utf-8'), timestamp
    
    @staticmethod
    def normalize_phone(raw_phone):
        """Normalize phone number to 2547XXXXXXXX format.
        Returns (phone, error_message). error_message is None on success.
        """
        phone = raw_phone.strip().replace(' ', '').replace('-', '')
        # Strip leading '+'
        if phone.startswith('+'):
            phone = phone[1:]
        # 07xx / 01xx → 254...
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        # Already 254...
        if not phone.startswith('254'):
            return None, 'Phone number must start with 07, 01, +254, or 254'
        if len(phone) != 12:
            return None, 'Invalid phone number length'
        if not SAFARICOM_PREFIXES.match(phone):
            return None, 'Only Safaricom numbers (07xx / 01xx) are supported for M-Pesa'
        return phone, None

    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """Initiate STK Push request"""
        access_token = self.get_access_token()
        if not access_token:
            return {'error': 'Failed to get access token'}
        
        password, timestamp = self.generate_password()
        
        url = f'{self.base_url}/mpesa/stkpush/v1/processrequest'
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }
        
        logger.info("STK Push → phone=%s amount=%s ref=%s", phone_number, int(amount), account_reference)

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': self.transaction_type,
            'Amount': int(amount),
            'PartyA': phone_number,
            'PartyB': self.shortcode,
            'PhoneNumber': phone_number,
            'CallBackURL': self.callback_url,
            'AccountReference': account_reference,
            'TransactionDesc': transaction_desc,
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=REQUESTS_TIMEOUT)
            result = response.json()
            logger.info("STK Push response: %s", result)
            return result
        except Exception as e:
            logger.error("STK Push request error: %s", e)
            return {'error': str(e)}