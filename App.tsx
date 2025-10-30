
import React, { useState, useEffect } from 'react';
import { PhotoAnalyzer } from './components/PhotoAnalyzer';
import { VideoAnalyzer } from './components/VideoAnalyzer';
import { CameraView } from './components/CameraView';
import { BatchAnalyzer } from './components/BatchAnalyzer';
import { KnownFacesPanel } from './components/KnownFacesPanel';
import { Tabs } from './components/Tabs';
import { LogoIcon } from './components/Icons';
import type { KnownPerson } from './types';

type Tab = 'photo' | 'video' | 'live' | 'batch';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('photo');
  const [knownPeople, setKnownPeople] = useState<KnownPerson[]>([]);
  const [recognizeGender, setRecognizeGender] = useState<boolean>(true);
  const [countPeople, setCountPeople] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedPeople = localStorage.getItem('knownPeople');
      if (storedPeople) {
        setKnownPeople(JSON.parse(storedPeople));
      }
    } catch (error) {
      console.error("Failed to parse known people from localStorage:", error);
    }
  }, []);

  const updateKnownPeople = (people: KnownPerson[]) => {
    setKnownPeople(people);
    localStorage.setItem('knownPeople', JSON.stringify(people));
  };

  const addPerson = (name: string, image: string) => {
    const newPerson: KnownPerson = {
      id: `person_${Date.now()}`,
      name,
      image,
    };
    updateKnownPeople([...knownPeople, newPerson]);
  };

  const removePerson = (id: string) => {
    updateKnownPeople(knownPeople.filter(p => p.id !== id));
  };

  const renderActiveTab = () => {
    const commonProps = { knownPeople, options: { recognizeGender, countPeople } };
    switch (activeTab) {
      case 'photo':
        return <PhotoAnalyzer {...commonProps} />;
      case 'video':
        return <VideoAnalyzer {...commonProps} />;
      case 'live':
        return <CameraView {...commonProps} addPerson={addPerson} />;
      case 'batch':
        return <BatchAnalyzer {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row font-sans">
      <div className="w-full lg:w-96 bg-gray-900/80 backdrop-blur-sm border-r border-gray-700/50 p-6 flex-shrink-0 flex flex-col">
        <header className="flex items-center space-x-3 mb-8">
          <LogoIcon className="w-10 h-10 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight">FaceRec AI</h1>
        </header>
        
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <KnownFacesPanel
                people={knownPeople}
                onRemovePerson={removePerson}
            />
        </div>

        <div className="mt-auto pt-6 border-t border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Settings</h3>
            <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700/80 transition-colors">
                    <span className="font-medium text-gray-200">Recognize Gender</span>
                    <div className="relative">
                        <input type="checkbox" className="sr-only peer" checked={recognizeGender} onChange={(e) => setRecognizeGender(e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </div>
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700/80 transition-colors">
                    <span className="font-medium text-gray-200">Count People</span>
                    <div className="relative">
                        <input type="checkbox" className="sr-only peer" checked={countPeople} onChange={(e) => setCountPeople(e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </div>
                </label>
            </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 flex flex-col">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 mt-6 bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

export default App;
