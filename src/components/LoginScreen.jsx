import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { auth, googleProvider, signInWithPopup, signInWithRedirect } from '../firebase.js';
import { detectWebView, getRecommendedAuthMethod, getAuthErrorMessage, getAuthSolutionSuggestions } from '../utils/webview.js';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

const LoginScreen = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const { authError, clearAuthError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Clear errors when component mounts
  useEffect(() => {
    clearAuthError();
    setError('');
  }, [clearAuthError]);

  // Handle auth errors from context
  useEffect(() => {
    if (authError) {
      console.error('LoginScreen: Auth error from context:', authError);
      const errorMessage = getAuthErrorMessage(authError);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [authError]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    clearAuthError();
    
    // Detect iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Set a timeout for iOS devices to prevent infinite loading
    let authTimeout;
    if (isIOS) {
      authTimeout = setTimeout(() => {
        if (isLoading) {
          console.warn('LoginScreen: iOS authentication timeout reached');
          setError('Authentication is taking longer than expected. Please try again or refresh the page.');
          setIsLoading(false);
        }
      }, 20000); // 20 second timeout for iOS
    }
    
    try {
      // Use the new WebView detection utility
      const detection = detectWebView();
      const recommendedMethod = getRecommendedAuthMethod();
      
      console.log('LoginScreen: Environment detection:', detection);
      console.log('LoginScreen: Recommended auth method:', recommendedMethod);
      console.log('LoginScreen: Retry count:', retryCount);
      
      // For iOS devices, always use redirect to avoid popup issues
      if (isIOS) {
        console.log('LoginScreen: iOS device detected, using redirect authentication');
        await signInWithRedirect(auth, googleProvider);
        return; // Don't set loading to false as we're redirecting
      }
      
      // For WebView or in-app browsers, always use redirect
      if (detection.shouldUseRedirect) {
        console.log('LoginScreen: Using redirect authentication for WebView/in-app browser');
        await signInWithRedirect(auth, googleProvider);
        return; // Don't set loading to false as we're redirecting
      }
      
      // For regular browsers, try popup first
      try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('LoginScreen: Popup sign-in successful:', result);
        console.log('LoginScreen: User authenticated:', result.user.email);
        // The AuthContext will handle the state change automatically
      } catch (popupError) {
        console.error('LoginScreen: Popup sign-in error:', popupError);
        
        // Handle specific popup error cases
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy') ||
            popupError.message?.includes('disallowed_useragent') ||
            popupError.message?.includes('Use secure browsers') ||
            popupError.code === 'auth/unauthorized-domain') {
          // Fallback to redirect for popup issues or WebView
          console.log('LoginScreen: Falling back to redirect due to popup/WebView issues');
          await signInWithRedirect(auth, googleProvider);
          return; // Don't set loading to false as we're redirecting
        } else {
          throw popupError; // Re-throw other errors
        }
      }
    } catch (error) {
      console.error('LoginScreen: Google sign-in error:', error);
      
      // Use the new error handling utility
      const errorMessage = getAuthErrorMessage(error);
      setError(errorMessage);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
    } finally {
      // Clear timeout if it exists
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setError('');
    clearAuthError();
    handleGoogleSignIn();
  };

  const handleClearError = () => {
    setError('');
    clearAuthError();
    setRetryCount(0);
  };

  // Get WebView detection for UI
  const detection = detectWebView();
  const solutionSuggestions = error ? getAuthSolutionSuggestions({ message: error }) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <img src="/logo.svg" alt="Nivasi.space Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('title') || 'Nivasi.space'}
          </h1>
          <p className="text-gray-600">
            {t('tagline') || 'College Room Rental - Find your perfect room near campus'}
          </p>
        </div>

        {/* Debug Information (only in development) */}
        

        {/* Google Sign In Button */}
        <div className="space-y-4">
          <Button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 py-3 text-lg font-semibold flex items-center justify-center gap-3 transition-all duration-200 hover:shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>
          
          {/* iOS Notice */}
          {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
            <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-700 text-xs text-center">
                🍎 iOS Device Detected: You'll be redirected to Safari for secure authentication
              </p>
              <p className="text-orange-600 text-xs text-center mt-1">
                This ensures the best compatibility with iOS security features
              </p>
            </div>
          )}
          
          {/* Enhanced WebView Notice */}
          {detection.shouldUseRedirect && !/iPad|iPhone|iPod/.test(navigator.userAgent) && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-xs text-center">
                🔗 You'll be redirected to your default browser for secure authentication
              </p>
              <p className="text-blue-600 text-xs text-center mt-1">
                For the best experience, install the Nivasi Space app
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-600 text-sm">{error}</p>
                
                {/* Solution Suggestions */}
                {solutionSuggestions.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-blue-700 text-xs font-medium mb-1">
                      💡 <strong>Solutions:</strong>
                    </p>
                    <ul className="text-blue-600 text-xs space-y-1">
                      {solutionSuggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-blue-500">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={handleRetry}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Try Again
                  </Button>
                  <Button
                    onClick={handleClearError}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Clear Error
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {t('poweredBy') || 'Powered by Nivasi.space - Your trusted college room rental platform'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen; 