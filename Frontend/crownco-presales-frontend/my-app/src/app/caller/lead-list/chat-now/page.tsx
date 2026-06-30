"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  PaperPlaneTilt,
  Paperclip,
  Camera,
  Smiley,
  Check,
  Checks,
} from "phosphor-react";

interface Message {
  id: string;
  text: string;
  isOutgoing: boolean;
  time: string;
  isRead?: boolean;
  file?: {
    name: string;
    type: string;
  };
}

interface DateDivider {
  id: string;
  date: string;
}

export default function ChatNowPage() {
  const router = useRouter();
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<(Message | DateDivider)[]>([
    {
      id: "divider-yesterday",
      date: "Yesterday",
    },
    {
      id: "msg-1",
      text: "Hey, I'm looking for a 2BHK flat in Andheri.",
      isOutgoing: false,
      time: "4:25 PM",
      isRead: true,
    },
    {
      id: "msg-2",
      text: "Hi! We have some great options. What's your budget?",
      isOutgoing: true,
      time: "4:27 PM",
      isRead: true,
    },
    {
      id: "msg-3",
      text: "Max 90 lakhs. Prefer something near metro.",
      isOutgoing: false,
      time: "4:30 PM",
      isRead: true,
    },
    {
      id: "msg-4",
      text: "Got it. I'll send a brochure shortly.",
      isOutgoing: true,
      time: "4:33 PM",
      isRead: true,
    },
    {
      id: "msg-5",
      text: "",
      isOutgoing: true,
      time: "4:33 PM",
      isRead: true,
      file: {
        name: "Brochure_PalmHeights.pdf",
        type: "pdf",
      },
    },
    {
      id: "divider-today",
      date: "Today",
    },
    {
      id: "msg-6",
      text: "Saw the brochure. I like the layout.",
      isOutgoing: false,
      time: "10:12 AM",
      isRead: true,
    },
    {
      id: "msg-7",
      text: "Glad to hear! Shall we schedule a site visit?",
      isOutgoing: true,
      time: "10:15 AM",
      isRead: true,
    },
    {
      id: "msg-8",
      text: "Yes, Saturday morning works for me.",
      isOutgoing: false,
      time: "10:18 AM",
      isRead: true,
    },
  ]);

  // Format time helper
  const formatTime = (date: Date = new Date()): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Format date divider
  const formatDateDivider = (date: Date = new Date()): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTo({
        top: messageAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Add date divider if needed
  const addDateDividerIfNeeded = () => {
    const today = formatDateDivider();
    const lastItem = messages[messages.length - 1];
    
    if (!("date" in lastItem) || lastItem.date !== today) {
      setMessages((prev) => [
        ...prev,
        {
          id: `divider-${Date.now()}`,
          date: today,
        },
      ]);
    }
  };

  // Send message
  const handleSendMessage = () => {
    const text = message.trim();
    if (!text) return;

    addDateDividerIfNeeded();

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      isOutgoing: true,
      time: formatTime(),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
    setTimeout(scrollToBottom, 100);
  };

  // Handle file attachment
  const handleFileAttachment = (file: File) => {
    if (!file) return;

    addDateDividerIfNeeded();

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text: "",
      isOutgoing: true,
      time: formatTime(),
      isRead: false,
      file: {
        name: file.name,
        type: file.type,
      },
    };

    setMessages((prev) => [...prev, newMessage]);
    setTimeout(scrollToBottom, 100);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileAttachment(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle image input change
  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileAttachment(file);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  // Handle file download
  const handleFileDownload = (fileName: string) => {
    console.log("Downloading file:", fileName);
    // Add your file download logic here
    alert(`Downloading: ${fileName}`);
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initialize scroll on mount
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 flex flex-col flex-1">
        {/* Chat Header */}
        <header className="flex items-center pb-3 sm:pb-4 lg:pb-5 mb-3 sm:mb-4 lg:mb-5 border-b border-[#e5e7eb] flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[var(--sidebar-border-color)] bg-white flex items-center justify-center hover:bg-[var(--sidebar-bg-hover)] hover:border-[var(--primary-base)] transition-all duration-200 shadow-sm hover:-translate-x-0.5 active:scale-95 text-[var(--sidebar-text-main)] flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={18} weight="regular" className="sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[var(--foreground)] tracking-tight">
              Chat
            </h1>
          </div>
        </header>

        {/* User Info Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 mb-3 sm:mb-4 lg:mb-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4 min-w-0 flex-1">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-[50px] md:h-[50px] rounded-full overflow-hidden border-2 border-[#e5e7eb] bg-[var(--surface-neutral)] flex-shrink-0">
                <Image
                  src="https://i.pravatar.cc/150?u=maaz"
                  alt="User Avatar"
                  width={50}
                  height={50}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect fill='%23f0f0f0' width='50' height='50'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial' font-size='18'%3ESM%3C/text%3E%3C/svg%3E`;
                  }}
                />
              </div>
              <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                <p className="text-sm sm:text-base md:text-lg font-semibold text-[var(--foreground)] leading-tight truncate">
                  Shaikh Maaz
                </p>
                <p className="text-xs sm:text-sm md:text-base text-[var(--sidebar-text-sub)] leading-tight truncate">
                  Crown Heights
                </p>
              </div>
            </div>
            <span className="px-2.5 sm:px-3 md:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wide whitespace-nowrap bg-red-500 text-white flex-shrink-0">
              Very Hot
            </span>
          </div>
        </div>

        {/* Message Area */}
        <div
          ref={messageAreaRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 md:px-4 py-3 sm:py-4 lg:py-5 flex flex-col gap-2 sm:gap-2.5 scroll-smooth chat-scrollbar min-h-0"
        >
        {messages.map((item) => {
          // Date Divider
          if ("date" in item) {
            return (
              <div
                key={item.id}
                className="text-center relative my-2 sm:my-3"
              >
                <div className="absolute left-0 right-0 top-1/2 h-px bg-[#e5e7eb]"></div>
                <span className="relative bg-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-medium text-[var(--sidebar-text-sub)] border border-[#e5e7eb]">
                  {item.date}
                </span>
              </div>
            );
          }

          // Message
          const msg = item as Message;
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-0.5 max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] xl:max-w-[65%] animate-[fadeInUp_0.3s_ease-out] ${
                msg.isOutgoing ? "self-end" : "self-start"
              }`}
            >
              {msg.file ? (
                // File Message
                <div
                  onClick={() => handleFileDownload(msg.file!.name)}
                  className="flex items-center gap-2 sm:gap-3 bg-[var(--sidebar-bg-hover)] border border-[#e5e7eb] px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[var(--surface-primary)] hover:border-[var(--primary-base)] hover:-translate-y-0.5 hover:shadow-md max-w-full"
                >
                  <span className="text-lg sm:text-xl flex-shrink-0">🔗</span>
                  <div className="text-xs sm:text-sm font-medium text-[var(--foreground)] flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {msg.file.name}
                  </div>
                  <span className="text-sm sm:text-base cursor-pointer p-1 rounded transition-colors hover:bg-black/5 flex-shrink-0">
                    📥
                  </span>
                </div>
              ) : (
                // Text Message
                <div
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm md:text-[0.9375rem] leading-relaxed break-words ${
                    msg.isOutgoing
                      ? "bg-[var(--primary-base)] text-white rounded-br-md shadow-sm"
                      : "bg-white text-[var(--foreground)] rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>
              )}

              {/* Message Info */}
              <div
                className={`flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--sidebar-text-muted)] px-1 mt-0.5 ${
                  msg.isOutgoing ? "justify-end" : "justify-start"
                }`}
              >
                {msg.isOutgoing ? (
                  <>
                    <span className="text-[var(--sidebar-text-muted)]">{msg.time}</span>
                    {msg.isRead ? (
                      <Checks
                        size={12}
                        weight="fill"
                        className="text-[var(--sidebar-text-muted)] sm:w-3.5 sm:h-3.5"
                      />
                    ) : (
                      <Check
                        size={12}
                        weight="regular"
                        className="text-[var(--sidebar-text-muted)] sm:w-3.5 sm:h-3.5"
                      />
                    )}
                  </>
                ) : (
                  <span className="text-[var(--sidebar-text-muted)]">{msg.time}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

        {/* Input Container */}
        <div className="pt-3 sm:pt-4 lg:pt-5 border-t border-[#e5e7eb] mt-2 sm:mt-3 lg:mt-4 flex-shrink-0">
          <div className="bg-white border border-[#e5e7eb] rounded-3xl flex items-center px-2 sm:px-3 py-1.5 sm:py-2 gap-1.5 sm:gap-2 transition-all duration-200 focus-within:border-[var(--primary-base)] focus-within:shadow-[0_0_0_3px_var(--primary-selected)]">
            <button
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--sidebar-text-sub)] hover:bg-black/5 hover:text-[var(--foreground)] transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
              aria-label="Emoji"
              title="Add emoji"
            >
              <Smiley size={18} weight="regular" className="sm:w-5 sm:h-5" />
            </button>

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none outline-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm md:text-[0.9375rem] text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] min-w-0"
              autoComplete="off"
              aria-label="Message input"
            />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/*,application/pdf,.doc,.docx"
            className="hidden"
          />
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageInputChange}
            accept="image/*"
            className="hidden"
          />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--sidebar-text-sub)] hover:bg-black/5 hover:text-[var(--foreground)] transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
              aria-label="Attach file"
              title="Attach file"
            >
              <Paperclip size={18} weight="regular" className="sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--sidebar-text-sub)] hover:bg-black/5 hover:text-[var(--foreground)] transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
              aria-label="Attach image"
              title="Attach image"
            >
              <Camera size={18} weight="regular" className="sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center border-none cursor-pointer transition-all duration-200 flex-shrink-0 shadow-[0_2px_4px_rgba(0,130,224,0.3)] hover:bg-[var(--primary-hover)] hover:scale-110 hover:shadow-[0_4px_8px_rgba(0,130,224,0.4)] active:scale-95 disabled:bg-[var(--sidebar-border-color)] disabled:cursor-not-allowed disabled:shadow-none"
              aria-label="Send message"
              title="Send message"
            >
              <PaperPlaneTilt size={16} weight="regular" className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
