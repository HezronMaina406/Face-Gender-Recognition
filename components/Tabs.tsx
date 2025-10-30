
import React from 'react';
import { PhotoIcon, VideoIcon, CameraIcon, FolderIcon } from './Icons';

type Tab = 'photo' | 'video' | 'live' | 'batch';
interface TabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabs: { id: Tab; name: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'photo', name: 'Photo', icon: PhotoIcon },
  { id: 'video', name: 'Video', icon: VideoIcon },
  { id: 'live', name: 'Live', icon: CameraIcon },
  { id: 'batch', name: 'Batch', icon: FolderIcon },
];

export const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex space-x-2 bg-gray-800/60 p-1.5 rounded-xl">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none ${
              isActive ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700/80'
            }`}
          >
            <tab.icon className="w-5 h-5"/>
            <span>{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
};
