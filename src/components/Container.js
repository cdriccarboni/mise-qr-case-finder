import React from 'react';

const Container = ({ container }) => {
  return (
    <div>
      <h1>{container.title}</h1>
      <p>{container.description}</p>
      {/* Add other relevant details */}
    </div>
  );
};

export default Container;