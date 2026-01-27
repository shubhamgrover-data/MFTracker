import React, { useState } from 'react';
import { Cog , LayoutDashboard, PieChart, TrendingUp, Menu, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const navItems = [
    { id: 'DASHBOARD', label: 'Tracking Board', icon: <LayoutDashboard size={20} /> },
    { id: 'FUND_DETAIL', label: 'MF Search', icon: <PieChart size={20} /> },
    { id: 'STOCK_SEARCH', label: 'Stock Search', icon: <Search size={20} /> },
    { id: 'CONFIGURATION', label: 'Configure', icon: <Cog size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-6 border-b border-gray-100 h-20`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl whitespace-nowrap overflow-hidden">
              <TrendingUp size={24} />
              <span>FundFlow</span>
            </div>
          )}
          {isCollapsed && <TrendingUp size={24} className="text-indigo-600" />}
          
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* Desktop Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-24 bg-white border border-gray-200 rounded-full p-1 text-gray-400 hover:text-indigo-600 shadow-sm z-40"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsSidebarOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors group relative ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-gray-100">
          {!isCollapsed ? (
            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-900 text-sm mb-1">Pro Insights</h4>
              <p className="text-xs text-indigo-700 mb-3">Powered by Gemini 2.5 Flash</p>
            </div>
          ) : (
             <div className="flex justify-center text-indigo-300">
               <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse"></div>
             </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:hidden flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <TrendingUp size={20} />
            <span>FundFlow</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
