import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface ChatPanelProps {
  messages: Array<{
    id: string;
    type: 'chat' | 'command' | 'system' | 'user_joined' | 'user_left' | 'video_changed' | 'video_state_changed';
    username: string;
    content: string;
    timestamp: number;
  }>;
  onSendMessage: (message: string) => void;
  members: string[];
  username: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  members,
  username
}) => {
  const [message, setMessage] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  // Create a unique list of members with you marker
  const uniqueMembers: string[] = [];
  members.forEach(m => {
    if (!uniqueMembers.includes(m)) {
      uniqueMembers.push(m);
    }
  });
  
  return (
    <div className="w-full md:w-1/4 flex flex-col bg-secondary border-l border-muted h-full">
      {/* Member List */}
      <div className="p-3 border-b border-muted">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">In This Room</h3>
          <span className="bg-accent/20 text-accent text-xs px-2 py-0.5 rounded-full">
            {uniqueMembers.length} {uniqueMembers.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <div className="mt-2 space-y-2">
          {uniqueMembers.map((member) => (
            <div key={member} className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm">
                {member} {member === username ? '(You)' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Command Help Button */}
      <div className="px-3 py-2 border-b border-muted">
        <button 
          className="text-xs flex items-center text-muted-foreground hover:text-accent transition"
          onClick={() => setShowCommands(!showCommands)}
        >
          <i className="fas fa-question-circle mr-1"></i>
          <span>Chat Commands</span>
        </button>
        
        {showCommands && (
          <div className="mt-2 text-xs bg-muted rounded p-3 space-y-2">
            <p className="font-medium text-accent">Available Commands:</p>
            <div className="grid grid-cols-2 gap-y-1">
              <div className="font-mono text-foreground">play</div>
              <div className="text-muted-foreground">Play video</div>
              
              <div className="font-mono text-foreground">pause</div>
              <div className="text-muted-foreground">Pause video</div>
              
              <div className="font-mono text-foreground">seek &lt;time&gt;</div>
              <div className="text-muted-foreground">Jump to timestamp</div>
              
              <div className="font-mono text-foreground">speed &lt;value&gt;</div>
              <div className="text-muted-foreground">Change speed</div>
              
              <div className="font-mono text-foreground">volume &lt;0-100&gt;</div>
              <div className="text-muted-foreground">Adjust volume</div>
              
              <div className="font-mono text-foreground">quality &lt;res&gt;</div>
              <div className="text-muted-foreground">Change quality</div>
              
              <div className="font-mono text-foreground">fullscreen</div>
              <div className="text-muted-foreground">Toggle fullscreen</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Chat Messages Area */}
      <ScrollArea className="flex-grow p-3 space-y-3 chat-scrollbar">
        <div className="space-y-3">
          {messages.map((msg) => {
            const time = format(new Date(msg.timestamp), 'HH:mm');
            
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center py-1">
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    msg.content.includes('quality') || 
                    msg.content.includes('playing') || 
                    msg.content.includes('paused') || 
                    msg.content.includes('jumped') || 
                    msg.content.includes('speed') || 
                    msg.content.includes('volume')
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {msg.content}
                  </span>
                </div>
              );
            }
            
            return (
              <div key={msg.id} className="flex flex-col">
                <div className="flex items-start space-x-2">
                  <div className="font-medium text-sm text-accent">
                    {msg.username} {msg.username === username ? '(You)' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">{time}</div>
                </div>
                <p className={`text-sm ${msg.type === 'command' ? 'font-mono text-primary' : ''}`}>
                  {msg.content}
                </p>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Chat Input */}
      <div className="p-3 border-t border-muted">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type a message or command..."
            className="flex-grow bg-muted border-muted focus:border-accent"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button type="submit" className="bg-accent hover:bg-blue-600 text-white px-3 py-2">
            <i className="fas fa-paper-plane"></i>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
