export function FirebaseError(error: unknown): string {
    const msg =
        typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string"
            ? (error as { code: string }).code
            : typeof error === "string" ? error : String(error ?? "");

    if (msg.includes("auth/invalid-credential")) {
        return "Invalid email or password.";
    } else if (msg.includes("auth/invalid-email")) {
        return "Invalid email address.";
    } else if (msg.includes("auth/user-not-found")) {
        return "User not found.";
    } else if (msg.includes("auth/wrong-password")) {
        return "Incorrect password.";
    } else if (msg.includes("auth/email-already-in-use")) {
        return "Email already in use.";
    } else if (msg.includes("auth/weak-password")) {
        return "Weak password. Please choose a stronger password.";
    } else if (msg.includes("auth/operation-not-allowed")) {
        return "Google sign-in is not enabled. Enable it in the Firebase console.";
    } else if (msg.includes("auth/account-exists-with-different-credential")) {
        return "An account already exists with this email. Sign in with your original method.";
    } else if (msg.includes("auth/popup-closed-by-user") || msg.includes("auth/cancelled-popup-request")) {
        return "Sign-in was cancelled.";
    } else if (msg.includes("missing ID token")) {
        return "Google sign-in failed. Please try again.";
    } else if (msg.includes("UNAUTHENTICATED")) {
        return "Your session has expired. Please sign in again.";
    } else if (msg.includes("NETWORK_ERROR") || msg.includes("TIMEOUT")) {
        return "Can't reach the server. Check your connection and try again.";
    } else if (msg.includes("RATE_LIMITED")) {
        return "Too many attempts. Please wait a moment and try again.";
    } else if (msg.includes("VALIDATION_ERROR") || msg.includes("BAD_REQUEST")) {
        // The server names the offending field; show it so the user knows what to fix.
        const field = (error as { details?: { fields?: { path: string; message: string }[] } }).details?.fields?.[0];
        return field ? `${field.path}: ${field.message}` : "Some details were invalid. Please check and try again.";
    } else if (msg.includes("CONFLICT")) {
        return "That already exists.";
    } else if (msg.includes("NOT_FOUND")) {
        return "That item no longer exists.";
    } else if (msg.includes("INTERNAL_ERROR")) {
        return "Something went wrong on our side. Please try again.";
    } else {
        return "An unknown error occurred.";
    }
}
