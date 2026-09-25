import React from 'react';

const ObjectEntry = ({ entry }) => {
  return (
    <div>
      <h1>{entry.title}</h1>
      <p>{entry.description}</p>
      {/* Add other relevant details */}
    </div>
  );
};

export default ObjectEntry;