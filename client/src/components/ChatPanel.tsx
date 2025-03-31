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
  
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'commands'>('chat');
  
  return (
    <div className="chat-container-inner h-full w-full flex flex-col glass-panel rounded-lg shadow-lg border border-muted/30 overflow-hidden">
      {/* Chat Tabs */}
      <div className="flex border-b border-muted/30 bg-muted/20">
        <button 
          className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all duration-200 ${
            activeTab === 'chat' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          <i className="fas fa-comment-alt mr-2"></i> Chat
        </button>
        <button 
          className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all duration-200 ${
            activeTab === 'members' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('members')}
        >
          <i className="fas fa-users mr-2"></i> Members <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">{uniqueMembers.length}</span>
        </button>
        <button 
          className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all duration-200 ${
            activeTab === 'commands' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('commands')}
        >
          <i className="fas fa-terminal mr-2"></i> Commands
        </button>
      </div>
      
      {/* Content Area */}
      <div className="flex-grow overflow-hidden relative">
        {/* Member List Panel */}
        <div className={`absolute inset-0 transition-all duration-300 transform ${
          activeTab === 'members' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}>
          <ScrollArea className="h-full chat-scrollbar p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Room Members</h3>
                <span className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-full shadow-sm">
                  {uniqueMembers.length} {uniqueMembers.length === 1 ? 'person' : 'people'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {uniqueMembers.map((member, index) => (
                  <div 
                    key={member} 
                    className="flex items-center space-x-3 p-3 rounded-lg glass-panel transition-all duration-200 hover:bg-muted/30 animate-[fadeIn_0.3s_ease-out]"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/30 relative overflow-hidden">
                      <span className="text-lg" style={{ color: `hsl(${member.length * 30}, 70%, 60%)` }}>
                        {member.charAt(0).toUpperCase()}
                      </span>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5">
                        <div className={`w-2 h-2 absolute bottom-0 right-0 rounded-full ${
                          member === username ? 'bg-primary' : 'bg-green-500'
                        } animate-pulse`}></div>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm ${member === username ? 'font-semibold text-primary' : ''}`} 
                            style={{ color: member !== username ? `hsl(${member.length * 30}, 70%, 60%)` : undefined }}>
                        {member}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {member === username ? 'You (current user)' : 'Online'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
        
        {/* Commands Panel */}
        <div className={`absolute inset-0 transition-all duration-300 transform ${
          activeTab === 'commands' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
        }`}>
          <ScrollArea className="h-full chat-scrollbar p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  Available Commands
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="glass-panel rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2 text-accent">Playback Control</h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/play</div>
                      <div className="col-span-2 text-muted-foreground text-xs">Resume video playback</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/pause</div>
                      <div className="col-span-2 text-muted-foreground text-xs">Pause video playback</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/seek 1:30</div>
                      <div className="col-span-2 text-muted-foreground text-xs">Jump to specified timestamp (minutes:seconds)</div>
                    </div>
                  </div>
                </div>
                
                <div className="glass-panel rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2 text-accent">Video Settings</h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/speed 1.5</div>
                      <div className="col-span-2 text-muted-foreground text-xs">Change playback speed (0.25-2)</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/volume 75</div>
                      <div className="col-span-2 text-muted-foreground text-xs">Set volume level (0-100)</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/quality hd720</div>
                      <div className="col-span-2 text-muted-foreground text-xs">Change video quality (small, medium, large, hd720, hd1080)</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="font-mono text-foreground bg-muted/40 rounded-md px-2 py-1 text-xs">/fullscreen</div>
                      <div className="col-span-2 text-muted-foreground text-xs">Toggle fullscreen mode</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    Tip: You can also paste any YouTube URL directly in the chat to load it
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
        
        {/* Chat Messages Panel */}
        <div className={`absolute inset-0 transition-all duration-300 transform ${
          activeTab === 'chat' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}>
          <ScrollArea className="h-full px-4 py-3 chat-scrollbar pb-16">
            <div className="space-y-4 pb-16">
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
                      <div className={`flex items-center ${isOwn ? 'justify-end' : 'justify-start'} space-x-2`}>
                        {!isOwn && (
                          <div className="flex items-center space-x-1.5">
                            <span className="inline-block w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: `hsl(${msg.username.length * 30}, 70%, 60%)` }}></span>
                            <div className="font-medium text-xs" 
                                style={{ color: `hsl(${msg.username.length * 30}, 70%, 60%)` }}>
                              {msg.username}
                            </div>
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
        </div>
      </div>
      
      {/* Chat Input - Fixed at bottom */}
      <div className="chat-input-sticky p-4 border-t border-muted/30 bg-card/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder={activeTab === 'commands' ? "Try a command..." : "Type a message or command..."}
              className="message-input pr-10 w-full"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoComplete="off"
            />
            {message.startsWith('/') && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Command</span>
              </div>
            )}
          </div>
          <Button type="submit" className="send-button aspect-square w-10 h-10" disabled={!message.trim()}>
            <i className="fas fa-paper-plane"></i>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
