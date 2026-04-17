# 🚨 IMMEDIATE ACTION ITEMS - DO THESE TODAY

**Priority:** These fixes protect your paying customers and your business.  
**Time Estimate:** 4-6 hours for critical items  

---

## ⚡ CRITICAL FIXES (Do in Order)

### 1. Stop Credential Leakage (5 minutes)

**File:** `backend/settings.py`

**Delete lines 22-24:**
```python
# DELETE THESE LINES:
print("Cloudinary Cloud Name:", os.environ.get('CLOUDINARY_CLOUD_NAME'))
print("Cloudinary API Key:", os.environ.get('CLOUDINARY_API_KEY'))
print("Cloudinary API Secret:", os.environ.get('CLOUDINARY_API_SECRET'))
```

**Test:**
```bash
python manage.py runserver
# Check terminal output - should see NO credentials
```

---

### 2. Secure Payment Webhook (30 minutes)

**File:** `questions/views.py` (Line ~2071)

**Replace the entire `mpesa_callback` function:**

```python
import hmac
import hashlib
import base64

SAFARICOM_CALLBACK_IPS = ['196.201.214.206', '196.201.214.207', '196.201.214.208']

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback(request):
    """M-Pesa callback endpoint with security validation"""
    
    # Step 1: IP Whitelisting
    client_ip = request.META.get('REMOTE_ADDR')
    if client_ip not in SAFARICOM_CALLBACK_IPS:
        mpesa_logger.error(f"Unauthorized callback IP: {client_ip}")
        return Response({'error': 'Unauthorized IP'}, status=403)
    
    # Step 2: Signature Verification (if Safaricom provides it)
    # webhook_secret = os.environ.get('MPESA_WEBHOOK_SECRET')
    # signature = request.META.get('HTTP_X_SAFARICOM_SIGNATURE', '')
    # expected_sig = base64.b64encode(
    #     hmac.new(webhook_secret.encode(), request.body, hashlib.sha256).digest()
    # ).decode()
    # if not hmac.compare_digest(signature, expected_sig):
    #     return Response({'error': 'Invalid signature'}, status=403)
    
    mpesa_logger.info("M-Pesa callback received from verified IP")
    
    try:
        stk_callback = request.data.get('Body', {}).get('stkCallback', {})
        result_code = stk_callback.get('ResultCode')
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        
        if not checkout_request_id:
            return Response({'message': 'Invalid callback data'}, status=400)
        
        # Step 3: Atomic payment processing
        with transaction.atomic():
            try:
                payment_request = PaymentRequest.objects.select_for_update().select_related(
                    'plan', 'user'
                ).get(checkout_request_id=checkout_request_id)
            except PaymentRequest.DoesNotExist:
                mpesa_logger.warning(f"No PaymentRequest for {checkout_request_id}")
                return Response({'message': 'Payment request not found'}, status=404)
            
            # Guard: prevent duplicate processing
            if payment_request.status != 'pending':
                mpesa_logger.info(f"Duplicate callback for payment {payment_request.id}")
                return Response({'message': 'Already processed'})
            
            if result_code == 0:
                # Extract metadata
                callback_items = stk_callback.get('CallbackMetadata', {}).get('Item', [])
                meta = {item.get('Name'): item.get('Value') for item in callback_items}
                
                mpesa_receipt = meta.get('MpesaReceiptNumber')
                amount_paid = meta.get('Amount')
                plan = payment_request.plan
                
                # Validate amount BEFORE updating status
                if amount_paid is not None and int(amount_paid) < int(plan.price_kes):
                    payment_request.status = 'rejected'
                    payment_request.rejection_reason = f'Amount mismatch: {amount_paid} < {plan.price_kes}'
                    payment_request.save()
                    return Response({'message': 'Amount mismatch'}, status=400)
                
                # Mark verified
                payment_request.status = 'verified'
                payment_request.mpesa_code = mpesa_receipt or 'AUTO_CONFIRMED'
                payment_request.amount_paid = amount_paid
                payment_request.verified_at = timezone.now()
                payment_request.save()
                
                # Activate subscription
                user = payment_request.user
                subscription, created = Subscription.objects.get_or_create(
                    user=user,
                    defaults={
                        'plan': plan,
                        'start_date': timezone.now(),
                        'end_date': timezone.now() + timedelta(days=plan.duration_days),
                        'is_active': True,
                    }
                )
                
                if not created:
                    subscription.end_date = timezone.now() + timedelta(days=plan.duration_days)
                    subscription.is_active = True
                    subscription.plan = plan
                    subscription.save()
                
                mpesa_logger.info(f"Payment verified: user={user.username}, amount={amount_paid}")
                
                # Send notifications (best effort)
                try:
                    from .sms import send_payment_confirmation
                    send_payment_confirmation(user, plan.name, amount_paid)
                except Exception as e:
                    mpesa_logger.warning(f"SMS failed: {e}")
                
            else:
                payment_request.status = 'rejected'
                payment_request.rejection_reason = f'M-Pesa ResultCode={result_code}'
                payment_request.save()
        
        return Response({'message': 'Callback processed'})
        
    except Exception as e:
        mpesa_logger.exception(f"Callback error: {e}")
        return Response({'error': 'Internal error'}, status=500)
```

**Test:**
```bash
# Create a test callback in Django shell
python manage.py shell
>>> from questions.views import mpesa_callback
# Send test request
```

---

### 3. Fix Authorization Bypass (15 minutes)

**File:** `questions/views.py` (Line ~478)

**Find `TeacherClassroomAnalyticsView` and update:**

```python
class TeacherClassroomAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        # SECURITY: Verify ownership
        try:
            classroom = Classroom.objects.select_related('teacher').get(
                pk=pk,
                teacher=request.user
            )
        except Classroom.DoesNotExist:
            return Response(
                {'error': 'Classroom not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Optimize with prefetch_related
        students = classroom.students.prefetch_related(
            'attempts'
        ).annotate(
            total_attempts=Count('attempts'),
            avg_score=Avg('attempts__score'),
        )
        
        student_stats = [{
            'id': student.id,
            'name': student.get_full_name(),
            'total_attempts': student.total_attempts or 0,
            'avg_score': round(student.avg_score or 0, 2),
        } for student in students]
        
        return Response({
            'classroom': {
                'id': classroom.id,
                'name': classroom.name,
                'students': student_stats,
            }
        })
```

---

### 4. Fix CORS Configuration (10 minutes)

**File:** `backend/settings.py`

**Replace CORS configuration:**

```python
# Delete lines with hardcoded Vercel URLs

# Replace with:
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]

# Remove these:
# CORS_ALLOWED_ORIGIN_REGEXES = [...]
# CSRF_TRUSTED_ORIGINS with preview URLs
```

**Create `.env` file (don't commit!):**
```bash
# .env
CORS_ALLOWED_ORIGINS=https://your-production-domain.vercel.app,https://www.yourdomain.com
```

**Update Render/deployment platform:**
- Go to Render dashboard
- Environment variables
- Add `CORS_ALLOWED_ORIGINS` with your production URLs

---

### 5. Validate SECRET_KEY (5 minutes)

**File:** `backend/settings.py` (Line ~38)

**Replace:**
```python
SECRET_KEY = os.environ.get('SECRET_KEY')
```

**With:**
```python
from django.core.exceptions import ImproperlyConfigured

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "SECRET_KEY environment variable must be set. "
        "Generate one with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
    )
if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured(f"SECRET_KEY too short ({len(SECRET_KEY)} chars). Must be >= 50 characters.")
```

**Test:**
```bash
# This should work:
SECRET_KEY="your-long-secret-key-here" python manage.py check

# This should fail with clear error:
SECRET_KEY="" python manage.py check
```

---

### 6. Remove Console Logs from Frontend (20 minutes)

**Create logging utility:**

```javascript
// frontend/src/lib/logger.js
const isDev = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  
  error: (message, error) => {
    if (isDev) {
      console.error(message, error);
    }
    // In production, send to error tracking
    if (!isDev && typeof window !== 'undefined') {
      // TODO: Initialize Sentry and send errors there
      // window.Sentry?.captureException(error);
    }
  },
  
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
};

export default logger;
```

**Find and replace (use VS Code):**
1. Press `Ctrl+Shift+H` (Find & Replace in Files)
2. Search: `console\.error\((.*?)\)`
3. Replace: `logger.error($1)`
4. Click "Replace All" in `frontend/src`

**Then:**
1. Add to top of each file: `import logger from '@/lib/logger';`
2. Do same for `console.log` and `console.warn`

---

### 7. Fix Hardcoded API URLs (15 minutes)

**Create config file:**

```javascript
// frontend/src/lib/config.js
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  if (typeof window === 'undefined') {
    // Server-side
    throw new Error(
      'NEXT_PUBLIC_API_URL environment variable is required. ' +
      'Add it to your .env.local file.'
    );
  } else {
    // Client-side - show error to user
    console.error('CRITICAL: API_URL not configured!');
  }
}

export const API = API_URL;
export const config = {
  apiUrl: API_URL,
  isDev: process.env.NODE_ENV === 'development',
};
```

**Update all files using API:**

Find this pattern:
```javascript
const API = process.env.NEXT_PUBLIC_API_URL || "https://cbc-backend-76im.onrender.com/api";
```

Replace with:
```javascript
import { API } from '@/lib/config';
```

**Files to update:**
- `app/admin/page.js`
- `app/login/page.js`
- `app/join/page.js`
- All other pages with API calls

---

## 🔧 DEPLOYMENT CHECKLIST

Before deploying these fixes:

### Backend
```bash
# 1. Check for syntax errors
python manage.py check

# 2. Run tests
python manage.py test

# 3. Create migrations if needed
python manage.py makemigrations
python manage.py migrate --dry-run

# 4. Verify environment variables
echo $SECRET_KEY  # Should be set
echo $CORS_ALLOWED_ORIGINS  # Should be your domains
```

### Frontend
```bash
# 1. Check for build errors
npm run build

# 2. Test locally
npm run dev

# 3. Verify .env.local
cat .env.local
# Should contain:
# NEXT_PUBLIC_API_URL=your-backend-url
```

---

## 📱 VERIFY FIXES WORK

### Test Payment Security
1. Try to call `/api/payments/mpesa-callback/` from Postman
2. Should get 403 Forbidden (IP not whitelisted)
3. Check logs - should see "Unauthorized callback IP"

### Test Authorization
1. Login as Teacher A
2. Try to access Teacher B's classroom analytics
3. Should get 404 Not Found

### Test CORS
1. Try to call API from unauthorized domain
2. Should see CORS error in browser console

### Test Logging
1. Build frontend: `npm run build`
2. Check bundle - should have NO console.log in production code
3. Trigger an error - should NOT see console output

---

## 🚀 DEPLOY SEQUENCE

```bash
# 1. Commit changes
git add .
git commit -m "fix: critical security and performance fixes"

# 2. Deploy backend first
git push render main  # or your backend hosting

# 3. Verify backend is up
curl https://your-backend.com/api/health

# 4. Deploy frontend
git push vercel main  # or your frontend hosting

# 5. Monitor for errors
# Check Render logs
# Check Vercel logs
# Check user reports
```

---

## ⚠️ ROLLBACK PLAN

If something breaks:

```bash
# Backend
git revert HEAD
git push render main

# Frontend
git revert HEAD
git push vercel main

# Or use platform rollback:
# Render: Dashboard → Deployments → Redeploy previous version
# Vercel: Dashboard → Deployments → Rollback
```

---

## 📞 NEED HELP?

1. **Build fails**: Check error message, ensure all imports are correct
2. **Tests fail**: Run `python manage.py test --verbosity=2` for details
3. **API not connecting**: Verify CORS_ALLOWED_ORIGINS includes your frontend URL
4. **Payments not working**: Check Render logs for mpesa_callback errors

---

**Time to complete:** ~2-3 hours  
**Risk level:** Low (all changes are defensive and backward-compatible)  
**Impact:** Prevents security breaches, protects user data, maintains business reputation
