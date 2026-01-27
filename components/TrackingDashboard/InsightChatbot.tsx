
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Maximize2, Minimize2 } from 'lucide-react';
import { getChatResponse } from '../../services/geminiService';
import { ChatMessage } from '../../types/trackingTypes';

interface InsightChatbotProps {
  contextData: any[]; // The data from selected cards
  onClose: () => void;
}

const InsightChatbot: React.FC<InsightChatbotProps> = ({ contextData, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with context
  useEffect(() => {
    const initChat = async () => {
      // Show initial loading state for the "welcome analysis"
      setLoading(true);

      // We trigger an immediate analysis without the user having to type
      const hiddenPrompt = `
        Context Data Provided: ${JSON.stringify(contextData).substring(0, 30000)}
        
        Action: Please analyze the provided financial data (PE, Holdings, Deals, etc.) and provide a comprehensive summary.
        - Format the output nicely with bold headers and bullet points.
        - Highlight risks and opportunities.
        - If the data is raw HTML or unreadable, try to extract numbers and sentiments.
      `;

      try {
        // Send as a "user" message in history but don't show it in UI
        const history = [
             {
                 role: 'user',
                 parts: [{ text: hiddenPrompt }]
             }
        ];
        
        // This is a "fake" history for the API to process the first turn
        const response = await getChatResponse([], hiddenPrompt);

        setMessages([
            {
                id: 'welcome-analysis',
                role: 'model',
                text: response || "I've loaded the data but couldn't generate a summary. Ask me anything!",
                timestamp: Date.now()
            }
        ]);
      } catch (e) {
         setMessages([{
             id: 'error',
             role: 'model',
             text: "I encountered an error analyzing the initial data. Please try asking a specific question.",
             timestamp: Date.now()
         }]);
      } finally {
        setLoading(false);
      }
    };

    if (contextData.length > 0) {
        initChat();
    }
  }, [contextData]); // Re-run if context changes (new card selection)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history. Note: We include the initial context context implicitly via system instruction or first message
      const history = [
        {
            role: 'user',
            parts: [{ text: `Here is the data context you must strictly stick to: ${JSON.stringify(contextData).substring(0, 30000)}` }]
        },
        {
            role: 'model',
            parts: [{ text: "Understood. I will answer based strictly on the provided financial context." }]
        },
        ...messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }))
      ];

      const response = await getChatResponse(history, userMsg.text);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response || "I couldn't generate a response.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Simple formatter to handle bolding **text**
  const renderText = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          return part;
      });
  };

  return (
    <div className={`fixed bottom-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 z-50 ${isExpanded ? 'w-[800px] h-[80vh]' : 'w-[400px] h-[600px]'}`}>
      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white rounded-t-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-semibold">Deep Dive Assistant</span>
          <span className="bg-indigo-500 px-2 py-0.5 rounded text-xs text-indigo-100">{contextData.length} Items</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsExpanded(!isExpanded)} className="hover:bg-indigo-500 p-1 rounded">
             {isExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
          </button>
          <button onClick={onClose} className="hover:bg-indigo-500 p-1 rounded">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            }`}>
              {renderText(msg.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Ask follow up questions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightChatbot;
