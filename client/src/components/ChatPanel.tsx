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
    <div className="w-full md:w-1/4 flex flex-col glass-panel rounded-r-lg shadow-lg border-l border-muted/30 h-full overflow-hidden">
      {/* Member List */}
      <div className="p-4 border-b border-muted/30 bg-gradient-to-r from-muted/40 to-transparent backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Room Members</h3>
          <span className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-full shadow-sm">
            {uniqueMembers.length} {uniqueMembers.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <div className="mt-3 space-y-1">
          {uniqueMembers.map((member, index) => (
            <div 
              key={member} 
              className="flex items-center space-x-2 py-1.5 px-3 rounded-lg transition-all duration-200 hover:bg-muted/30 animate-[fadeIn_0.3s_ease-out]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-2 h-2 rounded-full ${member === username ? 'bg-primary' : 'bg-green-500'} animate-pulse`}></div>
              <span className={`text-sm ${member === username ? 'font-semibold text-primary' : ''}`} 
                    style={{ color: member !== username ? `hsl(${member.length * 30}, 70%, 60%)` : undefined }}>
                {member} {member === username ? '(You)' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Command Help Button */}
      <div className="px-4 py-3 border-b border-muted/30 bg-muted/10">
        <button 
          className="text-xs flex items-center text-muted-foreground hover:text-accent transition-all btn-hover-effect"
          onClick={() => setShowCommands(!showCommands)}
        >
          <i className={`fas fa-${showCommands ? 'chevron-down' : 'question-circle'} mr-1.5`}></i>
          <span>{showCommands ? 'Hide commands' : 'Show commands'}</span>
        </button>
        
        {showCommands && (
          <div className="mt-2 text-xs bg-gradient-to-b from-muted/50 to-muted/30 rounded-lg p-3 space-y-2 animate-[fadeIn_0.2s_ease-out] shadow-inner">
            <p className="font-medium text-accent">Available Commands:</p>
            <div className="grid grid-cols-2 gap-y-1.5 mt-2">
              <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/play</div>
              <div className="text-muted-foreground">Play video</div>
              
              <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/pause</div>
              <div className="text-muted-foreground">Pause video</div>
              
              <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/seek &lt;time&gt;</div>
              <div className="text-muted-foreground">Jump to timestamp</div>
              
              <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/speed &lt;value&gt;</div>
              <div className="text-muted-foreground">Change speed</div>
              
              <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/volume &lt;0-100&gt;</div>
              <div className="text-muted-foreground">Adjust volume</div>
              
              <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/quality &lt;res&gt;</div>
              <div className="text-muted-foreground">Change quality</div>
              
              <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/fullscreen</div>
              <div className="text-muted-foreground">Toggle fullscreen</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Chat Messages Area */}
      <ScrollArea className="flex-grow px-4 py-3 chat-scrollbar">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground opacity-70">
              <i className="fas fa-comments text-2xl mb-2"></i>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const time = format(new Date(msg.timestamp), 'HH:mm');
              
              if (msg.type === 'system' || msg.type === 'user_joined' || msg.type === 'user_left' || msg.type === 'video_changed' || msg.type === 'video_state_changed') {
                // Determine which icon to use based on message type
                let icon = 'info-circle';
                let bgClass = 'bg-muted/60';
                let textClass = 'text-muted-foreground';
                
                if (msg.type === 'user_joined') {
                  icon = 'user-plus';
                  bgClass = 'bg-green-500/20';
                  textClass = 'text-green-500';
                } else if (msg.type === 'user_left') {
                  icon = 'user-minus';
                  bgClass = 'bg-primary/20';
                  textClass = 'text-primary';
                } else if (msg.type === 'video_changed') {
                  icon = 'video';
                  bgClass = 'bg-accent/20';
                  textClass = 'text-accent';
                } else if (msg.type === 'video_state_changed' || 
                           msg.content.includes('quality') || 
                           msg.content.includes('playing') || 
                           msg.content.includes('paused') || 
                           msg.content.includes('jumped') || 
                           msg.content.includes('speed') || 
                           msg.content.includes('volume')) {
                  icon = 'sliders-h';
                  bgClass = 'bg-primary/20';
                  textClass = 'text-primary';
                }
                
                return (
                  <div key={msg.id} className="message-system py-1">
                    <span className={`text-xs px-3 py-1.5 rounded-full ${bgClass} ${textClass} flex items-center justify-center w-fit mx-auto space-x-1.5`}>
                      <i className={`fas fa-${icon} text-xs opacity-70`}></i>
                      <span>{msg.content}</span>
                    </span>
                  </div>
                );
              }
              
              const isOwn = msg.username === username;
              
              return (
                <div key={msg.id} className="flex flex-col">
                  <div className={`flex items-start ${isOwn ? 'justify-end' : 'justify-start'} space-x-2`}>
                    {!isOwn && (
                      <div className="font-medium text-sm" style={{ color: `hsl(${msg.username.length * 30}, 70%, 60%)` }}>
                        {msg.username}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">{time}</div>
                  </div>
                  <div className={`message-bubble ${isOwn ? 'own' : 'other'} ${msg.type === 'command' ? 'font-mono text-xs' : ''}`}>
                    {msg.type === 'command' ? <span className="opacity-70">/{msg.content}</span> : msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Chat Input */}
      <div className="p-4 border-t border-muted/30 bg-gradient-to-r from-muted/30 to-transparent">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Type a message or command..."
              className="message-input pr-10"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {message.startsWith('/') && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <span className="text-xs text-accent">Command</span>
              </div>
            )}
          </div>
          <Button type="submit" className="send-button" disabled={!message.trim()}>
            <i className="fas fa-paper-plane"></i>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
