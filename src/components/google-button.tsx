"use client";
import { useEffect, useState } from "react";
import { signInWithGoogle } from "@/lib/supabase/browser";
export default function GoogleButton({ className }: { className?: string }) {
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setReady(true), []);
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={!ready}
        onClick={async () => {
          setError("");
          if (await signInWithGoogle())
            setError("Login Google belum dapat digunakan. Coba lagi nanti.");
        }}
      >
        Masuk dengan Google
      </button>
      {error && (
        <p role="alert" className="landing-error">
          {error}
        </p>
      )}
    </>
  );
}
