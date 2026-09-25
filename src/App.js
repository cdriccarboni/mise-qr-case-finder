import React, { useState } from 'react';
import NavMenu from './components/NavMenu';
import Search from './components/Search';
import Browse from './components/Browse';
import ObjectEntry from './components/ObjectEntry';
import Container from './components/Container';

const App = () => {
  const [currentView, setCurrentView] = useState('Search');

  const handleSearch = (query) => {
    // Handle search logic
  };

  return (
    <div className='App'>
      <NavMenu onNavigate={(view) => setCurrentView(view)} />
      {currentView === 'Search' && <Search onSearch={handleSearch} />}
      {currentView === 'Browse' && <Browse />}
      {/* Add other views conditionally */}
    </div>
  );
};

export default App;