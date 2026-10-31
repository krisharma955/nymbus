const TOKEN_STORAGE_KEY = "nymbus_jwt_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new Event("nymbus-auth-change"));
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event("nymbus-auth-change"));
}

/**
 * Initializes and captures any token delivered via OAuth redirect in URL fragment or search params:
 * e.g., http://localhost:3000/#token=xyz or ?token=xyz
 * Cleans the URL so the token is not leaked in browser history.
 */
export function initializeAuthFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const hash = window.location.hash;
    let token: string | null = null;

    if (hash && hash.includes("token=")) {
      const match = hash.match(/token=([^&]+)/);
      if (match && match[1]) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      const params = new URLSearchParams(window.location.search);
      const paramToken = params.get("token");
      if (paramToken) {
        token = paramToken;
      }
    }

    if (token) {
      setStoredToken(token);

      // Clean the URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      let cleanUrl = url.pathname + (url.search ? url.search : "");
      if (url.hash && url.hash.includes("token=")) {
        const cleanedHash = url.hash.replace(/#?token=[^&]+&?/, "").replace(/&$/, "");
        cleanUrl += cleanedHash ? `#${cleanedHash}` : "";
      }
      window.history.replaceState({}, document.title, cleanUrl);
      return token;
    }
  } catch (err) {
    console.error("Failed to parse token from URL:", err);
  }

  return getStoredToken();
}

/**
 * Returns default authorization headers if a token is present.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
}
