# 🎨 Frontend Code Quality Fixes

**Time Estimate:** 3-4 hours  
**Impact:** Better UX, fewer crashes, professional error handling  

---

## 🚨 CRITICAL: Remove Console Logs

### Step 1: Create Logger Utility

**File:** `frontend/src/lib/logger.js`

```javascript
const isDev = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  
  error: (message, error = null) => {
    if (isDev) {
      console.error(message, error);
    } else if (typeof window !== 'undefined' && window.Sentry) {
      // Send to error tracking in production
      window.Sentry.captureException(error || new Error(message));
    }
  },
  
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  
  info: (...args) => {
    if (isDev) console.info(...args);
  },
};

export default logger;
```

### Step 2: Replace Console Statements

**Use VS Code Find & Replace:**

1. Open Find & Replace: `Ctrl+Shift+H` (Windows) or `Cmd+Shift+H` (Mac)
2. Enable regex: Click the `.*` icon
3. Search scope: `frontend/src/**/*.{js,jsx}`

**Replacement 1 - console.error:**
```
Find:    console\.error\((.*?)\)
Replace: logger.error($1)
```

**Replacement 2 - console.log:**
```
Find:    console\.log\((.*?)\)
Replace: logger.log($1)
```

**Replacement 3 - console.warn:**
```
Find:    console\.warn\((.*?)\)
Replace: logger.warn($1)
```

### Step 3: Add Import to Files

**Add to top of each modified file:**
```javascript
import logger from '@/lib/logger';
```

**Files to update (40+ files):**
- `app/join/page.js`
- `app/explore/page.js`
- `contexts/AuthContext.js`
- `components/AdminPaymentsPanel.js`
- All admin pages
- All dashboard pages

---

## 🛡️ Add Error Boundaries

### Step 1: Create Error Boundary Component

**File:** `frontend/src/components/ErrorBoundary.js`

```javascript
'use client';
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    // Log to error tracking service
    if (process.env.NODE_ENV === 'production') {
      console.error('Error Boundary caught:', error, errorInfo);
      // window.Sentry?.captureException(error);
    } else {
      console.error('Error Boundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {this.props.fallbackMessage || 
                "We're sorry for the inconvenience. Our team has been notified."}
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (dev only)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              {this.props.onReset && (
                <button
                  onClick={() => {
                    this.handleReset();
                    this.props.onReset();
                  }}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Step 2: Wrap Critical Sections

**Main Layout:**

**File:** `frontend/src/app/layout.js`

```javascript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary fallbackMessage="The application encountered an error">
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**Quiz Page:**

**File:** `frontend/src/app/quizzes/[id]/page.js`

```javascript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function QuizPage() {
  return (
    <ErrorBoundary fallbackMessage="Failed to load quiz. Please try again.">
      <QuizContent />
    </ErrorBoundary>
  );
}
```

**Teacher Dashboard:**

**File:** `frontend/src/app/teacher/page.js`

```javascript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function TeacherDashboard() {
  return (
    <ErrorBoundary>
      <TeacherDashboardContent />
    </ErrorBoundary>
  );
}
```

---

## 🔌 Fix API Error Handling

### Step 1: Create Error Handler Utility

**File:** `frontend/src/lib/errorHandler.js`

```javascript
import logger from './logger';

export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

export function handleAPIError(error, options = {}) {
  const {
    customMessage,
    showToast = true,
    logError = true,
  } = options;
  
  let message = customMessage || 'Something went wrong';
  let status = error?.status || 500;
  
  if (error instanceof APIError) {
    message = error.message;
    status = error.status;
  } else if (error?.message) {
    message = error.message;
  }
  
  // User-friendly messages
  if (status === 404) {
    message = 'Resource not found';
  } else if (status === 403) {
    message = 'You don\'t have permission to do that';
  } else if (status === 401) {
    message = 'Please log in to continue';
  } else if (status === 500) {
    message = 'Server error. Please try again later';
  }
  
  // Show toast notification
  if (showToast && typeof window !== 'undefined') {
    // Assuming you have a toast library
    // toast.error(message);
  }
  
  // Log error
  if (logError) {
    logger.error(`API Error [${status}]:`, error);
  }
  
  return { message, status };
}
```

### Step 2: Update API Functions

**File:** `frontend/src/lib/api.js`

```javascript
import logger from './logger';
import { APIError, handleAPIError } from './errorHandler';

export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    
    // Handle non-2xx responses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      
      throw new APIError(
        errorData.error || errorData.detail || 'Request failed',
        response.status,
        errorData
      );
    }
    
    // Parse JSON response
    const data = await response.json();
    return data;
    
  } catch (error) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError('Network error. Check your connection.', 0, null);
    }
    
    throw error;
  }
}

// Example usage in components:
export async function getQuizzes(filters = {}) {
  try {
    const params = new URLSearchParams(filters).toString();
    const data = await fetchWithAuth(`${API}/quizzes/?${params}`);
    return { success: true, data };
  } catch (error) {
    const errorInfo = handleAPIError(error, {
      customMessage: 'Failed to load quizzes',
    });
    return { success: false, error: errorInfo };
  }
}
```

### Step 3: Update Components to Handle Errors

**Before (Bad):**
```javascript
useEffect(() => {
  fetch(url)
    .then(res => res.json())
    .then(setData)
    .catch(() => {});  // Silent failure!
}, []);
```

**After (Good):**
```javascript
import { handleAPIError } from '@/lib/errorHandler';
import { useState } from 'react';

const [error, setError] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchWithAuth(url);
      setData(result);
    } catch (err) {
      const errorInfo = handleAPIError(err, {
        customMessage: 'Failed to load data',
      });
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };
  
  loadData();
}, []);

// In JSX:
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
    {error}
  </div>
)}
```

---

## 🔄 Fix Memory Leaks

### Problem: useEffect with Intervals

**Before (Leaky):**
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    fetchStatus();
  }, 2000);
  
  return () => clearInterval(interval);
}, [fetchStatus]);  // Creates new interval every time fetchStatus changes!
```

**After (Fixed):**
```javascript
useEffect(() => {
  let isMounted = true;
  
  const pollStatus = async () => {
    if (!isMounted) return;
    try {
      const data = await fetchStatus();
      if (isMounted) {
        setStatus(data);
      }
    } catch (error) {
      logger.error('Poll failed:', error);
    }
  };
  
  const interval = setInterval(pollStatus, 2000);
  
  // Cleanup
  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, []); // Fixed dependencies - won't recreate
```

**Apply to:**
- `app/join/page.js` (polling for session status)
- Any component with `setInterval` or `setTimeout`

---

## ♿ Add Accessibility

### Quick Wins:

**1. Add aria-labels to icon buttons:**
```javascript
// Before
<button onClick={handleDelete}>
  <Trash2 />
</button>

// After
<button 
  onClick={handleDelete}
  aria-label="Delete question"
  className="..."
>
  <Trash2 aria-hidden="true" />
</button>
```

**2. Add alt text to images:**
```javascript
// Before
<img src={question.image} />

// After
<img 
  src={question.image} 
  alt={`Question ${question.number} diagram`}
/>
```

**3. Ensure keyboard navigation:**
```javascript
// Before
<div onClick={handleClick}>Clickable</div>

// After
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyPress={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Clickable
</div>

// Or just use a button!
<button onClick={handleClick}>Clickable</button>
```

**4. Associate labels with inputs:**
```javascript
// Before
<input type="text" placeholder="Username" />

// After
<div>
  <label htmlFor="username" className="block mb-1">
    Username
  </label>
  <input 
    id="username"
    type="text" 
    placeholder="Enter username"
    aria-describedby="username-help"
  />
  <span id="username-help" className="text-sm text-gray-500">
    Must be 3-150 characters
  </span>
</div>
```

---

## 📱 Add Loading States

### Create Loading Component

**File:** `frontend/src/components/ui/LoadingSpinner.js`

```javascript
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', message }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${sizes[size]} animate-spin text-blue-500`} />
      {message && (
        <p className="mt-3 text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
}
```

### Use in Components

**Before:**
```javascript
const [data, setData] = useState([]);

useEffect(() => {
  fetchData().then(setData);
}, []);

return <DataTable data={data} />;  // Shows empty table while loading!
```

**After:**
```javascript
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  fetchData()
    .then(setData)
    .finally(() => setLoading(false));
}, []);

if (loading) {
  return <LoadingSpinner message="Loading data..." />;
}

return <DataTable data={data} />;
```

---

## 🔒 Input Validation

### Create Validation Library

**File:** `frontend/src/lib/validation.js`

```javascript
export const validators = {
  email: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) {
      return 'Invalid email address';
    }
    return null;
  },
  
  username: (value) => {
    if (!value || value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 150) {
      return 'Username must be less than 150 characters';
    }
    if (!/^[a-zA-Z0-9@.+\-_]+$/.test(value)) {
      return 'Username can only contain letters, numbers, and @.+-_';
    }
    return null;
  },
  
  password: (value) => {
    if (!value || value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;
  },
  
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  phoneKE: (value) => {
    // Kenyan phone format: 254712345678 or 712345678
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 9) {
      return null; // 712345678
    }
    if (cleaned.length === 12 && cleaned.startsWith('254')) {
      return null; // 254712345678
    }
    return 'Invalid phone number. Use format: 712345678';
  },
};

export function validateForm(fields, rules) {
  const errors = {};
  
  Object.entries(rules).forEach(([field, validators]) => {
    const value = fields[field];
    
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        errors[field] = error;
        break; // Stop at first error
      }
    }
  });
  
  return errors;
}
```

### Use in Forms

**File:** `app/login/page.js`

```javascript
import { validators, validateForm } from '@/lib/validation';

const [formData, setFormData] = useState({
  username: '',
  password: '',
});
const [errors, setErrors] = useState({});

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate
  const validationErrors = validateForm(formData, {
    username: [validators.required, validators.username],
    password: [validators.required, validators.password],
  });
  
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  
  // Submit
  const result = await login(formData);
  // ...
};

return (
  <form onSubmit={handleSubmit}>
    <Input
      value={formData.username}
      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
      error={errors.username}
    />
    {errors.username && (
      <p className="text-sm text-red-500 mt-1">{errors.username}</p>
    )}
    {/* ... */}
  </form>
);
```

---

## ✅ Frontend Fixes Checklist

- [ ] Created logger utility
- [ ] Replaced all `console.*` with `logger.*`
- [ ] Created ErrorBoundary component
- [ ] Wrapped critical sections with ErrorBoundary
- [ ] Created error handler utility
- [ ] Updated API functions to use proper error handling
- [ ] Fixed memory leaks in useEffect
- [ ] Added aria-labels to icon buttons
- [ ] Added alt text to images
- [ ] Added loading states to async operations
- [ ] Created validation library
- [ ] Added input validation to forms

---

## 🚀 Test Frontend Changes

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Build for production
npm run build

# 3. Start production server
npm start

# 4. Check browser console
# Should see NO console.log/error/warn in production

# 5. Trigger an error
# Click something that fails
# Should see error boundary UI, not blank screen

# 6. Test forms
# Submit with invalid data
# Should see validation errors

# 7. Test loading states
# Navigate to pages
# Should see loading spinners, not flash of empty content
```

---

**Time saved for users:** Faster load times, fewer crashes  
**Time saved for you:** Fewer support tickets, better debugging
