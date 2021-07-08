import React from 'react';

export function Welcome() {
  return (
    <div className="flex flex-col w-full">
      <h1 className="my-2 font-bold text-gray-300 text-4xl">Dashboard</h1>
      <div className="my-4 text-gray-200 text-base">
        Welcome to Re.pack Dashboard.
        <br />
        Improve your developer experience by using the tools to analyze and
        better understand your project.
      </div>
      <div className="mt-6 text-gray-200 text-base font-medium">
        To start, select one of the tool from the list on the left.
      </div>
    </div>
  );
}
