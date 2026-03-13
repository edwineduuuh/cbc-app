"""
M-Pesa Daraja API Integration
"""
import os
import base64
import requests
from datetime import datetime


class MpesaAPI:
    """M-Pesa Daraja API Client"""
    
    def __init__(self):
        self.environment = os.getenv('MPESA_ENVIRONMENT', 'sandbox')
        self.consumer_key = os.getenv('MPESA_CONSUMER_KEY')
        self.consumer_secret = os.getenv('MPESA_CONSUMER_SECRET')
        self.shortcode = os.getenv('MPESA_SHORTCODE')
        self.passkey = os.getenv('MPESA_PASSKEY')
        self.callback_url = os.getenv('MPESA_CALLBACK_URL')
        
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
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json().get('access_token')
        except Exception as e:
            print(f"Error getting access token: {e}")
            return None
    
    def generate_password(self):
        """Generate password for STK Push"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        data_to_encode = f'{self.shortcode}{self.passkey}{timestamp}'
        encoded = base64.b64encode(data_to_encode.encode())
        return encoded.decode('utf-8'), timestamp
    
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
        
        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerBuyGoodsOnline',
            'Amount': int(amount),
            'PartyA': phone_number,
            'PartyB': self.shortcode,
            'PhoneNumber': phone_number,
            'CallBackURL': self.callback_url,
            'AccountReference': account_reference,
            'TransactionDesc': transaction_desc,
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            return response.json()
        except Exception as e:
            print(f"Error initiating STK Push: {e}")
            return {'error': str(e)}