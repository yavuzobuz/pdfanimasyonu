import { BrainCircuit } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center gap-2 px-4 h-16">
        <Link href="/" className="flex items-center gap-2">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <span className="text-xl font-headline font-bold text-foreground">
            VisuaLearn
          </span>
        </Link>
      </div>
    </header>
  );
}
