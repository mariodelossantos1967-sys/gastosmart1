import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Globe, Loader2, User, Sparkles } from 'lucide-react';
import { chatWithAdvisor, searchFinancialWeb } from '../services/geminiService';
import { ChatMessage } from '../types';

export const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hola, soy tu asesor financiero personal. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre ahorro, inversión o buscar noticias financieras.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      isSearch: useSearch
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let responseText = '';
      let sources = undefined;

      if (useSearch) {
        // Use Gemini 2.5 Flash with Grounding
        const result = await searchFinancialWeb(userMsg.text);
        responseText = result.text;
        sources = result.sources;
      } else {
        // Use Gemini 3 Pro Preview
        responseText = await chatWithAdvisor(messages, userMsg.text);
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        sources: sources
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Lo siento, tuve un problema al procesar tu solicitud."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="p-4 bg-brand-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot size={24} />
          <h2 className="font-semibold text-lg">Asistente Financiero</h2>
        </div>
        <div className="flex items-center gap-2 bg-brand-700/50 p-1 rounded-lg">
          <button
            onClick={() => setUseSearch(false)}
            className={`px-3 py-1 rounded-md text-sm transition-all flex items-center gap-1 ${!useSearch ? 'bg-white text-brand-600 shadow-sm' : 'text-brand-100 hover:text-white'}`}
          >
            <Sparkles size={14} /> Asesor (Pro)
          </button>
          <button
            onClick={() => setUseSearch(true)}
            className={`px-3 py-1 rounded-md text-sm transition-all flex items-center gap-1 ${useSearch ? 'bg-white text-brand-600 shadow-sm' : 'text-brand-100 hover:text-white'}`}
          >
            <Globe size={14} /> Web (Flash)
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.text}
              </div>
              
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <Globe size={10} /> Fuentes encontradas:
                  </p>
                  <ul className="space-y-1">
                    {msg.sources.map((source, idx) => (
                      <li key={idx}>
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-brand-500 hover:underline truncate block"
                        >
                          {source.title || source.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-none p-4 shadow-sm border border-gray-200 flex items-center gap-2">
              <Loader2 className="animate-spin text-brand-500" size={18} />
              <span className="text-sm text-gray-500">Pensando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={useSearch ? "Busca noticias, precios o info..." : "Pregunta sobre tus finanzas..."}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="text-xs text-center mt-2 text-gray-400">
          {useSearch ? 'Usando Google Search & Gemini Flash' : 'Usando Gemini 3 Pro'}
        </div>
      </div>
    </div>
  );
};