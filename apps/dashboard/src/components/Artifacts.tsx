import React from 'react';

export function Artifacts() {
  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-row justify-center pt-4 pb-8 border-b-2 border-gray-800">
        <button className="mx-4 py-2 px-4 border-2 border-gray-800 rounded bg-gray-800">
          iOS
        </button>
        <button className="mx-4 py-2 px-4 border-2 border-gray-800 rounded">
          Android
        </button>
      </div>
    </div>
  );
}
