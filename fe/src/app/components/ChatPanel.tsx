import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

export interface Message {
  from: 'user' | 'bot';
  text: string;
  thoughts?: string[];
  isExpanded?: boolean;
}

interface ChatPanelProps {
  sessionId: string;
  filePath?: string;
  paperId?: string | null;
  selectedText?: string;
  onNotesSaved?: () => void;
}

export function ChatPanel({ sessionId, filePath, paperId, selectedText, onNotesSaved }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [savingConversation, setSavingConversation] = useState(false);
  const [includeSelection, setIncludeSelection] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { from: 'user', text: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);

    try {
      const payload: any = { message: input, session_id: sessionId };
      if (selectedText && includeSelection) payload.selection = selectedText;

      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let currentMessage: Message = {
        from: 'bot',
        text: '',
        thoughts: [],
        isExpanded: false,
      };
      let messageAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'thought') {
                // Add thought in real-time
                currentMessage.thoughts!.push(data.content);
                
                // If message not yet added, add it now
                if (!messageAdded) {
                  setMessages((m) => [...m, currentMessage]);
                  messageAdded = true;
                } else {
                  // Update the last message with new thought
                  setMessages((m) => {
                    const newMessages = [...m];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg.from === 'bot') {
                      lastMsg.thoughts = [...(lastMsg.thoughts || []), data.content];
                    }
                    return newMessages;
                  });
                }
              } else if (data.type === 'answer') {
                // Add final answer
                currentMessage.text = data.content;
                
                if (!messageAdded) {
                  setMessages((m) => [...m, currentMessage]);
                  messageAdded = true;
                } else {
                  // Update the last message with answer
                  setMessages((m) => {
                    const newMessages = [...m];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg.from === 'bot') {
                      lastMsg.text = data.content;
                    }
                    return newMessages;
                  });
                }
              } else if (data.type === 'error') {
                const errMsg: Message = { from: 'bot', text: `Error: ${data.content}` };
                setMessages((m) => [...m, errMsg]);
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (err) {
      const errMsg: Message = { from: 'bot', text: `Failed to send message: ${(err as Error).message}` };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const toggleThinkingExpanded = (index: number) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg, i) =>
        i === index ? { ...msg, isExpanded: !msg.isExpanded } : msg
      )
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const generateConversationSummary = () => {
    // Create a text representation of the conversation
    const conversationText = messages
      .map((msg) => {
        const role = msg.from === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.text}`;
      })
      .join('\n\n');
    
    return conversationText;
  };

  const saveConversationToNotes = async () => {
    if (!paperId || messages.length === 0) {
      alert('No conversation to save or paper not loaded');
      return;
    }

    setSavingConversation(true);
    try {
      const conversationSummary = generateConversationSummary();
      
      const res = await fetch(`${API_BASE}/papers/${paperId}/update-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_summary: conversationSummary }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to save conversation');
      }

      alert('Conversation summary saved to notes!');
      
      // Call the callback to refresh paper data in parent component
      if (onNotesSaved) {
        onNotesSaved();
      }
    } catch (err: any) {
      console.error('Error saving conversation:', err);
      alert(`Error saving conversation: ${err.message}`);
    } finally {
      setSavingConversation(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b"> 
        <h3 className="font-semibold">Chat</h3>
        <p className="text-xs text-gray-500">Ask questions about the opened PDF.</p>
      </div>
      {selectedText && (
        <div className="p-3 border-b bg-yellow-50 text-sm">
          <div className="mb-2">Selected text available:</div>
          <div className="mb-2 text-xs text-gray-700 break-words">{selectedText}</div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeSelection} onChange={(e)=>setIncludeSelection(e.target.checked)} />
            Include selection when asking
          </label>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
        {messages.map((m, i) => (
          <div key={i} className={`rounded-lg p-3 max-w-full ${m.from === 'user' ? 'text-right' : 'bg-gray-50'}`} style={m.from === 'user' ? { backgroundColor: '#f5e6f0' } : {}}>
            {m.from === 'user' ? (
              <div className="text-sm break-words">{m.text}</div>
            ) : (
              <div className="space-y-3">
                {/* Thinking Section (Collapsible) */}
                {m.thoughts && m.thoughts.length > 0 && (
                  <div className="bg-orange-50 rounded border border-orange-200">
                    <button
                      onClick={() => toggleThinkingExpanded(i)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-orange-100 transition-colors"
                    >
                      {m.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-orange-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-orange-600" />
                      )}
                      <span className="text-xs font-semibold text-orange-700">
                        🤔 Thinking ({m.thoughts.length} steps)
                      </span>
                    </button>
                    
                    {m.isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-orange-200">
                        {m.thoughts.map((thought, idx) => (
                          <div key={idx} className="text-xs text-orange-700 pl-2 py-1 border-l-2 border-orange-300">
                            {thought}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Final Answer */}
                <div className="text-sm break-words text-gray-700">
                  {m.text}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-gray-50">
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 px-3 py-2 rounded border"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a question..."
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending}
            className="px-4 py-2 text-white rounded disabled:opacity-60"
            style={{ backgroundColor: '#e0b4df' }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#c97fc5'; }}
            onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#e0b4df'; }}
          >
            {sending ? 'Processing...' : 'Send'}
          </button>
        </div>
        {paperId && messages.length > 0 && (
          <button
            onClick={saveConversationToNotes}
            disabled={savingConversation || sending}
            className="w-full px-3 py-2 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 disabled:opacity-60 transition-colors"
          >
            {savingConversation ? 'Saving...' : 'Save Conversation to Notes'}
          </button>
        )}
      </div>
    </div>
  );
}
