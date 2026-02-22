"use client";

import { useEffect } from "react";

export default function MicrosoftCallback() {
  useEffect(() => {
    // Extract access token from URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");

    if (access_token && window.opener) {
      // Send token to parent window
      window.opener.postMessage(
        {
          type: "microsoft-oauth-success",
          access_token,
        },
        window.location.origin,
      );

      // Close popup
      window.close();
    } else {
      // Redirect to login with error
      window.location.href = "/login?error=oauth_failed";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing Microsoft login...</p>
      </div>
    </div>
  );
}
