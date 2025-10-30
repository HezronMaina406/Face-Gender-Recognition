
import React from 'react';
import type { KnownPerson } from '../types';
import { TrashIcon, UserCircleIcon } from './Icons';

interface KnownFacesPanelProps {
  people: KnownPerson[];
  onRemovePerson: (id: string) => void;
}

export const KnownFacesPanel: React.FC<KnownFacesPanelProps> = ({ people, onRemovePerson }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Known People</h2>
      {people.length === 0 ? (
        <div className="text-center py-10 px-4 bg-gray-800/70 rounded-lg">
          <UserCircleIcon className="w-12 h-12 mx-auto text-gray-500 mb-2"/>
          <p className="text-gray-400">No people registered yet.</p>
          <p className="text-sm text-gray-500 mt-1">Use the 'Live' tab to add someone.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {people.map(person => (
            <li key={person.id} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg hover:bg-gray-700/80 transition-colors group">
              <div className="flex items-center space-x-3">
                <img src={person.image} alt={person.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-600" />
                <span className="font-medium text-gray-200">{person.name}</span>
              </div>
              <button onClick={() => onRemovePerson(person.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <TrashIcon className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
