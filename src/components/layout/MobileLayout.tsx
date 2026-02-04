import { ReactNode } from 'react';
import { MobileHeader } from './MobileHeader';
import { BottomNavigation } from './BottomNavigation';

interface MobileLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

export function MobileLayout({ 
  children, 
  showHeader = true, 
  showBottomNav = true 
}: MobileLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showHeader && <MobileHeader />}
      <main className={showBottomNav ? "flex-1 pb-20" : "flex-1"}>
        {children}
      </main>
      {showBottomNav && <BottomNavigation />}
    </div>
  );
}
