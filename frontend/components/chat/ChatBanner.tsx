"use client";

import { AnimatePresence, motion } from "framer-motion";

export function ChatBanner({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-xs text-amber-100/90"
        >
          {message}
          <button
            type="button"
            className="ml-3 underline"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
