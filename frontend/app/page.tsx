import { AppShell } from "@/components/layout/AppShell";
import { AppShellProvider } from "@/contexts/AppContext";
import { ChatSessionProvider } from "@/contexts/ChatSessionContext";

export default function Home() {
  return (
    <AppShellProvider>
      <ChatSessionProvider>
        <AppShell />
      </ChatSessionProvider>
    </AppShellProvider>
  );
}
