"use client";

import { useEffect } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("FileForge route error", error.digest ?? "unclassified");
  }, [error.digest]);

  return <main className="site-shell"><section className="error-page"><span className="brand-mark"><Sparkles size={17} /></span><span className="eyebrow">SOMETHING NEEDS A SECOND LOOK</span><h1>That file path<br /><em>hit a snag.</em></h1><p>The workspace could not finish loading this view. Your local files were not uploaded or changed.</p><button className="primary-button" onClick={() => reset()}><RefreshCw size={16} /> Try again</button></section></main>;
}
