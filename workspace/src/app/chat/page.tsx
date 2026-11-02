import { redirect } from 'next/navigation';

// Direct and bookmarked chat links return to the workspace shell.
export default function ChatPage() {
  redirect('/?chat=1');
}
