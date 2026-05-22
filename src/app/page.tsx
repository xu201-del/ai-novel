"use client";

import TopNav from "@/components/layout/TopNav";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MainContent from "@/components/layout/MainContent";
import RightPanel from "@/components/layout/RightPanel";

export default function Home() {
  return (
    <div className="h-full flex flex-col">
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar />
        <MainContent />
        <RightPanel />
      </div>
    </div>
  );
}
